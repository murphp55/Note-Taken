import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/auth-store";
import { useNotesStore } from "../../src/stores/notes-store";

export default function FoldersScreen() {
  const folders = useNotesStore((s) => s.folders);
  const notes = useNotesStore((s) => s.notes);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const createFolder = useNotesStore((s) => s.createFolder);
  const renameFolder = useNotesStore((s) => s.renameFolder);
  const deleteFolder = useNotesStore((s) => s.deleteFolder);
  const userId = useAuthStore((s) => s.user?.id);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || !userId) return;
    createFolder(userId, trimmed);
    setNewName("");
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && editingId) {
      renameFolder(editingId, trimmed);
    }
    setEditingId(null);
  };

  return (
    <FlatList
      data={folders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.createRow}>
          <TextInput
            style={styles.createInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="New folder name..."
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <Pressable style={styles.addButton} onPress={handleCreate}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => {
        const folderNotes = notes.filter((note) => note.folder_id === item.id);
        const isEditing = editingId === item.id;
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              {isEditing ? (
                <TextInput
                  style={styles.renameInput}
                  value={editName}
                  onChangeText={setEditName}
                  onBlur={commitRename}
                  onSubmitEditing={commitRename}
                  autoFocus
                  returnKeyType="done"
                />
              ) : (
                <Text style={styles.name}>{item.name}</Text>
              )}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => (isEditing ? commitRename() : startEdit(item.id, item.name))}
                  style={styles.iconButton}
                >
                  <Ionicons name={isEditing ? "checkmark-outline" : "pencil-outline"} size={18} color="#6B7280" />
                </Pressable>
                <Pressable onPress={() => deleteFolder(item.id)} style={styles.iconButton}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </View>
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
  createRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  createInput: { flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  addButton: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  addButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  card: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, gap: 6 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontWeight: "700", color: "#111827" },
  renameInput: { flex: 1, borderWidth: 1, borderColor: "#93C5FD", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 4 },
  iconButton: { padding: 4 },
  noteTitle: { color: "#374151" },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" }
});
