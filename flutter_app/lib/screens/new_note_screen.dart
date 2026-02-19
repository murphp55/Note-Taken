import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../providers/notes_provider.dart';

class NewNoteScreen extends ConsumerStatefulWidget {
  const NewNoteScreen({super.key, this.title, this.content});

  final String? title;
  final String? content;

  @override
  ConsumerState<NewNoteScreen> createState() => _NewNoteScreenState();
}

class _NewNoteScreenState extends ConsumerState<NewNoteScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final user = ref.read(authProvider);
      if (user == null) {
        if (mounted) context.go('/login');
        return;
      }
      await ref.read(notesStateProvider.notifier).createNote(
            user.id,
            title: widget.title,
            content: widget.content,
          );
      if (mounted) context.go('/tabs/notes');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
