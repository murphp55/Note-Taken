export type UUID = string;

export interface Folder {
  id: UUID;
  user_id: UUID;
  name: string;
  parent_id: UUID | null;
  created_at: string;
}

export interface Tag {
  id: UUID;
  user_id: UUID;
  name: string;
}

export interface Note {
  id: UUID;
  user_id: UUID;
  title: string;
  content: string;
  folder_id: UUID | null;
  created_at: string;
  updated_at: string;
}

export interface NoteTag {
  note_id: UUID;
  tag_id: UUID;
}

export interface ExternalApiKey {
  id: UUID;
  user_id: UUID;
  key_hash: string;
  created_at: string;
  last_used_at: string | null;
}
