import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/note.dart';
import '../services/api_service.dart';
import '../services/supabase_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  List<ApiKeyRecord> _keys = const [];
  String? _error;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadKeys();
  }

  ApiService? _api() {
    final token = supabase.auth.currentSession?.accessToken;
    if (token == null || token.isEmpty) return null;
    return ApiService(token);
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await action();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadKeys() async {
    await _run(() async {
      final api = _api();
      if (api == null) return;
      final keys = await api.listKeys();
      setState(() => _keys = keys);
    });
  }

  Future<void> _createKey() async {
    await _run(() async {
      final api = _api();
      if (api == null) return;
      final key = await api.createKey();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('New API Key'),
          content: SelectableText(key),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        ),
      );
      await _loadKeys();
    });
  }

  Future<void> _revoke(String id) async {
    await _run(() async {
      final api = _api();
      if (api == null) return;
      await api.revokeKey(id);
      await _loadKeys();
    });
  }

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat.yMd().add_jm();
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('API Keys', style: Theme.of(context).textTheme.titleLarge),
              const Spacer(),
              FilledButton(
                onPressed: _loading ? null : _createKey,
                child: const Text('Generate New Key'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_loading) const LinearProgressIndicator(),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 8),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadKeys,
              child: ListView.builder(
                itemCount: _keys.length,
                itemBuilder: (context, index) {
                  final key = _keys[index];
                  return ListTile(
                    title: Text(key.name),
                    subtitle: Text(
                      'Created ${formatter.format(key.createdAt)}'
                      '${key.lastUsedAt == null ? '' : ' • Last used ${formatter.format(key.lastUsedAt!)}'}',
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: _loading ? null : () => _revoke(key.id),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
