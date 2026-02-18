# AppName

AppName is a cross-platform personal notes and knowledge management application built with React Native and Expo.  
It is designed to work on iOS, Android, web/desktop, and keep user data synchronized in real time across devices.

## Core Functionality

- Create, edit, organize, and delete notes
- Rich note fields: title, content, created date, updated date, folder, tags
- Rich text editing support (native via 10tap editor) with formatting tools
- Folder organization with nested folder support
- Tagging system with tag-based filtering
- Instant full-text search across note titles and content

## Sync and Offline

- Backend storage in Supabase (PostgreSQL)
- Realtime sync using Supabase realtime subscriptions
- Local offline cache using MMKV for fast load/switch and offline editing
- Automatic background sync when connectivity is restored
- Conflict resolution using last-write-wins based on `updated_at`

## Authentication and Security

- Supabase Auth with email/password login
- Google OAuth login flow
- Per-user data isolation via Supabase Row-Level Security (RLS)
- Persistent sessions across app restarts

## AI Integration

- Persistent in-app AI prompt bar available globally
- Natural-language commands can create, edit, query, and summarize notes
- Claude integration via Anthropic API (`claude-sonnet-4-6`) through the app API layer
- External REST API support for remote Claude usage with user-generated personal API keys

## Tech Stack

- Expo SDK 51+, Expo Router, TypeScript
- React Native + Expo Web
- Supabase (Auth, PostgreSQL, Realtime)
- MMKV for local caching
- Anthropic Claude API for AI actions
- Optional desktop wrapper via Electron

---

## Setup Checklist (required before the app runs)

These are not code tasks — they are external configuration steps. Nothing runs without them.

### 1. Create `.env` from `.env.example`

Copy `.env.example` to `.env` and fill in every value:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # API server only
ANTHROPIC_API_KEY=...
APP_API_BASE_URL=http://localhost:8787
GOOGLE_WEB_CLIENT_ID=...        # Google OAuth only; can leave blank to use email/password only
```

### 2. Convert `app.json` to `app.config.js`

`src/lib/env.ts` reads config from `expo-constants`, which is populated via the `extra` block in
Expo config. The current static `app.json` has no `extra` block, so `ENV.SUPABASE_URL` is always
`undefined` and the app crashes on startup with "Missing required env var".

Rename `app.json` to `app.config.js` and add:

```js
import "dotenv/config";
export default {
  expo: {
    // ...paste the current contents of app.json's top-level object here...
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      apiBaseUrl: process.env.APP_API_BASE_URL ?? "http://localhost:8787",
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? "",
    }
  }
};
```

### 3. Apply the database migration

A complete schema is at `supabase/migrations/20260218_init.sql`. Run it once against your Supabase
project. Either paste it into the Supabase dashboard SQL editor, or use the Supabase CLI:

```
supabase link --project-ref <your-project-ref>
supabase db push
```

The migration creates: `notes`, `folders`, `tags`, `note_tags`, `api_keys` tables; RLS policies;
realtime publications; and indexes.

### 4. Google OAuth (optional — email/password login works without this)

1. Create a Google Cloud project and OAuth 2.0 credentials (Web application type)
2. Add your redirect URIs (e.g. `http://localhost:19006/` for dev)
3. Enable Google as an Auth provider in the Supabase dashboard (Auth → Providers → Google), paste
   the Client ID and Client Secret
4. Copy the Client ID to `GOOGLE_WEB_CLIENT_ID` in `.env`

### 5. Replace placeholder identifiers before any device or store deployment

The following are scaffolding placeholders and must be updated before running on a real device,
submitting to the App Store / Play Store, or publishing the Electron app:

| File | Field | Current placeholder |
|------|-------|---------------------|
| `app.json` | `name` | `AppName` |
| `app.json` | `slug` | `appname-notes` |
| `app.json` | `scheme` | `appname` |
| `app.json` | `ios.bundleIdentifier` | `com.appname.notes` |
| `app.json` | `android.package` | `com.appname.notes` |
| `app/(auth)/login.tsx:31` | login screen title | `AppName` |
| `src/lib/storage.ts:4` | MMKV storage ID | `"appname-notes"` |
| `AGENTS.md` heading | document title | `AppName` |

None of these block local web dev (`expo start --web`), but they are required before any release.

---

## Path Forward

Development is organized into five phases that build on each other. Each phase should be broadly stable before moving to the next.

- **Phase 1 — Core Feature Completeness**: Close the gaps in basic CRUD so the app is usable end-to-end (delete, folder management, tag management).
- **Phase 2 — AI Pipeline Hardening**: Make the AI integration reliable and safe to expose (schema validation, rate limiting, richer tool contract).
- **Phase 3 — Error Handling and Reliability**: Surface failure modes to the user and close subtle bugs in sync and auth.
- **Phase 4 — Performance and Scale**: Address limits that appear quickly with real usage (pagination, caching, key revocation).
- **Phase 5 — Polish and Distribution**: Streaming responses, cross-platform rich text, tests, CI, and packaged desktop builds.

---

## TODOs

### Phase 1: Core Feature Completeness

