import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  throw new Error("Missing required env vars for API server.");
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// ---------------------------------------------------------------------------
// CORS — set API_ALLOWED_ORIGIN in production to restrict to your domain
// ---------------------------------------------------------------------------
const ALLOWED_ORIGIN = process.env.API_ALLOWED_ORIGIN ?? "*";
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
  next();
});
app.options("*", (_req, res) => {
  res.sendStatus(204);
});

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Request body schemas
// ---------------------------------------------------------------------------

const ExecuteBodySchema = z.object({
  instruction: z.string().min(1).max(2000),
  context: z.record(z.unknown()).optional().default({})
});

// ---------------------------------------------------------------------------
// Claude response schema (discriminated union for type-safe execution)
// ---------------------------------------------------------------------------

const OpSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("query") }),
  z.object({
    type: z.literal("create_note"),
    title: z.string().optional(),
    content: z.string().optional(),
    folder_id: z.string().optional()
  }),
  z.object({
    type: z.literal("update_note"),
    note_id: z.string(),
    title: z.string().optional(),
    content: z.string().optional(),
    folder_id: z.string().nullable().optional()
  }),
  z.object({ type: z.literal("delete_note"), note_id: z.string() }),
  z.object({ type: z.literal("create_folder"), name: z.string() }),
  z.object({ type: z.literal("create_tag"), name: z.string() }),
  z.object({ type: z.literal("add_tag_to_note"), note_id: z.string(), tag_id: z.string() })
]);

const PayloadSchema = z.object({
  summary: z.string(),
  ops: z.array(OpSchema)
});

// ---------------------------------------------------------------------------
// Anthropic tool definition — forces structured JSON output, eliminates
// text-mode JSON parsing and markdown code-fence stripping entirely.
// ---------------------------------------------------------------------------

const NOTES_TOOL: Anthropic.Tool = {
  name: "execute_ops",
  description:
    "Execute operations on the user's notes, folders, and tags. Always call this tool — use the 'query' op type when no writes are needed.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description: "Plain-text summary of what was done or found"
      },
      ops: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["query", "create_note", "update_note", "delete_note", "create_folder", "create_tag", "add_tag_to_note"]
            },
            note_id: { type: "string", description: "Note UUID — required for update_note, delete_note, add_tag_to_note" },
            title: { type: "string" },
            content: { type: "string", description: "Markdown note content" },
            folder_id: { type: "string", description: "Folder UUID or null" },
            name: { type: "string", description: "Name for create_folder or create_tag" },
            tag_id: { type: "string", description: "Tag UUID — required for add_tag_to_note" }
          },
          required: ["type"]
        }
      }
    },
    required: ["summary", "ops"]
  }
};

// ---------------------------------------------------------------------------
// In-memory rate limiter: 20 AI requests per user per minute
// ---------------------------------------------------------------------------

const rateMap = new Map<string, number[]>();
const AI_RATE_LIMIT = 20;
const AI_RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateMap.get(userId) ?? []).filter((t) => now - t < AI_RATE_WINDOW_MS);
  if (timestamps.length >= AI_RATE_LIMIT) return false;
  timestamps.push(now);
  rateMap.set(userId, timestamps);
  return true;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

type AuthUser = { id: string; email: string | null };

async function getUserFromBearer(authHeader?: string): Promise<AuthUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

// ---------------------------------------------------------------------------
// API key cache: avoids a DB round-trip on every external request.
// Entries expire after 5 minutes; the cache is fully cleared on any revocation.
// ---------------------------------------------------------------------------

type CachedKey = { user: AuthUser; expiresAt: number };
const apiKeyCache = new Map<string, CachedKey>();
const API_KEY_CACHE_TTL_MS = 5 * 60 * 1000;

