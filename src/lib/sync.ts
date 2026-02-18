import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { localCache } from "./storage";
import { Note, Folder, Tag, NoteTag } from "../types/domain";

const PAGE_SIZE = 200;

type SyncCallbacks = {
  onNotes: (notes: Note[]) => void;
  onFolders: (folders: Folder[]) => void;
  onTags: (tags: Tag[]) => void;
  onNoteTags: (noteTags: NoteTag[]) => void;
};

export const mergeLww = (local: Note[], remote: Note[]): Note[] => {
  const map = new Map<string, Note>();
  for (const item of local) {
    map.set(item.id, item);
  }
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    if (new Date(item.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
};

export class SyncEngine {
  private channels: RealtimeChannel[] = [];

  async bootstrap(userId: string, cb: SyncCallbacks): Promise<{ hasMore: boolean }> {
    const [notesRes, foldersRes, tagsRes, noteTagsRes] = await Promise.all([
      supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase.from("folders").select("*").eq("user_id", userId).order("name", { ascending: true }),
      supabase.from("tags").select("*").eq("user_id", userId).order("name", { ascending: true }),
      supabase.from("note_tags").select("note_id, tag_id")
    ]);

    const mergedNotes = mergeLww(localCache.getNotes(), (notesRes.data ?? []) as Note[]);
    cb.onNotes(mergedNotes);
    cb.onFolders((foldersRes.data ?? []) as Folder[]);
    cb.onTags((tagsRes.data ?? []) as Tag[]);
    cb.onNoteTags((noteTagsRes.data ?? []) as NoteTag[]);

    return { hasMore: (notesRes.data?.length ?? 0) === PAGE_SIZE };
  }

  async loadMore(
    userId: string,
    cursor: string,
    onNotes: (notes: Note[]) => void
  ): Promise<{ hasMore: boolean }> {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .lt("updated_at", cursor)
      .limit(PAGE_SIZE);

    onNotes((data ?? []) as Note[]);
    return { hasMore: (data?.length ?? 0) === PAGE_SIZE };
  }

  subscribe(userId: string, refresh: () => Promise<void>): void {
    const noteChannel = supabase
      .channel(`notes:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();

    const folderChannel = supabase
      .channel(`folders:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "folders", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();

    const tagChannel = supabase
      .channel(`tags:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tags", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();

    // note_tags has no user_id column and cannot be filtered at the subscription level.
    // Subscribing without a filter fires for every authenticated user's tag changes.
    // Cross-device note_tag changes are picked up on the next notes or tags refresh instead.
    this.channels.push(noteChannel, folderChannel, tagChannel);
  }

  dispose(): void {
    this.channels.forEach((ch) => supabase.removeChannel(ch));
    this.channels = [];
  }
}
