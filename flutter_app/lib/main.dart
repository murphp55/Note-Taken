import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'providers/auth_provider.dart';
import 'providers/notes_provider.dart';
import 'router.dart';
import 'services/local_cache.dart';
// TODO(supabase-restore): Re-enable: import 'services/supabase_service.dart';

Future<void> main() async {
  await runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    FlutterError.onError = (details) {
      debugPrint('FLUTTER ERROR: ${details.exception}');
      debugPrint('${details.stack}');
      FlutterError.presentError(details);
    };

    await dotenv.load(fileName: '.env');
    // TODO(supabase-restore): Re-enable: await initSupabase();
    await initHive();
    runApp(const ProviderScope(child: NoteTakenApp()));
  }, (error, stack) {
    debugPrint('UNCAUGHT ERROR: $error');
    debugPrint('$stack');
  });
}

class NoteTakenApp extends ConsumerWidget {
  const NoteTakenApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(authProvider);
    ref.watch(notesStateProvider);
    final router = ref.watch(goRouterProvider);

    return MaterialApp.router(
      title: 'NoteTaken',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}
