import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/notes_provider.dart';
import '../widgets/notes_list.dart';

class SearchScreen extends ConsumerWidget {
  const SearchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notesStateProvider);
    final controller = ref.read(notesStateProvider.notifier);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            decoration: const InputDecoration(
              labelText: 'Search',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: controller.setSearch,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: NotesList(
              notes: state.visibleNotes,
              activeNoteId: state.activeNoteId,
              onSelect: controller.setActiveNote,
            ),
          ),
        ],
      ),
    );
  }
}
