import { useMemo } from "react";
import { useNotesStore } from "../stores/notes-store";

export function useVisibleNotes() {
  const notes = useNotesStore((s) => s.notes);
  const search = useNotesStore((s) => s.search).trim().toLowerCase();
  const selectedTagId = useNotesStore((s) => s.selectedTagId);
  const noteTags = useNotesStore((s) => s.noteTags);

  return useMemo(() => {
    let output = notes;

    if (selectedTagId) {
      const noteIdSet = new Set(noteTags.filter((nt) => nt.tag_id === selectedTagId).map((nt) => nt.note_id));
      output = output.filter((note) => noteIdSet.has(note.id));
    }

    if (search) {
      output = output.filter((note) => {
        const title = note.title.toLowerCase();
        const body = note.content.toLowerCase();
        return title.includes(search) || body.includes(search);
      });
    }

    return output;
  }, [notes, noteTags, search, selectedTagId]);
}
