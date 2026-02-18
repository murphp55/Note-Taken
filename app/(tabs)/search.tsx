import { StyleSheet, TextInput, View } from "react-native";
import { useNotesStore } from "../../src/stores/notes-store";
import { NotesList } from "../../src/components/notes-list";

export default function SearchScreen() {
  const search = useNotesStore((s) => s.search);
  const setSearch = useNotesStore((s) => s.setSearch);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Search note titles and content..."
      />
      <NotesList />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    margin: 12,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10
  }
});
