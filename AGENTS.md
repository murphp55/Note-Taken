# NoteTaken

NoteTaken is a cross-platform personal notes and knowledge management application built with React Native and Expo.  
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
| File | Field | Value |
|------|-------|-------|
| `app.config.js` | `name` | `NoteTaken` |
| `app.config.js` | `slug` | `notetaken` |
| `app.config.js` | `scheme` | `notetaken` |
| `app.config.js` | `ios.bundleIdentifier` | `com.notetaken.app` |
| `app.config.js` | `android.package` | `com.notetaken.app` |
| `app/(auth)/login.tsx:31` | login screen title | `NoteTaken` |
| `src/lib/storage.ts:4` | MMKV storage ID | `"notetaken"` |
| `AGENTS.md` heading | document title | `NoteTaken` |

All placeholders have been replaced. Note: `app.json` was converted to `app.config.js` (item 2 of this checklist) so env vars are read from `process.env` at build time instead of as static strings.

---

## Path Forward

Development is organized into five phases that build on each other. Each phase should be broadly stable before moving to the next.

- **Phase 1 — Core Feature Completeness**: Close the gaps in basic CRUD so the app is usable end-to-end (delete, folder management, tag management).
- **Phase 2 — AI Pipeline Hardening**: Make the AI integration reliable and safe to expose (schema validation, rate limiting, richer tool contract).
- **Phase 3 — Error Handling and Reliability**: Surface failure modes to the user and close subtle bugs in sync and auth.
- **Phase 4 — Performance and Scale**: Address limits that appear quickly with real usage (pagination, caching, key revocation).
- **Phase 5 — Polish and Distribution**: Streaming responses, cross-platform rich text, tests, CI, and packaged desktop builds.
- **Phase 6 — LLM-Agnostic API + MCP Server**: Expose direct CRUD endpoints so any LLM can act as the brain. Add an MCP server so Claude Code can read and write notes natively from the terminal.

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
- [x] Replace the placeholder app name and bundle identifiers. App renamed to `NoteTaken`; `app.json`
      converted to `app.config.js` with real env var wiring; bundle ID set to `com.notetaken.app`;
      MMKV storage ID updated to `"notetaken"`.
- [ ] Package the Electron build for distribution with code signing and auto-update support.
      Steps: (1) add `electron-builder` as devDependency, (2) configure `build` in `package.json`
      with `appId`, `productName`, and platform targets, (3) add `electron-updater` for auto-update,
      (4) set up code-signing certificates in CI secrets, (5) add a `dist:desktop` script that builds
      the web bundle then runs `electron-builder`.

### Phase 6: LLM-Agnostic API + MCP Server

Goal: make NoteTaken a dumb filing cabinet that any LLM can drive. The existing `/v1/external/execute`
endpoint still calls Claude internally; Phase 6 replaces that pattern with direct CRUD endpoints and an
MCP server so the LLM lives outside the app entirely.

All new endpoints reuse the existing API key auth middleware (`requireApiKey`) from `api/server.ts`.

#### 6a — CRUD REST endpoints (add to `api/server.ts`)

**Notes**
- [x] `GET  /v1/notes` — list notes for the authenticated user. Supports optional `?search=` (full-text
      filter on title + content), `?folder_id=`, `?tag_id=`, and `?limit=`/`?cursor=` for pagination.
      Returns `{ notes: Note[], hasMore: boolean }`.
- [x] `POST /v1/notes` — create a note. Body: `{ title?: string, content?: string, folder_id?: string }`.
      Returns the created `Note`.
- [x] `PATCH /v1/notes/:id` — update a note. Body: `{ title?: string, content?: string, folder_id?: string }`.
      Returns the updated `Note`.
- [x] `DELETE /v1/notes/:id` — delete a note. Returns `204 No Content`.

**Folders**
- [x] `GET  /v1/folders` — list all folders for the user.
- [x] `POST /v1/folders` — create a folder. Body: `{ name: string, parent_id?: string }`.
- [x] `PATCH /v1/folders/:id` — rename a folder. Body: `{ name: string }`.
- [x] `DELETE /v1/folders/:id` — delete a folder (notes are un-foldered, not deleted).

