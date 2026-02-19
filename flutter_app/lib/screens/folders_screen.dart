import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../providers/notes_provider.dart';

class FoldersScreen extends ConsumerStatefulWidget {
  const FoldersScreen({super.key});

  @override
  ConsumerState<FoldersScreen> createState() => _FoldersScreenState();
}

class _FoldersScreenState extends ConsumerState<FoldersScreen> {
  final _name = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notesStateProvider);
    final user = ref.watch(authProvider);
    final notes = state.notes;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'New folder'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: user == null
                    ? null
                    : () async {
                        final value = _name.text.trim();
                        if (value.isEmpty) return;
                        await ref.read(notesStateProvider.notifier).createFolder(user.id, value);
                        _name.clear();
                      },
                child: const Text('Create'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: state.folders.length,
              itemBuilder: (context, index) {
                final folder = state.folders[index];
                final count = notes.where((n) => n.folderId == folder.id).length;
                return ListTile(
                  title: Text(folder.name),
                  subtitle: Text('$count notes'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () =>
                        ref.read(notesStateProvider.notifier).deleteFolder(folder.id),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
