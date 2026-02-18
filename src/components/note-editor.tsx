import { useMemo } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useNotesStore } from "../stores/notes-store";

export function NoteEditor() {
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const updateNote = useNotesStore((s) => s.updateNote);
  const note = useMemo(() => notes.find((n) => n.id === activeNoteId) ?? null, [activeNoteId, notes]);

  if (!note) {
    return <View style={styles.wrap} />;
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.title}
        value={note.title}
        onChangeText={(text) => updateNote(note.id, { title: text })}
        placeholder="Title"
      />
      <TextInput
        style={styles.body}
        multiline
        value={note.content}
        onChangeText={(text) => updateNote(note.id, { content: text })}
        placeholder="Write your note..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 12, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 8 },
  body: { flex: 1, fontSize: 16, textAlignVertical: "top" }
});