async function getUserFromApiKey(apiKey?: string): Promise<AuthUser | null> {
  if (!apiKey) return null;
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const cached = apiKeyCache.get(hash);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !data?.user_id) return null;
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash);
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
  if (!userData.user) return null;
  const user: AuthUser = { id: userData.user.id, email: userData.user.email ?? null };
  apiKeyCache.set(hash, { user, expiresAt: Date.now() + API_KEY_CACHE_TTL_MS });
  return user;
}

// ---------------------------------------------------------------------------
// Core AI execution
// ---------------------------------------------------------------------------

/**
 * Scans accumulated partial tool-input JSON for the "summary" field value.
 * Returns however many characters of the value have streamed in so far.
 * Called on every inputJson delta to detect newly arrived summary characters.
 */
function extractSummaryFromPartialJson(json: string): string {
  const prefix = '"summary":"';
  const start = json.indexOf(prefix);
  if (start === -1) return "";
  const valueStart = start + prefix.length;
  let result = "";
  let escaped = false;
  for (let i = valueStart; i < json.length; i++) {
    if (escaped) {
      result += json[i];
      escaped = false;
    } else if (json[i] === "\\") {
      escaped = true;
    } else if (json[i] === '"') {
      break;
    } else {
      result += json[i];
    }
  }
  return result;
}

