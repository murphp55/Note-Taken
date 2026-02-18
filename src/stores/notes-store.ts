import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase";
import { localCache } from "../lib/storage";
import { SyncEngine } from "../lib/sync";
import { Folder, Note, NoteTag, Tag } from "../types/domain";

type NotesState = {
  loading: boolean;
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  noteTags: NoteTag[];
  activeNoteId: string | null;
  search: string;
  selectedTagId: string | null;
  setSearch: (search: string) => void;
  setSelectedTagId: (id: string | null) => void;
  setActiveNote: (id: string | null) => void;
  init: (userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
  createNote: (userId: string, folderId?: string | null) => Promise<void>;
  updateNote: (noteId: string, patch: Partial<Pick<Note, "title" | "content" | "folder_id">>) => Promise<void>;
  addTagToNote: (noteId: string, tagId: string) => Promise<void>;
};

const syncEngine = new SyncEngine();

export const useNotesStore = create<NotesState>((set, get) => ({
  loading: true,
  notes: localCache.getNotes(),
  folders: localCache.getFolders(),
  tags: localCache.getTags(),
  noteTags: localCache.getNoteTags(),
  activeNoteId: localCache.getActiveNoteId(),
  search: "",
  selectedTagId: null,
  setSearch: (search) => set({ search }),
  setSelectedTagId: (selectedTagId) => set({ selectedTagId }),
  setActiveNote: (activeNoteId) => {
    localCache.setActiveNoteId(activeNoteId);
    set({ activeNoteId });
  },
  init: async (userId: string) => {
    set({ loading: true });
    await get().refresh(userId);
    syncEngine.dispose();
    syncEngine.subscribe(userId, async () => {
      await get().refresh(userId);
    });
    set({ loading: false });
  },
  refresh: async (userId: string) => {
    await syncEngine.bootstrap(userId, {
      onNotes: (notes) => {
        localCache.setNotes(notes);
        set((state) => ({
          notes,
          activeNoteId: state.activeNoteId ?? notes[0]?.id ?? null
        }));
      },
      onFolders: (folders) => {
        localCache.setFolders(folders);
        set({ folders });
      },
      onTags: (tags) => {
        localCache.setTags(tags);
        set({ tags });
      },
      onNoteTags: (noteTags) => {
        localCache.setNoteTags(noteTags);
        set({ noteTags });
      }
    });
  },
  createNote: async (userId, folderId) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      user_id: userId,
      title: "Untitled",
      content: "",
      folder_id: folderId ?? null,
      created_at: now,
      updated_at: now
    };

    set((state) => ({ notes: [newNote, ...state.notes], activeNoteId: newNote.id }));
    localCache.setNotes(get().notes);
    localCache.setActiveNoteId(newNote.id);

    const { error } = await supabase.from("notes").insert(newNote);
    if (error) throw error;
  },
  updateNote: async (noteId, patch) => {
    const now = new Date().toISOString();
    set((state) => ({
      notes: state.notes.map((note) => (note.id === noteId ? { ...note, ...patch, updated_at: now } : note))
    }));
    localCache.setNotes(get().notes);
    const { error } = await supabase
      .from("notes")
      .update({ ...patch, updated_at: now })
      .eq("id", noteId);
    if (error) throw error;
  },
  addTagToNote: async (noteId, tagId) => {
    const existing = get().noteTags.some((item) => item.note_id === noteId && item.tag_id === tagId);
    if (existing) return;
    const newItem: NoteTag = { note_id: noteId, tag_id: tagId };
    set((state) => ({ noteTags: [...state.noteTags, newItem] }));
    localCache.setNoteTags(get().noteTags);
    const { error } = await supabase.from("note_tags").insert(newItem);
    if (error) throw error;
  }
}));
