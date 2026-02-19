import 'package:flutter/material.dart';

import '../models/note.dart';
import 'ai_prompt_bar.dart';
import 'note_editor.dart';
import 'notes_list.dart';

class NotesWorkspace extends StatelessWidget {
  const NotesWorkspace({
    required this.notes,
    required this.activeNoteId,
    required this.onSelect,
    super.key,
  });

  final List<Note> notes;
  final String? activeNoteId;
  final void Function(String id) onSelect;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        if (!wide) {
          return Column(
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(12, 12, 12, 0),
                child: AiPromptBar(),
              ),
              Expanded(
                child: NotesList(
                  notes: notes,
                  activeNoteId: activeNoteId,
                  onSelect: onSelect,
                ),
              ),
            ],
          );
        }

        return Row(
          children: [
            SizedBox(
              width: 340,
              child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(12, 12, 12, 0),
                    child: AiPromptBar(),
                  ),
                  Expanded(
                    child: NotesList(
                      notes: notes,
                      activeNoteId: activeNoteId,
                      onSelect: onSelect,
                    ),
                  ),
                ],
              ),
            ),
            const VerticalDivider(width: 1),
            Expanded(
              child: activeNoteId == null
                  ? const Center(child: Text('Select a note'))
                  : NoteEditor(noteId: activeNoteId!),
            ),
          ],
        );
      },
    );
  }
}
