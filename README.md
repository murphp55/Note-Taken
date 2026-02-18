# AppName Notes (Expo + Supabase)

Cross-platform personal notes system with real-time sync, offline cache, and Claude-powered commands.

## Implemented Architecture

- Expo SDK 51 + Expo Router + TypeScript
- Supabase Auth (email/password + Google OAuth flow)
- Supabase PostgreSQL schema with RLS for user-isolated data
- Real-time subscriptions for notes/folders/tags/note_tags
- Offline-first local cache using MMKV
- Last-write-wins merge behavior via `updated_at`
- Notes workspace UI:
  - Sidebar/split-panel on wide screens
  - Mobile-friendly tab navigation
- Persistent AI prompt bar that executes natural language commands
- Companion REST API for external Claude usage with personal API keys

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill values:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
APP_API_BASE_URL=http://localhost:8787
GOOGLE_WEB_CLIENT_ID=
```

3. Apply SQL migration in Supabase:
- `supabase/migrations/20260218_init.sql`

4. Run API server:

```bash
npm run api:dev
```

5. Run app:

```bash
npm run start
```

## Routes

- `/(auth)/login`
- `/(tabs)/index` All Notes
- `/(tabs)/folders`
- `/(tabs)/tags`
- `/(tabs)/search`
- `/(tabs)/settings`

## Important Notes

- Native editor uses 10tap (`@10play/tentap-editor`) in `src/components/note-editor.native.tsx`.
- Web editor currently falls back to plain text input in `src/components/note-editor.tsx`.
- External API endpoint for Claude integrations:
  - `POST /v1/external/execute` with header `x-api-key: <personal-key>`
- Internal app AI endpoint:
  - `POST /v1/ai/execute` with Supabase bearer token.

## Next Hardening Steps

1. Add robust AI tool-calling contract validation with `zod`.
2. Stream Claude response tokens to UI (SSE/WebSocket).
3. Add tests for sync merge and API auth/key flows.
4. Implement richer folder/tree and tag management UIs.
5. Add desktop packaging (Electron wrapper or RN macOS/Windows target).
