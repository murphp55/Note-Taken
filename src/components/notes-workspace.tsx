import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { NotesList } from "./notes-list";
import { NoteEditor } from "./note-editor";
import { useAuthStore } from "../stores/auth-store";
import { useNotesStore } from "../stores/notes-store";

export function NotesWorkspace() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const userId = useAuthStore((s) => s.user?.id);
  const createNote = useNotesStore((s) => s.createNote);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const handleCreateNote = () => {
    if (!userId) return;
    createNote(userId).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to create note");
    });
  };

  const layout = useMemo(() => (isWide ? styles.horizontal : styles.vertical), [isWide]);

  return (
    <View style={[styles.root, layout]}>
      <View style={[styles.listWrap, isWide ? styles.listWide : styles.listMobile]}>
        <Pressable style={styles.newButton} onPress={handleCreateNote}>
          <Text style={styles.newButtonText}>New Note</Text>
        </Pressable>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <NotesList />
      </View>
      <View style={styles.editorWrap}>
        <NoteEditor />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  horizontal: { flexDirection: "row" },
  vertical: { flexDirection: "column" },
  listWrap: { borderRightWidth: 1, borderColor: "#E5E7EB" },
  listWide: { width: 340 },
  listMobile: { maxHeight: 300 },
  editorWrap: { flex: 1 },
  newButton: {
    margin: 12,
    marginBottom: 0,
    borderRadius: 8,
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    alignItems: "center"
  },
  newButtonText: { color: "#FFFFFF", fontWeight: "600" },
  error: { marginHorizontal: 12, marginTop: 6, fontSize: 12, color: "#EF4444" }
});
