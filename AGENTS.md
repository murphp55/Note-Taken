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
