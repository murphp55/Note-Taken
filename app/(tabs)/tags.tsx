import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/auth-store";
import { useNotesStore } from "../../src/stores/notes-store";

export default function TagsScreen() {
  const tags = useNotesStore((s) => s.tags);
  const selectedTagId = useNotesStore((s) => s.selectedTagId);
  const setSelectedTagId = useNotesStore((s) => s.setSelectedTagId);
  const createTag = useNotesStore((s) => s.createTag);
  const deleteTag = useNotesStore((s) => s.deleteTag);
  const userId = useAuthStore((s) => s.user?.id);

  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || !userId) return;
    createTag(userId, trimmed);
    setNewName("");
  };

  return (
    <FlatList
      data={tags}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.createRow}>
          <TextInput
            style={styles.createInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="New tag name..."
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <Pressable style={styles.addButton} onPress={handleCreate}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => {
        const active = selectedTagId === item.id;
        return (
          <View style={styles.row}>
            <Pressable
              style={[styles.tag, active && styles.tagActive]}
              onPress={() => setSelectedTagId(active ? null : item.id)}
            >
              <Text style={[styles.text, active && styles.textActive]}>{item.name}</Text>
            </Pressable>
            <Pressable onPress={() => deleteTag(item.id)} style={styles.deleteButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No tags yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  createRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  createInput: { flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  addButton: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  addButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  tagActive: { backgroundColor: "#111827", borderColor: "#111827" },
  text: { color: "#111827" },
  textActive: { color: "#FFFFFF" },
  deleteButton: { padding: 2 },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" }
});
