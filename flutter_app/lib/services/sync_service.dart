// TODO(supabase-restore): Restore full Supabase realtime subscriptions.
// Original used supabase_flutter RealtimeChannel to watch notes, folders, tags,
// and note_tags tables filtered by user_id. See git history for the full version.
//
// import 'package:supabase_flutter/supabase_flutter.dart';
// import 'supabase_service.dart';

class SyncService {
  // TODO(supabase-restore): Restore: final List<RealtimeChannel> _channels = [];

  void subscribe(String userId, void Function() onRefresh) {
    // TODO(supabase-restore): Restore Supabase realtime channel subscriptions.
  }

  void unsubscribe() {
    // TODO(supabase-restore): Restore: remove all channels and clear _channels list.
  }
}
