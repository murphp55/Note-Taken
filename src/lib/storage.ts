import { MMKV } from "react-native-mmkv";
import { Note, Folder, Tag, NoteTag } from "../types/domain";

const storage = new MMKV({ id: "notetaken" });

const KEYS = {
  notes: "cache.notes",
  folders: "cache.folders",
  tags: "cache.tags",
  noteTags: "cache.noteTags",
  activeNoteId: "ui.activeNoteId"
};

function readJSON<T>(key: string, fallback: T): T {
  const value = storage.getString(key);
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export const localCache = {
  getNotes: () => readJSON<Note[]>(KEYS.notes, []),
  setNotes: (notes: Note[]) => writeJSON(KEYS.notes, notes),
  getFolders: () => readJSON<Folder[]>(KEYS.folders, []),
  setFolders: (folders: Folder[]) => writeJSON(KEYS.folders, folders),
  getTags: () => readJSON<Tag[]>(KEYS.tags, []),
  setTags: (tags: Tag[]) => writeJSON(KEYS.tags, tags),
  getNoteTags: () => readJSON<NoteTag[]>(KEYS.noteTags, []),
  setNoteTags: (noteTags: NoteTag[]) => writeJSON(KEYS.noteTags, noteTags),
  getActiveNoteId: () => storage.getString(KEYS.activeNoteId) ?? null,
  setActiveNoteId: (id: string | null) => {
    if (!id) {
      storage.delete(KEYS.activeNoteId);
      return;
    }
    storage.set(KEYS.activeNoteId, id);
  }
};
