// TODO(supabase-restore): Restore all Supabase CRUD calls and realtime sync.
// Original used supabase.from(...).select/insert/update/delete on every operation,
// plus SyncService for realtime subscriptions. See git history for the full version.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/note.dart';
import '../services/local_cache.dart';
// TODO(supabase-restore): Re-enable these imports:
// import '../services/supabase_service.dart';
// import '../services/sync_service.dart';
import 'auth_provider.dart';

final notesStateProvider =
    StateNotifierProvider<NotesController, NotesState>((ref) {
  final controller = NotesController(ref);
  // TODO(supabase-restore): Change back to ref.listen<User?>
  ref.listen<String?>(authProvider, (prev, next) {
    if (next == null) {
      controller.reset();
    } else if (prev != next) {
      // TODO(supabase-restore): Change next back to next.id
      controller.init(next);
    }
  });
  return controller;
});

class NotesState {
  const NotesState({
    this.notes = const [],
    this.folders = const [],
    this.tags = const [],
    this.noteTags = const [],
    this.activeNoteId,
    this.search = '',
    this.selectedTagId,
    this.isLoading = false,
    this.hasMore = false,
  });

  final List<Note> notes;
  final List<Folder> folders;
  final List<Tag> tags;
  final List<NoteTag> noteTags;
  final String? activeNoteId;
  final String search;
  final String? selectedTagId;
  final bool isLoading;
  final bool hasMore;

  NotesState copyWith({
    List<Note>? notes,
    List<Folder>? folders,
    List<Tag>? tags,
    List<NoteTag>? noteTags,
    String? activeNoteId,
    String? search,
    String? selectedTagId,
    bool? isLoading,
    bool? hasMore,
    bool clearActiveNote = false,
    bool clearSelectedTag = false,
  }) {
    return NotesState(
      notes: notes ?? this.notes,
      folders: folders ?? this.folders,
      tags: tags ?? this.tags,
      noteTags: noteTags ?? this.noteTags,
      activeNoteId: clearActiveNote ? null : (activeNoteId ?? this.activeNoteId),
      search: search ?? this.search,
      selectedTagId: clearSelectedTag ? null : (selectedTagId ?? this.selectedTagId),
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
    );
  }

  List<Note> get visibleNotes {
    var current = notes;
    if (search.trim().isNotEmpty) {
      final query = search.toLowerCase();
      current = current
          .where(
            (n) =>
                n.title.toLowerCase().contains(query) ||
                n.content.toLowerCase().contains(query),
          )
          .toList();
    }
    if (selectedTagId != null) {
      final matching = noteTags
          .where((nt) => nt.tagId == selectedTagId)
          .map((nt) => nt.noteId)
          .toSet();
      current = current.where((n) => matching.contains(n.id)).toList();
    }
    current.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return current;
  }
}

class NotesController extends StateNotifier<NotesState> {
  NotesController(this._ref) : super(const NotesState());

  final Ref _ref;
  // TODO(supabase-restore): Restore: final _sync = SyncService();
  static const _uuid = Uuid();

  Future<void> init(String userId) async {
    final cached = loadCached();
    state = state.copyWith(
      notes: cached.notes,
      folders: cached.folders,
      tags: cached.tags,
      noteTags: cached.noteTags,
      activeNoteId: cached.notes.isNotEmpty ? cached.notes.first.id : null,
    );
    // TODO(supabase-restore): Restore: _sync.subscribe(userId, () => refresh(userId));
    // TODO(supabase-restore): Restore: await refresh(userId); (fetches from Supabase)
  }

  // TODO(supabase-restore): Restore full Supabase fetch in refresh().
  Future<void> refresh(String userId) async {
    final cached = loadCached();
    state = state.copyWith(
      notes: cached.notes,
      folders: cached.folders,
      tags: cached.tags,
      noteTags: cached.noteTags,
      activeNoteId: state.activeNoteId ?? (cached.notes.isNotEmpty ? cached.notes.first.id : null),
    );
  }

  // TODO(supabase-restore): Restore Supabase cursor pagination in loadMore().
  Future<void> loadMore(String userId) async {}

  Future<void> createNote(
    String userId, {
    String? folderId,
    String? title,
    String? content,
  }) async {
    final note = Note(
      id: _uuid.v4(),
      userId: userId,
      title: title ?? 'Untitled',
      content: content ?? '',
      folderId: folderId,
      createdAt: DateTime.now().toUtc(),
      updatedAt: DateTime.now().toUtc(),
    );
    state = state.copyWith(notes: [note, ...state.notes], activeNoteId: note.id);
    await _persist();
    // TODO(supabase-restore): Restore Supabase insert after local optimistic update.
  }

