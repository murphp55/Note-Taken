import 'package:flutter/material.dart';

class AiPromptBar extends StatefulWidget {
  const AiPromptBar({super.key});

  @override
  State<AiPromptBar> createState() => _AiPromptBarState();
}

class _AiPromptBarState extends State<AiPromptBar> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            decoration: const InputDecoration(
              hintText: 'Ask AI to create, edit, or summarize notes',
            ),
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('AI endpoint wiring is next.')),
            );
          },
          child: const Text('Run'),
        ),
      ],
    );
  }
}