**Tags**
- [x] `GET  /v1/tags` — list all tags for the user.
- [x] `POST /v1/tags` — create a tag. Body: `{ name: string }`.
- [x] `DELETE /v1/tags/:id` — delete a tag.
- [x] `POST /v1/notes/:id/tags/:tagId` — attach a tag to a note.
- [x] `DELETE /v1/notes/:id/tags/:tagId` — detach a tag from a note.

#### 6b — MCP server (`mcp/server.ts`)

A standalone MCP server (stdio transport) that wraps the CRUD endpoints above. Run locally alongside
the API server; registered in Claude Code via `.mcp.json` in the project root.

- [x] Created `mcp/server.ts` using `@modelcontextprotocol/sdk`. Reads `NOTETAKEN_API_URL` and
      `NOTETAKEN_API_KEY` from environment. Exposes 11 tools:
      `list_notes`, `get_note`, `create_note`, `update_note`, `delete_note`, `search_notes`,
      `list_folders`, `create_folder`, `list_tags`, `create_tag`, `add_tag_to_note`.
- [x] Added `"mcp:dev": "tsx mcp/server.ts"` script to `package.json`.
- [x] Added `NOTETAKEN_API_URL` and `NOTETAKEN_API_KEY` to `.env.example`.

#### 6c — Claude Code registration

- [x] Created `.mcp.json` in the project root. Claude Code picks this up automatically when you open
      this project. Fill in `NOTETAKEN_API_KEY` with a key generated from the app settings screen.
      To register manually: `claude mcp add notetaken -- npx tsx mcp/server.ts`

**To activate the MCP server:**
1. Start the API server: `npm run api:dev`
2. In `.mcp.json`, set `NOTETAKEN_API_KEY` to your key (generate one from NoteTaken Settings → API Keys)
3. Reload this Claude Code session — the `notetaken` tools will be available immediately

---

## Current Status (2026-02-19)

### What's done
- Supabase project created (`nkmlyvxlxwjszxxqosxc.supabase.co`)
- `.env` filled in with Supabase URL, anon key, and service role key
- Database migration applied (`supabase/migrations/20260218_init.sql`)
- `npm install` complete + `react-native-web` installed
- `ANTHROPIC_API_KEY` made optional in `api/server.ts` (not needed until AI features are used)
- API server starts successfully: `npm run api:dev` → listening on port 8787
- App starts successfully: `npm run web`

### Immediate next steps (in order)

1. **Create your user account** — Supabase signup is rate-limited (3/hour on free tier).
   Go to Supabase dashboard → Authentication → Users → Add user → Create new user.
   Enter your email + password, then use **Sign In** (not Create Account) in the app.

2. **Sign in to the app** — use the credentials from step 1.

3. **Generate an API key** — go to Settings in the app → API Keys → generate a key.
   Paste it into `.mcp.json` as `NOTETAKEN_API_KEY`.

4. **Reload Claude Code** — the `notetaken_*` MCP tools will be available for Claude to
   read and write notes directly from this session.

### Deferred / not yet started
- Android App Actions (Gemini on Pixel) — plugin written (`plugins/with-app-actions.js`),
  deep link route written (`app/new-note.tsx`), but requires `expo prebuild` + `expo run:android`
  on a physical Pixel device or emulator to test.
- Web rich text editor (Tiptap) — plain TextInput is used on web today.
- Integration tests for `api/server.ts`.
- Electron packaging for desktop distribution.
- Google OAuth — requires Google Cloud project + Supabase Auth provider config.

---

## Phase 7 — Flutter Rewrite

Replace the entire React Native / Expo front-end with a Flutter app. The Node.js API server
(`api/server.ts`) and MCP server (`mcp/server.ts`) are unchanged — Flutter talks to the same
API and Supabase backend.