- [x] Add `deleteNote(noteId)` to `src/stores/notes-store.ts` with optimistic local removal, Supabase delete, and MMKV cache sync
- [x] Expose note deletion in `src/components/note-editor.tsx` and `src/components/note-editor.native.tsx` (trash icon or swipe-to-delete)
- [x] Implement `createFolder`, `renameFolder`, and `deleteFolder` in `src/stores/notes-store.ts`
- [x] Add folder management UI in `app/(tabs)/folders.tsx` (create button, inline rename, delete action per row)
- [x] Implement `createTag`, `deleteTag`, and `removeTagFromNote` in `src/stores/notes-store.ts`
- [x] Add tag management UI in `app/(tabs)/tags.tsx` (text input to create tags, delete action per tag)

### Phase 2: AI Pipeline Hardening

- [x] Add Zod schema validation for Claude's JSON response shape before executing ops (`api/server.ts:83`) — a malformed response currently throws an unhandled parse error
- [x] Replace the regex-based markdown code-fence stripping (`api/server.ts:80-82`) with a robust extraction utility or prompt-engineer the system prompt to suppress code fences entirely
- [x] Extend the Claude tool contract to include `delete_note`, `create_folder`, `create_tag`, and `add_tag_to_note` op types
- [x] Add per-user rate limiting to `/v1/ai/execute` and `/v1/external/execute` (e.g., `express-rate-limit`)
- [x] Add request body schema validation (Zod or `express-validator`) to all API endpoints before any business logic runs
- [x] Increase or make dynamic the `max_tokens: 1200` cap in `api/server.ts:72` — it can silently truncate Claude's response for users with many notes

### Phase 3: Error Handling and Reliability

- [x] Catch `updateNote` and `createNote` errors at the component level and surface them to the user (toast or inline message) — currently thrown errors are unhandled in the UI
- [x] Fix the `note_tags` realtime subscription in `src/lib/sync.ts:66` — it does not filter by `user_id`, causing every authenticated user to trigger a refresh on any `note_tags` change
- [x] Add CORS configuration to `api/server.ts` before any production or hosted deployment
- [x] Handle Supabase auth events (`TOKEN_REFRESHED`, `SIGNED_OUT`) explicitly in `src/stores/auth-store.ts` to manage long-lived session expiry

### Phase 4: Performance and Scale

- [x] Add pagination to the notes bootstrap query in `src/lib/sync.ts` — the current Supabase query has no `.limit()` call, fetching all notes at once; load-more or cursor pagination is needed for large accounts
- [x] Cache API key hash lookups in memory with a short TTL to avoid a round-trip DB query on every external API request (`api/server.ts:42-46`)
- [x] Add an API key revocation endpoint (`DELETE /v1/keys/:id`) and surface it in the settings screen

### Phase 5: Polish and Distribution

- [x] Implement streaming Claude responses — added `POST /v1/ai/stream` SSE endpoint in `api/server.ts`
      using `anthropic.messages.stream()`. Extracts partial `summary` characters as they arrive via
      `extractSummaryFromPartialJson`. `ai-prompt-bar.tsx` uses `response.body.getReader()` on web
      for incremental rendering; falls back to the non-streaming `/v1/ai/execute` on native where
      `ReadableStream` body reading is unreliable.
- [ ] Replace the plain `TextInput` fallback in `src/components/note-editor.tsx` (web) with a
      cross-platform rich text editor. `@10play/tentap-editor` does not run on web. Recommended path:
      add `@tiptap/react` + `@tiptap/starter-kit` and create a `note-editor.web.tsx` platform file
      using Tiptap. This requires new dependencies and a build step for Tiptap's CSS.
- [x] Add unit tests for `src/lib/sync.ts` `mergeLww` — 8 test cases covering empty inputs, LWW
      preference, tie-breaking, disjoint merges, sort order, and deduplication. Located in
      `src/__tests__/sync.test.ts`. Run with `npm test`. Notes-store CRUD tests require Supabase +
      MMKV mocking; deferred to a follow-up.
- [ ] Add integration tests for `api/server.ts` endpoints (auth flows, AI execution, key management).
      Skeleton: install `supertest` + `@types/supertest` as devDependencies, create
      `api/__tests__/server.test.ts` with a local Express app instance. Requires a test Supabase
      project or full mock of `supabaseAdmin`/`supabaseAnon`.
- [x] Configure CI (GitHub Actions) — `.github/workflows/ci.yml` runs on every PR and push to `main`:
      installs deps, runs `typecheck`, `lint`, and `npm test`.
- [ ] Replace the placeholder app name (`AppName`) and bundle identifiers in `app.json` and
      `AGENTS.md` before any store or public release. Edit `app.json` fields: `name`, `slug`,
      `ios.bundleIdentifier`, `android.package`. No code changes required.
- [ ] Package the Electron build for distribution with code signing and auto-update support.
      Steps: (1) add `electron-builder` as devDependency, (2) configure `build` in `package.json`
      with `appId`, `productName`, and platform targets, (3) add `electron-updater` for auto-update,
      (4) set up code-signing certificates in CI secrets, (5) add a `dist:desktop` script that builds
      the web bundle then runs `electron-builder`.
