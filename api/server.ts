import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

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

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

type AuthUser = { id: string; email: string | null };

async function getUserFromBearer(authHeader?: string): Promise<AuthUser | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return { id: data.user.id, email: data.user.email ?? null };
}

async function getUserFromApiKey(apiKey?: string): Promise<AuthUser | null> {
  if (!apiKey) return null;
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !data?.user_id) return null;
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash);
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
  if (!userData.user) return null;
  return { id: userData.user.id, email: userData.user.email ?? null };
}

async function runClaudeAction(userId: string, instruction: string, context: unknown) {
  const { data: notes } = await supabaseAdmin
    .from("notes")
    .select("id, title, content, folder_id, updated_at, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  const system = [
    "You are an assistant for a personal notes app.",
    "Return only JSON in this shape:",
    '{"summary":"string","ops":[{"type":"create_note"|"update_note"|"query","note_id":"uuid|optional","title":"optional","content":"optional","folder_id":"optional"}]}',
    "Use query op when no write should happen.",
    "Use markdown for generated note content."
  ].join("\n");

  const userPrompt = JSON.stringify({ instruction, context, notes }, null, 2);
  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: userPrompt }]
  });

  const text = completion.content.find((c) => c.type === "text");
  const raw = text?.text ?? "";
  const jsonText = raw.includes("```")
    ? raw.replace(/```json/g, "").replace(/```/g, "").trim()
    : raw;
  const payload = jsonText ? JSON.parse(jsonText) : { summary: "No response", ops: [] };
  const now = new Date().toISOString();

  for (const op of payload.ops ?? []) {
    if (op.type === "create_note") {
      await supabaseAdmin.from("notes").insert({
        user_id: userId,
        title: op.title ?? "Untitled",
        content: op.content ?? "",
        folder_id: op.folder_id ?? null,
        updated_at: now
      });
    }
    if (op.type === "update_note" && op.note_id) {
      await supabaseAdmin
        .from("notes")
        .update({
          title: op.title,
          content: op.content,
          folder_id: op.folder_id ?? null,
          updated_at: now
        })
        .eq("id", op.note_id)
        .eq("user_id", userId);
    }
  }

  return payload;
}

app.post("/v1/keys", async (req, res) => {
  const user = await getUserFromBearer(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const apiKey = `ntk_${crypto.randomBytes(24).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const { error } = await supabaseAdmin.from("api_keys").insert({ user_id: user.id, key_hash: hash });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ apiKey });
});

app.post("/v1/ai/execute", async (req, res) => {
  try {
    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const instruction = String(req.body?.instruction ?? "");
    const context = req.body?.context ?? {};
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
    const instruction = String(req.body?.instruction ?? "");
    const context = req.body?.context ?? {};
    const payload = await runClaudeAction(user.id, instruction, context);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Execution failed" });
  }
});

app.listen(8787, () => {
  // eslint-disable-next-line no-console
  console.log("API server listening on http://localhost:8787");
});
