import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../providers/notes_provider.dart';
import '../widgets/notes_workspace.dart';

class AllNotesScreen extends ConsumerStatefulWidget {
  const AllNotesScreen({super.key});

  @override
  ConsumerState<AllNotesScreen> createState() => _AllNotesScreenState();
}

class _AllNotesScreenState extends ConsumerState<AllNotesScreen> {
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    final user = ref.read(authProvider);
    if (user != null) {
      ref.read(notesStateProvider.notifier).init(user);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);
    final state = ref.watch(notesStateProvider);
    final controller = ref.read(notesStateProvider.notifier);

    return Scaffold(
      body: NotesWorkspace(
        notes: state.visibleNotes,
        activeNoteId: state.activeNoteId,
        onSelect: controller.setActiveNote,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: user == null ? null : () => controller.createNote(user),
        child: const Icon(Icons.add),
      ),
    );
  }
}