**Why Flutter over the current stack:**
- Native desktop (Windows / macOS / Linux) without Electron — no web server, no build step to run
- One `flutter run -d windows` and you have a real `.exe`
- Richer built-in animation and UI primitives
- `supabase_flutter` is a first-class package maintained by Supabase

---

### 7a — Prerequisites

```
flutter SDK >= 3.19  (flutter.dev/docs/get-started/install)
Dart >= 3.3
Android Studio (for Android target)
Xcode (macOS only, for iOS target)
Visual Studio 2022 with "Desktop development with C++" workload (for Windows target)
```

Check your setup: `flutter doctor -v`

---

### 7b — Create the Flutter project

```bash
# Inside the repo root, create a subdirectory for the Flutter app
flutter create --org com.notetaken --project-name notetaken flutter_app
cd flutter_app

# Enable desktop targets you need
flutter config --enable-windows-desktop
flutter config --enable-macos-desktop
flutter config --enable-linux-desktop
```

The existing `api/` and `mcp/` directories stay at the repo root.
The Flutter source lives entirely inside `flutter_app/`.

---

### 7c — Dependencies (`flutter_app/pubspec.yaml`)

```yaml
dependencies:
  flutter:
    sdk: flutter

  # Supabase — auth, database, realtime
  supabase_flutter: ^2.8.0

  # State management
  flutter_riverpod: ^2.6.1
  riverpod_annotation: ^2.6.1

  # Routing
  go_router: ^14.3.0

  # Local cache (replaces MMKV)
  hive_flutter: ^1.1.0

  # Rich text editor (replaces @10play/tentap-editor)
  flutter_quill: ^10.8.5

  # Google Sign-In
  google_sign_in: ^6.2.1

  # Utilities
  uuid: ^4.5.1
  intl: ^0.19.0
  flutter_dotenv: ^5.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.13
  riverpod_generator: ^2.6.1
  hive_generator: ^2.0.1
  flutter_lints: ^5.0.0
```

Install: `flutter pub get`

---

### 7d — Environment configuration

Create `flutter_app/.env`:

```
SUPABASE_URL=https://nkmlyvxlxwjszxxqosxc.supabase.co
SUPABASE_ANON_KEY=eyJ...
APP_API_BASE_URL=http://localhost:8787
GOOGLE_WEB_CLIENT_ID=
```

Load in `main.dart`:
```dart
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  await dotenv.load(fileName: ".env");
  // ...
}
```

---

### 7e — Project structure

```
flutter_app/lib/
  main.dart                  # Entry point, ProviderScope, GoRouter init
  router.dart                # GoRouter route definitions

  models/
    note.dart                # Note, Folder, Tag, NoteTag, ApiKey data classes + fromJson/toJson
    note.g.dart              # Generated by hive_generator

  services/
    supabase_service.dart    # Supabase client singleton, auth helpers
    sync_service.dart        # Bootstrap, realtime subscriptions, LWW merge
    local_cache.dart         # Hive read/write helpers (replaces MMKV storage.ts)
    api_service.dart         # HTTP calls to localhost:8787 (API key CRUD, AI execute)

  providers/
    auth_provider.dart       # Riverpod: session, user, signIn/signUp/signOut
    notes_provider.dart      # Riverpod: notes, folders, tags, noteTags, CRUD ops
    ui_provider.dart         # Riverpod: activeNoteId, search, selectedTagId

  screens/
    login_screen.dart        # Email/password + Google OAuth
    tabs_shell.dart          # Bottom nav shell (5 tabs)
    all_notes_screen.dart    # Notes list + editor side-by-side on wide screens
    folders_screen.dart      # Folder list, create/rename/delete
    tags_screen.dart         # Tag list, create/delete, tag filter
    search_screen.dart       # Search input + filtered notes list
    settings_screen.dart     # API key management (generate, list, revoke)
    new_note_screen.dart     # Deep link handler for Android App Actions

  widgets/
    notes_list.dart          # Scrollable list of note tiles
    note_editor.dart         # Title + QuillEditor content
    ai_prompt_bar.dart       # AI instruction input + streaming response
    notes_workspace.dart     # Responsive split-pane layout
```