async function fetchUserData(userId: string) {
  return Promise.all([
    supabaseAdmin
      .from("notes")
      .select("id, title, content, folder_id, updated_at, created_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabaseAdmin.from("folders").select("id, name").eq("user_id", userId),
    supabaseAdmin.from("tags").select("id, name").eq("user_id", userId)
  ]);
}

async function executeOps(userId: string, ops: z.infer<typeof OpSchema>[]) {
  const now = new Date().toISOString();
  for (const op of ops) {
    if (op.type === "create_note") {
      await supabaseAdmin.from("notes").insert({
        user_id: userId,
        title: op.title ?? "Untitled",
        content: op.content ?? "",
        folder_id: op.folder_id ?? null,
        updated_at: now
      });
    } else if (op.type === "update_note") {
      await supabaseAdmin
        .from("notes")
        .update({ title: op.title, content: op.content, folder_id: op.folder_id ?? null, updated_at: now })
        .eq("id", op.note_id)
        .eq("user_id", userId);
    } else if (op.type === "delete_note") {
      await supabaseAdmin.from("notes").delete().eq("id", op.note_id).eq("user_id", userId);
    } else if (op.type === "create_folder") {
      await supabaseAdmin.from("folders").insert({ user_id: userId, name: op.name });
    } else if (op.type === "create_tag") {
      await supabaseAdmin.from("tags").insert({ user_id: userId, name: op.name });
    } else if (op.type === "add_tag_to_note") {
      await supabaseAdmin.from("note_tags").upsert({ note_id: op.note_id, tag_id: op.tag_id });
    }
    // "query" ops require no writes
  }
}

async function runClaudeAction(userId: string, instruction: string, context: unknown) {
  const [{ data: notes }, { data: folders }, { data: tags }] = await fetchUserData(userId);

  const system =
    "You are an assistant for a personal notes app. Use the execute_ops tool to act on the user's notes, folders, and tags. Always call the tool — use the 'query' op when no writes are needed.";

  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    tools: [NOTES_TOOL],
    tool_choice: { type: "tool", name: "execute_ops" },
    messages: [{ role: "user", content: JSON.stringify({ instruction, context, notes, folders, tags }, null, 2) }]
  });

  const toolUse = completion.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { summary: "No action taken", ops: [] };
  }

  const parseResult = PayloadSchema.safeParse(toolUse.input);
  if (!parseResult.success) {
    throw new Error(`AI returned an invalid response shape: ${parseResult.error.message}`);
  }

  const payload = parseResult.data;
  await executeOps(userId, payload.ops);
  return payload;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.post("/v1/keys", async (req, res) => {
  const user = await getUserFromBearer(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const apiKey = `ntk_${crypto.randomBytes(24).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .insert({ user_id: user.id, key_hash: hash })
    .select("id")
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ apiKey, id: data.id });
});

app.get("/v1/keys", async (req, res) => {
  const user = await getUserFromBearer(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, created_at, last_used_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ keys: data ?? [] });
});

app.delete("/v1/keys/:id", async (req, res) => {
  const user = await getUserFromBearer(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { error } = await supabaseAdmin
    .from("api_keys")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", user.id); // ownership check
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  // Clear the entire cache — we don't track hash→id, so this is the safest approach.
  // Revocations are rare; one extra DB hit per external caller on next request is acceptable.
  apiKeyCache.clear();
  res.json({ ok: true });
});

app.post("/v1/ai/execute", async (req, res) => {
  try {
    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const bodyResult = ExecuteBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: bodyResult.error.message });
      return;
    }
    if (!checkRateLimit(user.id)) {
      res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
      return;
    }
    const { instruction, context } = bodyResult.data;
    const payload = await runClaudeAction(user.id, instruction, context);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Execution failed" });
  }
});

app.post("/v1/external/execute", async (req, res) => {
  try {
    const user = await getUserFromApiKey(req.headers["x-api-key"] as string | undefined);
    if (!user) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }
    const bodyResult = ExecuteBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: bodyResult.error.message });
      return;
    }
    if (!checkRateLimit(user.id)) {
      res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
      return;
    }
    const { instruction, context } = bodyResult.data;
    const payload = await runClaudeAction(user.id, instruction, context);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Execution failed" });
  }
});

// ---------------------------------------------------------------------------
// Streaming endpoint — SSE; emits summary_delta events as Claude responds,
// then executes ops and emits a final "done" event.
// Native clients (which lack reliable ReadableStream support) use the
// non-streaming /v1/ai/execute endpoint instead.
// ---------------------------------------------------------------------------

app.post("/v1/ai/stream", async (req, res) => {
  try {
    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const bodyResult = ExecuteBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: bodyResult.error.message });
      return;
    }
    if (!checkRateLimit(user.id)) {
      res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const { instruction, context } = bodyResult.data;
    const [{ data: notes }, { data: folders }, { data: tags }] = await fetchUserData(user.id);

    const system =
      "You are an assistant for a personal notes app. Use the execute_ops tool to act on the user's notes, folders, and tags. Always call the tool — use the 'query' op when no writes are needed.";

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      tools: [NOTES_TOOL],
      tool_choice: { type: "tool", name: "execute_ops" },
      messages: [{ role: "user", content: JSON.stringify({ instruction, context, notes, folders, tags }, null, 2) }]
    });

    // Abort the Anthropic stream if the client disconnects before completion.
    req.on("close", () => stream.abort());

    let lastSummaryLength = 0;
    stream.on("inputJson", (_partial: string, snapshot: string) => {
      const current = extractSummaryFromPartialJson(snapshot);
      if (current.length > lastSummaryLength) {
        const newChars = current.slice(lastSummaryLength);
        lastSummaryLength = current.length;
        res.write(`data: ${JSON.stringify({ type: "summary_delta", text: newChars })}\n\n`);
      }
    });

    const finalMessage = await stream.finalMessage();
    const toolUse = finalMessage.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      res.write(`data: ${JSON.stringify({ type: "done", summary: "No action taken", ops: [] })}\n\n`);
      res.end();
      return;
    }

    const parseResult = PayloadSchema.safeParse(toolUse.input);
    if (!parseResult.success) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: `AI returned an invalid response shape: ${parseResult.error.message}` })}\n\n`
      );
      res.end();
      return;
    }

    const payload = parseResult.data;
    await executeOps(user.id, payload.ops);
    res.write(`data: ${JSON.stringify({ type: "done", summary: payload.summary, ops: payload.ops })}\n\n`);
    res.end();
  } catch (error) {
    try {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Execution failed" })}\n\n`
      );
      res.end();
    } catch {
      // Response already closed; nothing to do.
    }
  }
});

app.listen(8787, () => {
  // eslint-disable-next-line no-console
  console.log("API server listening on http://localhost:8787");
});
