class Note {
  const Note({
    required this.id,
    required this.userId,
    required this.title,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
    this.folderId,
  });

  final String id;
  final String userId;
  final String title;
  final String content;
  final String? folderId;
  final DateTime createdAt;
  final DateTime updatedAt;

  Note copyWith({
    String? title,
    String? content,
    String? folderId,
    bool clearFolderId = false,
    DateTime? updatedAt,
  }) {
    return Note(
      id: id,
      userId: userId,
      title: title ?? this.title,
      content: content ?? this.content,
      folderId: clearFolderId ? null : (folderId ?? this.folderId),
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: (json['title'] as String?) ?? '',
      content: (json['content'] as String?) ?? '',
      folderId: json['folder_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'title': title,
      'content': content,
      'folder_id': folderId,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

class Folder {
  const Folder({
    required this.id,
    required this.userId,
    required this.name,
    required this.createdAt,
    this.parentId,
  });

  final String id;
  final String userId;
  final String name;
  final String? parentId;
  final DateTime createdAt;

  factory Folder.fromJson(Map<String, dynamic> json) {
    return Folder(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String,
      parentId: json['parent_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'parent_id': parentId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class Tag {
  const Tag({
    required this.id,
    required this.userId,
    required this.name,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String name;
  final DateTime createdAt;

  factory Tag.fromJson(Map<String, dynamic> json) {
    return Tag(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class NoteTag {
  const NoteTag({
    required this.noteId,
    required this.tagId,
    required this.userId,
  });

  final String noteId;
  final String tagId;
  final String userId;

  factory NoteTag.fromJson(Map<String, dynamic> json) {
    return NoteTag(
      noteId: json['note_id'] as String,
      tagId: json['tag_id'] as String,
      userId: json['user_id'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'note_id': noteId,
      'tag_id': tagId,
      'user_id': userId,
    };
  }
}

class ApiKeyRecord {
  const ApiKeyRecord({
    required this.id,
    required this.name,
    required this.createdAt,
    this.lastUsedAt,
  });

  final String id;
  final String name;
  final DateTime createdAt;
  final DateTime? lastUsedAt;

  factory ApiKeyRecord.fromJson(Map<String, dynamic> json) {
    return ApiKeyRecord(
      id: json['id'] as String,
      name: (json['name'] as String?) ?? 'Key',
      createdAt: DateTime.parse(json['created_at'] as String),
      lastUsedAt: json['last_used_at'] == null
          ? null
          : DateTime.parse(json['last_used_at'] as String),
    );
  }
}