---

### 7f — Data models

All models live in `lib/models/note.dart`. Use `@HiveType` / `@HiveField` annotations
so Hive can store them locally, and add `fromJson`/`toJson` for Supabase responses.

```dart
@HiveType(typeId: 0)
class Note extends HiveObject {
  @HiveField(0) String id;
  @HiveField(1) String userId;
  @HiveField(2) String title;
  @HiveField(3) String content;
  @HiveField(4) String? folderId;
  @HiveField(5) DateTime createdAt;
  @HiveField(6) DateTime updatedAt;

  factory Note.fromJson(Map<String, dynamic> json) => Note(
    id: json['id'],
    userId: json['user_id'],
    title: json['title'] ?? '',
    content: json['content'] ?? '',
    folderId: json['folder_id'],
    createdAt: DateTime.parse(json['created_at']),
    updatedAt: DateTime.parse(json['updated_at']),
  );
}
// Same pattern for Folder, Tag, NoteTag, ApiKey
```

Generate adapters: `flutter pub run build_runner build`

---

### 7g — Supabase service

```dart
// lib/services/supabase_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> initSupabase() async {
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );
}

SupabaseClient get supabase => Supabase.instance.client;
```

Supabase Flutter handles session persistence automatically via secure storage.

---

### 7h — Auth provider (Riverpod)

```dart
// lib/providers/auth_provider.dart
@riverpod
class AuthNotifier extends _$AuthNotifier {
  @override
  User? build() => supabase.auth.currentUser;

  Future<void> signInWithEmail(String email, String password) async {
    await supabase.auth.signInWithPassword(email: email, password: password);
    state = supabase.auth.currentUser;
  }

  Future<void> signUpWithEmail(String email, String password) async {
    await supabase.auth.signUp(email: email, password: password);
    state = supabase.auth.currentUser;
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
    state = null;
  }
}
```

Subscribe to auth changes in `main.dart`:
```dart
supabase.auth.onAuthStateChange.listen((data) {
  ref.read(authNotifierProvider.notifier).state = data.session?.user;
});
```

---

### 7i — Notes provider (Riverpod)

Mirrors `src/stores/notes-store.ts`. One `NotesNotifier` class with:

```dart
@riverpod
class NotesNotifier extends _$NotesNotifier {
  // State
  List<Note> notes = [];
  List<Folder> folders = [];
  List<Tag> tags = [];
  List<NoteTag> noteTags = [];
  String? activeNoteId;
  String search = '';
  String? selectedTagId;
  bool hasMore = false;

  // Methods mirror the TypeScript store exactly:
  Future<void> init(String userId) async { ... }   // bootstrap + subscribe
  Future<void> refresh(String userId) async { ... }
  Future<void> loadMore(String userId) async { ... }
  Future<void> createNote(String userId, { String? folderId, String? title, String? content }) async { ... }
  Future<void> updateNote(String noteId, { String? title, String? content, String? folderId }) async { ... }
  Future<void> deleteNote(String noteId) async { ... }
  Future<void> createFolder(String userId, String name, { String? parentId }) async { ... }
  Future<void> renameFolder(String folderId, String name) async { ... }
  Future<void> deleteFolder(String folderId) async { ... }
  Future<void> createTag(String userId, String name) async { ... }
  Future<void> deleteTag(String tagId) async { ... }
  Future<void> addTagToNote(String noteId, String tagId) async { ... }
  Future<void> removeTagFromNote(String noteId, String tagId) async { ... }
}
```

---

### 7j — Local cache (Hive, replaces MMKV)

