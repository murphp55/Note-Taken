// TODO(supabase-restore): Re-enable GoRouterRefreshStream, refreshListenable, redirect,
// and the /login route. Original used:
//   import 'dart:async';
//   import 'package:flutter/foundation.dart';
//   import 'providers/auth_provider.dart';
//   import 'screens/login_screen.dart';
//   import 'services/supabase_service.dart';
//   final refreshListenable = GoRouterRefreshStream(supabase.auth.onAuthStateChange);
//   ref.onDispose(refreshListenable.dispose);
//   refreshListenable: refreshListenable,
//   redirect: (context, state) {
//     final user = ref.read(authProvider);
//     final onLogin = state.matchedLocation == '/login';
//     if (user == null && !onLogin) return '/login';
//     if (user != null && onLogin) return '/tabs/notes';
//     return null;
//   },
// And the GoRouterRefreshStream class at the bottom.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'screens/all_notes_screen.dart';
import 'screens/folders_screen.dart';
import 'screens/new_note_screen.dart';
import 'screens/search_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/tabs_shell.dart';
import 'screens/tags_screen.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  // TODO(supabase-restore): Restore GoRouterRefreshStream + auth redirect (see top comments).
  return GoRouter(
    initialLocation: '/tabs/notes',
    routes: [
      // TODO(supabase-restore): Re-enable /login route and LoginScreen import.
      GoRoute(
        path: '/new-note',
        builder: (context, state) => NewNoteScreen(
          title: state.uri.queryParameters['title'],
          content: state.uri.queryParameters['content'],
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => TabsShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/tabs/notes', builder: (context, state) => const AllNotesScreen()),
          GoRoute(path: '/tabs/folders', builder: (context, state) => const FoldersScreen()),
          GoRoute(path: '/tabs/tags', builder: (context, state) => const TagsScreen()),
          GoRoute(path: '/tabs/search', builder: (context, state) => const SearchScreen()),
          GoRoute(path: '/tabs/settings', builder: (context, state) => const SettingsScreen()),
        ],
      ),
    ],
  );
});
