import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase";
import { localCache } from "../lib/storage";
import { SyncEngine } from "../lib/sync";
import { Folder, Note, NoteTag, Tag } from "../types/domain";

type NotesState = {
  loading: boolean;
  hasMore: boolean;
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
  loadMoreNotes: (userId: string) => Promise<void>;
  reset: () => void;
  createNote: (userId: string, folderId?: string | null, title?: string, content?: string) => Promise<void>;
  updateNote: (noteId: string, patch: Partial<Pick<Note, "title" | "content" | "folder_id">>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  addTagToNote: (noteId: string, tagId: string) => Promise<void>;
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>;
  createFolder: (userId: string, name: string, parentId?: string | null) => Promise<void>;
  renameFolder: (folderId: string, name: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  createTag: (userId: string, name: string) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
};

const syncEngine = new SyncEngine();

export const useNotesStore = create<NotesState>((set, get) => ({
  loading: true,
  hasMore: false,
  notes: localCache.getNotes(),
  folders: localCache.getFolders(),
  tags: localCache.getTags(),
  noteTags: localCache.getNoteTags(),
  activeNoteId: localCache.getActiveNoteId(),
  search: "",
  selectedTagId: null,
  setSearch: (search) => set({ search }),
  reset: () => {
    syncEngine.dispose();
    localCache.setNotes([]);
    localCache.setFolders([]);
    localCache.setTags([]);
    localCache.setNoteTags([]);
    localCache.setActiveNoteId(null);
    set({ notes: [], folders: [], tags: [], noteTags: [], activeNoteId: null, loading: false });
  },
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
    const { hasMore } = await syncEngine.bootstrap(userId, {
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
    set({ hasMore });
  },
  loadMoreNotes: async (userId: string) => {
    const allNotes = get().notes;
    if (!allNotes.length) return;
    const cursor = allNotes[allNotes.length - 1].updated_at;
    const { hasMore } = await syncEngine.loadMore(userId, cursor, (newNotes) => {
      const combined = [...get().notes, ...newNotes];
      localCache.setNotes(combined);
      set({ notes: combined });
    });
    set({ hasMore });
  },
  createNote: async (userId, folderId, title, content) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      user_id: userId,
      title: title?.trim() || "Untitled",
      content: content ?? "",
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
  deleteNote: async (noteId) => {
    const remaining = get().notes.filter((n) => n.id !== noteId);
    const newActiveId = get().activeNoteId === noteId ? (remaining[0]?.id ?? null) : get().activeNoteId;
    set({
      notes: remaining,
      activeNoteId: newActiveId,
      noteTags: get().noteTags.filter((nt) => nt.note_id !== noteId)
    });
    localCache.setNotes(remaining);
    localCache.setActiveNoteId(newActiveId);
    localCache.setNoteTags(get().noteTags);
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
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
  },
  removeTagFromNote: async (noteId, tagId) => {
    set((state) => ({
      noteTags: state.noteTags.filter((nt) => !(nt.note_id === noteId && nt.tag_id === tagId))
    }));
    localCache.setNoteTags(get().noteTags);
    const { error } = await supabase.from("note_tags").delete().eq("note_id", noteId).eq("tag_id", tagId);
    if (error) throw error;
  },
  createFolder: async (userId, name, parentId) => {
    const now = new Date().toISOString();
    const newFolder: Folder = {
      id: uuidv4(),
      user_id: userId,
      name,
      parent_id: parentId ?? null,
      created_at: now
    };
    set((state) => ({
      folders: [...state.folders, newFolder].sort((a, b) => a.name.localeCompare(b.name))
    }));
    localCache.setFolders(get().folders);
    const { error } = await supabase.from("folders").insert(newFolder);
    if (error) throw error;
  },
  renameFolder: async (folderId, name) => {
    set((state) => ({
      folders: state.folders
        .map((f) => (f.id === folderId ? { ...f, name } : f))
        .sort((a, b) => a.name.localeCompare(b.name))
    }));
    localCache.setFolders(get().folders);
    const { error } = await supabase.from("folders").update({ name }).eq("id", folderId);
    if (error) throw error;
  },
  deleteFolder: async (folderId) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folderId),
      // DB sets folder_id to null on cascade; mirror that locally
      notes: state.notes.map((n) => (n.folder_id === folderId ? { ...n, folder_id: null } : n))
    }));
    localCache.setFolders(get().folders);
    localCache.setNotes(get().notes);
    const { error } = await supabase.from("folders").delete().eq("id", folderId);
    if (error) throw error;
  },
  createTag: async (userId, name) => {
    const newTag: Tag = { id: uuidv4(), user_id: userId, name };
    set((state) => ({
      tags: [...state.tags, newTag].sort((a, b) => a.name.localeCompare(b.name))
    }));
    localCache.setTags(get().tags);
    const { error } = await supabase.from("tags").insert(newTag);
    if (error) throw error;
  },
  deleteTag: async (tagId) => {
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== tagId),
      noteTags: state.noteTags.filter((nt) => nt.tag_id !== tagId),
      selectedTagId: state.selectedTagId === tagId ? null : state.selectedTagId
    }));
    localCache.setTags(get().tags);
    localCache.setNoteTags(get().noteTags);
    // DB cascades deletion of note_tags rows; no separate delete needed
    const { error } = await supabase.from("tags").delete().eq("id", tagId);
    if (error) throw error;
  }
}));
