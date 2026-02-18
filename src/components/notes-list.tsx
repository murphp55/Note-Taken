import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useVisibleNotes } from "../hooks/use-visible-notes";
import { useAuthStore } from "../stores/auth-store";
import { useNotesStore } from "../stores/notes-store";

export function NotesList() {
  const notes = useVisibleNotes();
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const setActiveNote = useNotesStore((s) => s.setActiveNote);
  const hasMore = useNotesStore((s) => s.hasMore);
  const loadMoreNotes = useNotesStore((s) => s.loadMoreNotes);
  const userId = useAuthStore((s) => s.user?.id);

  return (
    <FlatList
      data={notes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const active = item.id === activeNoteId;
        return (
          <Pressable style={[styles.item, active && styles.itemActive]} onPress={() => setActiveNote(item.id)}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title || "Untitled"}
            </Text>
            <Text style={styles.time}>{new Date(item.updated_at).toLocaleString()}</Text>
          </Pressable>
        );
      }}
      ListFooterComponent={
        hasMore ? (
          <Pressable style={styles.loadMore} onPress={() => userId && loadMoreNotes(userId)}>
            <Text style={styles.loadMoreText}>Load more</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No notes found</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  item: { borderRadius: 10, borderWidth: 1, borderColor: "#D6D6D6", padding: 10, gap: 4 },
  itemActive: { borderColor: "#1D4ED8", backgroundColor: "#EFF6FF" },
  title: { fontSize: 15, fontWeight: "600", color: "#111827" },
  time: { fontSize: 12, color: "#6B7280" },
  emptyWrap: { padding: 24, alignItems: "center" },
  emptyText: { color: "#6B7280" },
  loadMore: { marginTop: 8, paddingVertical: 10, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: "#D1D5DB" },
  loadMoreText: { color: "#374151", fontWeight: "600" }
});
