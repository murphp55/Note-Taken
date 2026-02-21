import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../providers/notes_provider.dart';

class TagsScreen extends ConsumerStatefulWidget {
  const TagsScreen({super.key});

  @override
  ConsumerState<TagsScreen> createState() => _TagsScreenState();
}

class _TagsScreenState extends ConsumerState<TagsScreen> {
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
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'New tag'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: user == null
                    ? null
                    : () async {
                        final value = _name.text.trim();
                        if (value.isEmpty) return;
                        await ref.read(notesStateProvider.notifier).createTag(user, value);
                        _name.clear();
                      },
                child: const Text('Create'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final tag in state.tags)
                FilterChip(
                  label: Text(tag.name),
                  selected: state.selectedTagId == tag.id,
                  onSelected: (_) => ref.read(notesStateProvider.notifier).setSelectedTag(
                        state.selectedTagId == tag.id ? null : tag.id,
                      ),
                  onDeleted: () => ref.read(notesStateProvider.notifier).deleteTag(tag.id),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
