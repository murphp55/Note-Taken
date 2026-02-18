import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotesStore } from "../stores/notes-store";

export function NoteEditor() {
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const note = useMemo(() => notes.find((n) => n.id === activeNoteId) ?? null, [activeNoteId, notes]);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const handleUpdate = (patch: Parameters<typeof updateNote>[1]) => {
    if (!note) return;
    updateNote(note.id, patch).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Save failed");
    });
  };

  if (!note) {
    return <View style={styles.wrap} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={() => deleteNote(note.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </Pressable>
      </View>
      <TextInput
        style={styles.title}
        value={note.title}
        onChangeText={(text) => handleUpdate({ title: text })}
        placeholder="Title"
      />
      <TextInput
        style={styles.body}
        multiline
        value={note.content}
        onChangeText={(text) => handleUpdate({ content: text })}
        placeholder="Write your note..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 12, gap: 12 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  error: { flex: 1, fontSize: 12, color: "#EF4444" },
  deleteBtn: { padding: 4 },
  title: { fontSize: 28, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 8 },
  body: { flex: 1, fontSize: 16, textAlignVertical: "top" }
});
