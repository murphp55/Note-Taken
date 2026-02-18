import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNotesStore } from "../../src/stores/notes-store";

export default function FoldersScreen() {
  const folders = useNotesStore((s) => s.folders);
  const notes = useNotesStore((s) => s.notes);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);

  return (
    <FlatList
      data={folders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const folderNotes = notes.filter((note) => note.folder_id === item.id);
        return (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            {folderNotes.slice(0, 5).map((note) => (
              <Pressable key={note.id} onPress={() => setActiveNote(note.id)}>
                <Text style={styles.noteTitle}>{note.title || "Untitled"}</Text>
              </Pressable>
            ))}
          </View>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No folders yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 10 },
  card: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, gap: 6 },
  name: { fontWeight: "700", color: "#111827" },
  noteTitle: { color: "#374151" },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" }
});
