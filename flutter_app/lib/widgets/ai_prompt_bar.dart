import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../providers/notes_provider.dart';
import '../services/supabase_service.dart';

class AiPromptBar extends ConsumerStatefulWidget {
  const AiPromptBar({super.key});

  @override
  ConsumerState<AiPromptBar> createState() => _AiPromptBarState();
}

class _AiPromptBarState extends ConsumerState<AiPromptBar> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _summary;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _run() async {
    final instruction = _controller.text.trim();
    if (instruction.isEmpty) return;

    final session = supabase.auth.currentSession;
    if (session == null) return;

    final notesState = ref.read(notesStateProvider);
    final apiBase = dotenv.env['APP_API_BASE_URL'] ?? 'http://localhost:8787';

    setState(() {
      _loading = true;
      _summary = null;
      _error = null;
    });

    try {
      final response = await http.post(
        Uri.parse('$apiBase/v1/ai/execute'),
        headers: {
          'Authorization': 'Bearer ${session.accessToken}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'instruction': instruction,
          'context': {
            'notes': notesState.notes.map((n) => n.toJson()).toList(),
            'folders': notesState.folders.map((f) => f.toJson()).toList(),
            'tags': notesState.tags.map((t) => t.toJson()).toList(),
          },
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('API returned ${response.statusCode}: ${response.body}');
      }

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final summary = (body['summary'] as String?) ?? 'Done';

      await ref.read(notesStateProvider.notifier).refresh(session.user.id);

      setState(() {
        _summary = summary;
        _loading = false;
      });
      _controller.clear();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                enabled: !_loading,
                decoration: const InputDecoration(
                  hintText: 'Ask AI to create, edit, or summarize notes',
                ),
                onSubmitted: (_) => _run(),
              ),
            ),
            const SizedBox(width: 8),
            _loading
                ? const SizedBox(
                    width: 36,
                    height: 36,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : FilledButton(
                    onPressed: _run,
                    child: const Text('Run'),
                  ),
          ],
        ),
        if (_summary != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              _summary!,
              style: TextStyle(fontSize: 12, color: Colors.green.shade700),
            ),
          ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              _error!,
              style: TextStyle(fontSize: 12, color: Colors.red.shade700),
            ),
          ),
      ],
    );
  }
}
