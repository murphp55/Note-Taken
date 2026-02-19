import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/notes_provider.dart';

class NoteEditor extends ConsumerStatefulWidget {
  const NoteEditor({required this.noteId, super.key});

  final String noteId;

  @override
  ConsumerState<NoteEditor> createState() => _NoteEditorState();
}

class _NoteEditorState extends ConsumerState<NoteEditor> {
  final _title = TextEditingController();
  final _content = TextEditingController();
  String? _lastBoundId;
  bool _isInternalUpdate = false;

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notesStateProvider);
    final matches = state.notes.where((n) => n.id == widget.noteId);
    final note = matches.isEmpty ? null : matches.first;
    if (note == null) {
      return const Center(child: Text('Select a note'));
    }

    if (_lastBoundId != note.id ||
        _title.text != note.title ||
        (!_isInternalUpdate && _content.text != note.content)) {
      _isInternalUpdate = true;
      _title.text = note.title;
      _content.text = note.content;
      _lastBoundId = note.id;
      _isInternalUpdate = false;
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _title,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            decoration: const InputDecoration(border: InputBorder.none, hintText: 'Title'),
            onChanged: (value) => ref
                .read(notesStateProvider.notifier)
                .updateNote(note.id, title: value),
          ),
          const Divider(),
          Expanded(
            child: TextField(
              controller: _content,
              expands: true,
              maxLines: null,
              decoration: const InputDecoration(border: InputBorder.none, hintText: 'Write here...'),
              onChanged: (value) => ref
                  .read(notesStateProvider.notifier)
                  .updateNote(note.id, content: value),
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () => ref.read(notesStateProvider.notifier).deleteNote(note.id),
            ),
          ),
        ],
      ),
    );
  }
}
