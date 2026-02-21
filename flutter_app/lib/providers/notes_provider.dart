import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/note.dart';
import '../services/local_cache.dart';
import '../services/supabase_service.dart';
import '../services/sync_service.dart';
import 'auth_provider.dart';

final notesStateProvider =
    StateNotifierProvider<NotesController, NotesState>((ref) {
  final controller = NotesController(ref);
  ref.listen<User?>(authProvider, (prev, next) {
    if (next == null) {
      controller.reset();
    } else if (prev?.id != next.id) {
      controller.init(next.id);
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
  final _sync = SyncService();
  static const _uuid = Uuid();
  static const _pageSize = 50;
  String? _cursor;

  Future<void> init(String userId) async {
    final cached = loadCached();
    state = state.copyWith(
      notes: cached.notes,
      folders: cached.folders,
      tags: cached.tags,
      noteTags: cached.noteTags,
      activeNoteId: cached.notes.isNotEmpty ? cached.notes.first.id : null,
    );

    _sync.subscribe(userId, () => refresh(userId));
    await refresh(userId);
  }

  Future<void> refresh(String userId) async {
    state = state.copyWith(isLoading: true);
    final notesResp = await supabase
        .from('notes')
        .select()
        .eq('user_id', userId)
        .order('updated_at', ascending: false)
        .limit(_pageSize);
    final foldersResp = await supabase
        .from('folders')
        .select()
        .eq('user_id', userId)
        .order('created_at');
    final tagsResp =
        await supabase.from('tags').select().eq('user_id', userId).order('name');
    final noteTagsResp = await supabase.from('note_tags').select().eq('user_id', userId);

    final notes = (notesResp as List)
        .map((e) => Note.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    final folders = (foldersResp as List)
        .map((e) => Folder.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    final tags = (tagsResp as List)
        .map((e) => Tag.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    final noteTags = (noteTagsResp as List)
        .map((e) => NoteTag.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();

    _cursor = notes.isNotEmpty ? notes.last.updatedAt.toIso8601String() : null;
    state = state.copyWith(
      notes: notes,
      folders: folders,
      tags: tags,
      noteTags: noteTags,
      isLoading: false,
      hasMore: notes.length == _pageSize,
      activeNoteId: state.activeNoteId ?? (notes.isNotEmpty ? notes.first.id : null),
    );
    await saveAll(notes: notes, folders: folders, tags: tags, noteTags: noteTags);
  }

  Future<void> loadMore(String userId) async {
    final cursor = _cursor;
    if (cursor == null || state.isLoading) return;
    state = state.copyWith(isLoading: true);
    final response = await supabase
        .from('notes')
        .select()
        .eq('user_id', userId)
        .lt('updated_at', cursor)
        .order('updated_at', ascending: false)
        .limit(_pageSize);
    final more = (response as List)
        .map((e) => Note.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    if (more.isNotEmpty) {
      _cursor = more.last.updatedAt.toIso8601String();
    }
    final merged = [...state.notes, ...more];
    state = state.copyWith(
      notes: merged,
      isLoading: false,
      hasMore: more.length == _pageSize,
    );
    await saveAll(
      notes: merged,
      folders: state.folders,
      tags: state.tags,
      noteTags: state.noteTags,
    );
  }

  Future<void> createNote(
    String userId, {
    String? folderId,
    String? title,
    String? content,
  }) async {
    final optimistic = Note(
      id: _uuid.v4(),
      userId: userId,
      title: title ?? 'Untitled',
      content: content ?? '',
      folderId: folderId,
      createdAt: DateTime.now().toUtc(),
      updatedAt: DateTime.now().toUtc(),
    );
    state = state.copyWith(notes: [optimistic, ...state.notes], activeNoteId: optimistic.id);
    await _persist();

    final inserted = await supabase
        .from('notes')
        .insert({
          'id': optimistic.id,
          'user_id': userId,
          'title': optimistic.title,
          'content': optimistic.content,
          'folder_id': optimistic.folderId,
        })
        .select()
        .single();

    final note = Note.fromJson(Map<String, dynamic>.from(inserted));
    state = state.copyWith(
      notes: [for (final n in state.notes) if (n.id == note.id) note else n],
      activeNoteId: note.id,
    );
    await _persist();
  }

  Future<void> updateNote(
    String noteId, {
    String? title,
    String? content,
    String? folderId,
  }) async {
    final existing = _noteById(noteId);
    if (existing == null) return;
    final optimistic = existing.copyWith(
      title: title,
      content: content,
      folderId: folderId,
      updatedAt: DateTime.now().toUtc(),
    );
    state = state.copyWith(
      notes: [for (final n in state.notes) if (n.id == noteId) optimistic else n],
    );
    await _persist();

    final updates = <String, dynamic>{'updated_at': DateTime.now().toUtc().toIso8601String()};
    if (title != null) updates['title'] = title;
    if (content != null) updates['content'] = content;
    if (folderId != null) updates['folder_id'] = folderId;
    final updated = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)
        .eq('user_id', existing.userId)
        .select()
        .single();

    final note = Note.fromJson(Map<String, dynamic>.from(updated));
    state = state.copyWith(
      notes: [for (final n in state.notes) if (n.id == noteId) note else n],
    );
    await _persist();
  }

  Future<void> deleteNote(String noteId) async {
    final existing = _noteById(noteId);
    if (existing == null) return;
    state = state.copyWith(
      notes: state.notes.where((n) => n.id != noteId).toList(),
      noteTags: state.noteTags.where((nt) => nt.noteId != noteId).toList(),
      clearActiveNote: state.activeNoteId == noteId,
    );
    await _persist();
    await supabase.from('notes').delete().eq('id', noteId).eq('user_id', existing.userId);
  }

  Future<void> createFolder(String userId, String name, {String? parentId}) async {
    final inserted = await supabase
        .from('folders')
        .insert({'user_id': userId, 'name': name, 'parent_id': parentId})
        .select()
        .single();
    final folder = Folder.fromJson(Map<String, dynamic>.from(inserted));
    state = state.copyWith(folders: [...state.folders, folder]);
    await _persist();
  }

  Future<void> renameFolder(String folderId, String name) async {
    await supabase.from('folders').update({'name': name}).eq('id', folderId);
    state = state.copyWith(
      folders: [
        for (final f in state.folders)
          if (f.id == folderId) f.copyWith(name: name) else
            f,
      ],
    );
    await _persist();
  }

  Future<void> deleteFolder(String folderId) async {
    await supabase.from('notes').update({'folder_id': null}).eq('folder_id', folderId);
    await supabase.from('folders').delete().eq('id', folderId);
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
    final inserted =
        await supabase.from('tags').insert({'user_id': userId, 'name': name}).select().single();
    final tag = Tag.fromJson(Map<String, dynamic>.from(inserted));
    state = state.copyWith(tags: [...state.tags, tag]);
    await _persist();
  }

  Future<void> deleteTag(String tagId) async {
    await supabase.from('note_tags').delete().eq('tag_id', tagId);
    await supabase.from('tags').delete().eq('id', tagId);
    state = state.copyWith(
      tags: state.tags.where((t) => t.id != tagId).toList(),
      noteTags: state.noteTags.where((nt) => nt.tagId != tagId).toList(),
      clearSelectedTag: state.selectedTagId == tagId,
    );
    await _persist();
  }

  Future<void> addTagToNote(String noteId, String tagId) async {
    final user = _ref.read(authProvider);
    if (user == null) return;
    final exists = state.noteTags.any((nt) => nt.noteId == noteId && nt.tagId == tagId);
    if (exists) return;
    await supabase.from('note_tags').insert({'note_id': noteId, 'tag_id': tagId, 'user_id': user.id});
    state = state.copyWith(
      noteTags: [...state.noteTags, NoteTag(noteId: noteId, tagId: tagId, userId: user.id)],
    );
    await _persist();
  }

  Future<void> removeTagFromNote(String noteId, String tagId) async {
    await supabase.from('note_tags').delete().eq('note_id', noteId).eq('tag_id', tagId);
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
    _sync.unsubscribe();
    _cursor = null;
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
