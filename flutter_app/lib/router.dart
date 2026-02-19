import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'screens/all_notes_screen.dart';
import 'screens/folders_screen.dart';
import 'screens/login_screen.dart';
import 'screens/new_note_screen.dart';
import 'screens/search_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/tabs_shell.dart';
import 'screens/tags_screen.dart';
import 'services/supabase_service.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final refreshListenable = GoRouterRefreshStream(
    supabase.auth.onAuthStateChange,
  );

  ref.onDispose(refreshListenable.dispose);

  return GoRouter(
    initialLocation: '/tabs/notes',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final user = ref.read(authProvider);
      final onLogin = state.matchedLocation == '/login';
      if (user == null && !onLogin) return '/login';
      if (user != null && onLogin) return '/tabs/notes';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
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

class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
