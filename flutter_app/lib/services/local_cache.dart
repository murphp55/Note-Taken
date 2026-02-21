import 'package:hive/hive.dart';
import 'package:path_provider/path_provider.dart';

import '../models/note.dart';

Future<void> initHive() async {
  // Use AppData/Roaming — avoids OneDrive locking files in the Documents folder
  final dir = await getApplicationSupportDirectory();
  Hive.init(dir.path);
  await Hive.openBox<Map>('notes');
  await Hive.openBox<Map>('folders');
  await Hive.openBox<Map>('tags');
  await Hive.openBox<Map>('note_tags');
}

Future<void> saveAll({
  required List<Note> notes,
  required List<Folder> folders,
  required List<Tag> tags,
  required List<NoteTag> noteTags,
}) async {
  final notesBox = Hive.box<Map>('notes');
  final foldersBox = Hive.box<Map>('folders');
  final tagsBox = Hive.box<Map>('tags');
  final noteTagsBox = Hive.box<Map>('note_tags');

  await notesBox.clear();
  await foldersBox.clear();
  await tagsBox.clear();
  await noteTagsBox.clear();

  await notesBox.putAll({for (final n in notes) n.id: n.toJson()});
  await foldersBox.putAll({for (final f in folders) f.id: f.toJson()});
  await tagsBox.putAll({for (final t in tags) t.id: t.toJson()});
  await noteTagsBox.putAll({
    for (final nt in noteTags) '${nt.noteId}:${nt.tagId}': nt.toJson(),
  });
}

({List<Note> notes, List<Folder> folders, List<Tag> tags, List<NoteTag> noteTags})
    loadCached() {
  final notesBox = Hive.box<Map>('notes');
  final foldersBox = Hive.box<Map>('folders');
  final tagsBox = Hive.box<Map>('tags');
  final noteTagsBox = Hive.box<Map>('note_tags');

  final notes = notesBox.values
      .map((e) => Note.fromJson(Map<String, dynamic>.from(e)))
      .toList();
  final folders = foldersBox.values
      .map((e) => Folder.fromJson(Map<String, dynamic>.from(e)))
      .toList();
  final tags = tagsBox.values
      .map((e) => Tag.fromJson(Map<String, dynamic>.from(e)))
      .toList();
  final noteTags = noteTagsBox.values
      .map((e) => NoteTag.fromJson(Map<String, dynamic>.from(e)))
      .toList();

  return (notes: notes, folders: folders, tags: tags, noteTags: noteTags);
}