```dart
// lib/services/local_cache.dart
import 'package:hive_flutter/hive_flutter.dart';

Future<void> initHive() async {
  await Hive.initFlutter();
  Hive.registerAdapter(NoteAdapter());
  Hive.registerAdapter(FolderAdapter());
  Hive.registerAdapter(TagAdapter());
  Hive.registerAdapter(NoteTagAdapter());
}

Box<Note> get notesBox => Hive.box<Note>('notes');
Box<Folder> get foldersBox => Hive.box<Folder>('folders');
Box<Tag> get tagsBox => Hive.box<Tag>('tags');
Box<NoteTag> get noteTagsBox => Hive.box<NoteTag>('noteTags');
```

Open boxes at startup before runApp:
```dart
await Hive.openBox<Note>('notes');
await Hive.openBox<Folder>('folders');
await Hive.openBox<Tag>('tags');
await Hive.openBox<NoteTag>('noteTags');
```

---

### 7k — Realtime sync

```dart
// lib/services/sync_service.dart
void subscribe(String userId, VoidCallback onRefresh) {
  supabase
    .channel('notes-$userId')
    .onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'notes',
      filter: PostgresChangeFilter(type: FilterType.eq, column: 'user_id', value: userId),
      callback: (_) => onRefresh(),
    )
    .subscribe();
  // Same for folders, tags, note_tags channels
}
```

---

### 7l — Routing (GoRouter)

```dart
// lib/router.dart
final router = GoRouter(
  redirect: (context, state) {
    final user = supabase.auth.currentUser;
    final isAuth = state.fullPath?.startsWith('/tabs') ?? false;
    if (user == null && isAuth) return '/login';
    if (user != null && state.fullPath == '/login') return '/tabs/notes';
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/auth/callback', builder: (_, __) => const AuthCallbackScreen()),
    GoRoute(                          // Deep link for Android App Actions
      path: '/new-note',
      builder: (_, state) => NewNoteScreen(
        title: state.uri.queryParameters['title'],
        content: state.uri.queryParameters['content'],
      ),
    ),
    ShellRoute(
      builder: (_, __, child) => TabsShell(child: child),
      routes: [
        GoRoute(path: '/tabs/notes',    builder: (_, __) => const AllNotesScreen()),
        GoRoute(path: '/tabs/folders',  builder: (_, __) => const FoldersScreen()),
        GoRoute(path: '/tabs/tags',     builder: (_, __) => const TagsScreen()),
        GoRoute(path: '/tabs/search',   builder: (_, __) => const SearchScreen()),
        GoRoute(path: '/tabs/settings', builder: (_, __) => const SettingsScreen()),
      ],
    ),
  ],
);
```

---

### 7m — Screens

#### LoginScreen
- Two TextFields (email, password) + three ElevatedButtons (Sign In, Create Account, Continue with Google)
- Google Sign-In via `google_sign_in` package + `supabase.auth.signInWithIdToken`
- On success: GoRouter redirects to `/tabs/notes` via `onAuthStateChange`

#### TabsShell
- `NavigationBar` with 5 destinations: Notes, Folders, Tags, Search, Settings
- Wrap with `Scaffold`; `AppBar` on Settings shows logout IconButton

#### AllNotesScreen
- `LayoutBuilder` → wide (≥900px): `Row` with `NotesList` (left) + `NoteEditor` (right)
- Narrow: show `NotesList`; tap a note to push `NoteEditor` onto nav stack
- FloatingActionButton: create new note

#### FoldersScreen
- `ListView` of folders with note count badge
- Header `TextField` + button to create folder
- Each row: tap to expand notes preview, long-press for rename/delete context menu
- Show up to 5 note titles per folder; tap any note to navigate to editor

#### TagsScreen
- `Wrap` of `FilterChip` widgets (one per tag)
- Header `TextField` + button to create tag
- Tap chip: toggle selected tag filter
- Long-press chip: delete tag confirmation dialog

#### SearchScreen
- `TextField` with search icon
- Below: `NotesList` filtered by query + selected tag

#### SettingsScreen
- Section: API Keys
  - `ElevatedButton` "Generate New Key" → POST /v1/keys → show key once in a dialog
  - `ListView` of existing keys: masked ID, created date, last used date, delete IconButton
