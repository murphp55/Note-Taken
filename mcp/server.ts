/**
 * NoteTaken MCP Server
 *
 * Exposes NoteTaken notes, folders, and tags as MCP tools so any MCP-compatible
 * LLM client (Claude Code, Claude Desktop, etc.) can read and write notes directly.
 *
 * Required env vars:
 *   NOTETAKEN_API_URL  — base URL of the running API server, e.g. http://localhost:8787
 *   NOTETAKEN_API_KEY  — personal API key generated from the NoteTaken settings screen
 *
 * Run:  npx tsx mcp/server.ts
 * Register in Claude Code:  claude mcp add notetaken -- npx tsx mcp/server.ts
 */

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = process.env.NOTETAKEN_API_URL ?? "http://localhost:8787";
const API_KEY = process.env.NOTETAKEN_API_KEY ?? "";

if (!API_KEY) {
  process.stderr.write(
    "NOTETAKEN_API_KEY is not set. Generate one in the NoteTaken app (Settings → API Keys).\n"
  );
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (res.status === 204) return { ok: true };

  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: Tool[] = [
  {
    name: "list_notes",
    description: "List notes. Optionally filter by search text, folder, or tag. Supports pagination.",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Full-text search across title and content" },
        folder_id: { type: "string", description: "Filter by folder UUID" },
        tag_id: { type: "string", description: "Filter by tag UUID" },
        limit: { type: "number", description: "Max results (default 50, max 200)" },
        cursor: { type: "string", description: "Pagination cursor (updated_at of last result)" }
      }
    }
  },
  {
    name: "get_note",
    description: "Get the full content of a single note by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Note UUID" }
      },
      required: ["id"]
    }
  },
  {
    name: "create_note",
    description: "Create a new note.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string", description: "Note body (plain text or markdown)" },
        folder_id: { type: "string", description: "Folder UUID to place the note in" }
      }
    }
  },
  {
    name: "update_note",
    description: "Update an existing note's title, content, or folder.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Note UUID" },
        title: { type: "string" },
        content: { type: "string" },
        folder_id: { type: ["string", "null"], description: "Set to null to remove from folder" }
      },
      required: ["id"]
    }
  },
  {
    name: "delete_note",
    description: "Permanently delete a note.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Note UUID" }
      },
      required: ["id"]
    }
  },
  {
    name: "search_notes",
    description: "Search notes by text across title and content. Convenience wrapper around list_notes.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number" }
      },
      required: ["query"]
    }
  },
  {
    name: "list_folders",
    description: "List all folders.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "create_folder",
    description: "Create a new folder.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        parent_id: { type: "string", description: "Parent folder UUID for nesting" }
      },
      required: ["name"]
    }
  },
  {
    name: "list_tags",
    description: "List all tags.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "create_tag",
    description: "Create a new tag.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }
      },
      required: ["name"]
    }
  },
  {
    name: "add_tag_to_note",
    description: "Attach a tag to a note.",
    inputSchema: {
      type: "object",
      properties: {
        note_id: { type: "string", description: "Note UUID" },
        tag_id: { type: "string", description: "Tag UUID" }
      },
      required: ["note_id", "tag_id"]
    }
  }
];

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "notetaken", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "list_notes": {
        const params = new URLSearchParams();
        if (args.search) params.set("search", String(args.search));
        if (args.folder_id) params.set("folder_id", String(args.folder_id));
        if (args.tag_id) params.set("tag_id", String(args.tag_id));
        if (args.limit) params.set("limit", String(args.limit));
        if (args.cursor) params.set("cursor", String(args.cursor));
        result = await apiRequest("GET", `/v1/notes?${params}`);
        break;
      }

      case "get_note":
        result = await apiRequest("GET", `/v1/notes/${args.id}`);
        break;

      case "create_note":
        result = await apiRequest("POST", "/v1/notes", {
          title: args.title,
          content: args.content,
          folder_id: args.folder_id ?? null
        });
        break;

      case "update_note": {
        const patch: Record<string, unknown> = {};
        if (args.title !== undefined) patch.title = args.title;
        if (args.content !== undefined) patch.content = args.content;
        if (args.folder_id !== undefined) patch.folder_id = args.folder_id;
        result = await apiRequest("PATCH", `/v1/notes/${args.id}`, patch);
        break;
      }

      case "delete_note":
        result = await apiRequest("DELETE", `/v1/notes/${args.id}`);
        break;

      case "search_notes": {
        const params = new URLSearchParams({ search: String(args.query) });
        if (args.limit) params.set("limit", String(args.limit));
        result = await apiRequest("GET", `/v1/notes?${params}`);
        break;
      }

      case "list_folders":
        result = await apiRequest("GET", "/v1/folders");
        break;

      case "create_folder":
        result = await apiRequest("POST", "/v1/folders", {
          name: args.name,
          parent_id: args.parent_id ?? null
        });
        break;

      case "list_tags":
        result = await apiRequest("GET", "/v1/tags");
        break;

      case "create_tag":
        result = await apiRequest("POST", "/v1/tags", { name: args.name });
        break;

      case "add_tag_to_note":
        result = await apiRequest("POST", `/v1/notes/${args.note_id}/tags/${args.tag_id}`);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
