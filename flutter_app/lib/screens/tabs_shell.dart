import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

class TabsShell extends ConsumerWidget {
  const TabsShell({
    required this.child,
    required this.location,
    super.key,
  });

  final Widget child;
  final String location;

  int _indexFromLocation(String current) {
    if (current.startsWith('/tabs/folders')) return 1;
    if (current.startsWith('/tabs/tags')) return 2;
    if (current.startsWith('/tabs/search')) return 3;
    if (current.startsWith('/tabs/settings')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = _indexFromLocation(location);
    const routes = [
      '/tabs/notes',
      '/tabs/folders',
      '/tabs/tags',
      '/tabs/search',
      '/tabs/settings',
    ];
    return Scaffold(
      appBar: AppBar(
        title: const Text('NoteTaken'),
        actions: index == 4
            ? [
                IconButton(
                  tooltip: 'Sign out',
                  onPressed: () => ref.read(authProvider.notifier).signOut(),
                  icon: const Icon(Icons.logout),
                ),
              ]
            : null,
      ),
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => context.go(routes[value]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.notes_outlined), label: 'Notes'),
          NavigationDestination(icon: Icon(Icons.folder_outlined), label: 'Folders'),
          NavigationDestination(icon: Icon(Icons.sell_outlined), label: 'Tags'),
          NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Settings'),
        ],
      ),
    );
  }
}
