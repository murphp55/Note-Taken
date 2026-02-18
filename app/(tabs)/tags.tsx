import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useNotesStore } from "../../src/stores/notes-store";

export default function TagsScreen() {
  const tags = useNotesStore((s) => s.tags);
  const selectedTagId = useNotesStore((s) => s.selectedTagId);
  const setSelectedTagId = useNotesStore((s) => s.setSelectedTagId);

  return (
    <FlatList
      data={tags}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const active = selectedTagId === item.id;
        return (
          <Pressable style={[styles.tag, active && styles.tagActive]} onPress={() => setSelectedTagId(active ? null : item.id)}>
            <Text style={[styles.text, active && styles.textActive]}>{item.name}</Text>
          </Pressable>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No tags yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  tag: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  tagActive: { backgroundColor: "#111827", borderColor: "#111827" },
  text: { color: "#111827" },
  textActive: { color: "#FFFFFF" },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" }
});