- Calls `http://localhost:8787/v1/keys` with Bearer token from current Supabase session

#### NewNoteScreen (deep link)
- Reads `title` and `content` from URL query params
- Calls `notesNotifier.createNote(...)` then `context.go('/tabs/notes')`
- Shows CircularProgressIndicator while creating

---

### 7n — NoteEditor widget

```dart
class NoteEditor extends ConsumerWidget {
  final String noteId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final note = ref.watch(noteByIdProvider(noteId));
    final quillController = QuillController(...);

    return Column(children: [
      // Title
      TextField(
        style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
        controller: TextEditingController(text: note.title),
        onChanged: (v) => ref.read(notesNotifierProvider.notifier).updateNote(noteId, title: v),
      ),
      // Body (flutter_quill)
      QuillEditor.basic(controller: quillController, ...),
      // Toolbar
      QuillSimpleToolbar(controller: quillController, ...),
      // Delete
      IconButton(icon: Icon(Icons.delete), onPressed: () => _confirmDelete(context, ref)),
    ]);
  }
}
```

---

### 7o — AIPromptBar widget

The AI features require `ANTHROPIC_API_KEY` to be set in the API server `.env`.
The widget calls the existing API server endpoints — no Anthropic SDK needed in Flutter.

```dart
class AiPromptBar extends ConsumerStatefulWidget { ... }

// On submit:
Future<void> _run(String instruction) async {
  final session = supabase.auth.currentSession!;
  final notes = ref.read(notesNotifierProvider).notes;

  final response = await http.post(
    Uri.parse('${dotenv.env['APP_API_BASE_URL']}/v1/ai/execute'),
    headers: {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'instruction': instruction,
      'context': { 'notes': notes.map((n) => n.toJson()).toList(), ... },
    }),
  );
  // Parse response, show summary, refresh notes
  await ref.read(notesNotifierProvider.notifier).refresh(session.user.id);
}
```

For streaming: use the `http` package's `send()` method + `StreamedResponse` to read SSE chunks.

---

### 7p — Desktop (Windows / macOS / Linux)

Flutter desktop is native — no Electron, no web server, no build step.

```bash
# Run on Windows desktop
cd flutter_app
flutter run -d windows

# Run on macOS
flutter run -d macos

# Build a release .exe
flutter build windows --release
# Output: flutter_app/build/windows/x64/runner/Release/notetaken.exe
```

For Windows: ensure Visual Studio 2022 + "Desktop development with C++" workload is installed.

---

### 7q — Android App Actions (Gemini on Pixel)

The same `shortcuts.xml` intent works in Flutter. Place it at:
`flutter_app/android/app/src/main/res/xml/shortcuts.xml`

Content is identical to the one generated by `plugins/with-app-actions.js`.
Deep link URL scheme: add to `flutter_app/android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="notetaken" android:host="new-note" />
</intent-filter>
```

GoRouter handles the `notetaken://new-note?title=X&content=Y` URI automatically.

---

### 7r — Implementation order

Build in this order so each step is testable end-to-end:

1. `flutter create`, add all pubspec dependencies, `flutter pub get`
2. `.env` + Supabase init + `main.dart` scaffold
3. Data models + Hive adapters (run `build_runner`)
4. Auth provider + LoginScreen — verify sign-in works
5. GoRouter shell + TabsShell with 5 empty tabs
6. Notes provider: `init()`, `createNote()`, `updateNote()`, `deleteNote()` — test against live Supabase
7. NotesList + NoteEditor widgets — basic text editing
8. AllNotesScreen with responsive layout
9. FoldersScreen + TagsScreen + SearchScreen
10. Realtime subscriptions (sync_service.dart)
11. SettingsScreen + API key management (calls API server)
12. QuillEditor rich text (replace plain TextField in NoteEditor)
13. AIPromptBar (requires API server running + ANTHROPIC_API_KEY set)
14. Android App Actions deep link
15. Desktop polish (`flutter run -d windows`) — test layout at large sizes
16. `flutter build windows --release` for a distributable .exe