  Future<void> updateNote(
    String noteId, {
    String? title,
    String? content,
    String? folderId,
  }) async {
    final existing = _noteById(noteId);
    if (existing == null) return;
    final updated = existing.copyWith(
      title: title,
      content: content,
      folderId: folderId,
      updatedAt: DateTime.now().toUtc(),
    );
    state = state.copyWith(
      notes: [for (final n in state.notes) if (n.id == noteId) updated else n],
    );
    await _persist();
    // TODO(supabase-restore): Restore Supabase update after local optimistic update.
  }

  Future<void> deleteNote(String noteId) async {
    state = state.copyWith(
      notes: state.notes.where((n) => n.id != noteId).toList(),
      noteTags: state.noteTags.where((nt) => nt.noteId != noteId).toList(),
      clearActiveNote: state.activeNoteId == noteId,
    );
    await _persist();
    // TODO(supabase-restore): Restore: await supabase.from('notes').delete()...
  }

  Future<void> createFolder(String userId, String name, {String? parentId}) async {
    final folder = Folder(
      id: _uuid.v4(),
      userId: userId,
      name: name,
      parentId: parentId,
      createdAt: DateTime.now().toUtc(),
    );
    state = state.copyWith(folders: [...state.folders, folder]);
    await _persist();
    // TODO(supabase-restore): Restore Supabase insert.
  }

  Future<void> renameFolder(String folderId, String name) async {
    // TODO(supabase-restore): Restore: await supabase.from('folders').update(...)
    state = state.copyWith(
      folders: [
        for (final f in state.folders)
          if (f.id == folderId) f.copyWith(name: name) else f,
      ],
    );
    await _persist();
  }

  Future<void> deleteFolder(String folderId) async {
    // TODO(supabase-restore): Restore Supabase deletes for folder + notes un-foldering.
    state = state.copyWith(
      folders: state.folders.where((f) => f.id != folderId).toList(),
      notes: [
        for (final n in state.notes)
          if (n.folderId == folderId) n.copyWith(clearFolderId: true) else n,
      ],
    );
    await _persist();
  }

  Future<void> createTag(String userId, String name) async {
    final tag = Tag(
      id: _uuid.v4(),
      userId: userId,
      name: name,
      createdAt: DateTime.now().toUtc(),
    );
    state = state.copyWith(tags: [...state.tags, tag]);
    await _persist();
    // TODO(supabase-restore): Restore Supabase insert.
  }

  Future<void> deleteTag(String tagId) async {
    // TODO(supabase-restore): Restore Supabase deletes for note_tags + tags.
    state = state.copyWith(
      tags: state.tags.where((t) => t.id != tagId).toList(),
      noteTags: state.noteTags.where((nt) => nt.tagId != tagId).toList(),
      clearSelectedTag: state.selectedTagId == tagId,
    );
    await _persist();
  }

  Future<void> addTagToNote(String noteId, String tagId) async {
    // TODO(supabase-restore): Change back to _ref.read(authProvider)?.id
    final userId = _ref.read(authProvider) ?? 'local-dev-user';
    final exists = state.noteTags.any((nt) => nt.noteId == noteId && nt.tagId == tagId);
    if (exists) return;
    // TODO(supabase-restore): Restore Supabase insert for note_tags.
    state = state.copyWith(
      noteTags: [...state.noteTags, NoteTag(noteId: noteId, tagId: tagId, userId: userId)],
    );
    await _persist();
  }

  Future<void> removeTagFromNote(String noteId, String tagId) async {
    // TODO(supabase-restore): Restore: await supabase.from('note_tags').delete()...
    state = state.copyWith(
      noteTags: state.noteTags
          .where((nt) => !(nt.noteId == noteId && nt.tagId == tagId))
          .toList(),
    );
    await _persist();
  }

  void setActiveNote(String? noteId) => state = state.copyWith(activeNoteId: noteId);
  void setSearch(String value) => state = state.copyWith(search: value);
  void setSelectedTag(String? tagId) => state = state.copyWith(selectedTagId: tagId);

  void reset() {
    // TODO(supabase-restore): Restore: _sync.unsubscribe();
    state = const NotesState();
  }

  Note? _noteById(String noteId) {
    for (final note in state.notes) {
      if (note.id == noteId) return note;
    }
    return null;
  }

  Future<void> _persist() async {
    await saveAll(
      notes: state.notes,
      folders: state.folders,
      tags: state.tags,
      noteTags: state.noteTags,
    );
  }
}
