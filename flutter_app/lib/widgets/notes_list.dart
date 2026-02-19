import 'package:flutter/material.dart';

import '../models/note.dart';

class NotesList extends StatelessWidget {
  const NotesList({
    required this.notes,
    required this.activeNoteId,
    required this.onSelect,
    super.key,
  });

  final List<Note> notes;
  final String? activeNoteId;
  final void Function(String noteId) onSelect;

  @override
  Widget build(BuildContext context) {
    if (notes.isEmpty) {
      return const Center(child: Text('No notes yet'));
    }
    return ListView.separated(
      itemCount: notes.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final note = notes[index];
        final selected = note.id == activeNoteId;
        return ListTile(
          selected: selected,
          title: Text(
            note.title.isEmpty ? 'Untitled' : note.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          subtitle: Text(
            note.content,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          onTap: () => onSelect(note.id),
        );
      },
    );
  }
}
