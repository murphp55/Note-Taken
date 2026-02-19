import 'package:supabase_flutter/supabase_flutter.dart';

import 'supabase_service.dart';

class SyncService {
  final List<RealtimeChannel> _channels = [];

  void subscribe(String userId, void Function() onRefresh) {
    unsubscribe();
    _channels.add(_watchTable('notes-$userId', 'notes', userId, onRefresh));
    _channels.add(_watchTable('folders-$userId', 'folders', userId, onRefresh));
    _channels.add(_watchTable('tags-$userId', 'tags', userId, onRefresh));
    _channels.add(_watchTable('note-tags-$userId', 'note_tags', userId, onRefresh));
  }

  RealtimeChannel _watchTable(
    String channelName,
    String table,
    String userId,
    void Function() onRefresh,
  ) {
    final channel = supabase.channel(channelName);
    channel.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: table,
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'user_id',
        value: userId,
      ),
      callback: (_) => onRefresh(),
    );
    channel.subscribe();
    return channel;
  }

  void unsubscribe() {
    for (final channel in _channels) {
      supabase.removeChannel(channel);
    }
    _channels.clear();
  }
}
