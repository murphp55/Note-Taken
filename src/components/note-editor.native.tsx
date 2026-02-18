import { useEffect, useMemo } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { RichText, useEditorBridge } from "@10play/tentap-editor";
import { useNotesStore } from "../stores/notes-store";

export function NoteEditor() {
  const notes = useNotesStore((s) => s.notes);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const updateNote = useNotesStore((s) => s.updateNote);
  const note = useMemo(() => notes.find((n) => n.id === activeNoteId) ?? null, [activeNoteId, notes]);

  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent: note?.content ?? ""
  });

  useEffect(() => {
    if (!note) return;
    if (typeof editor.setContent === "function") {
      editor.setContent(note.content || "");
    }
    editor.setOnChange(() => {
      updateNote(note.id, { content: editor.getHTML() });
    });
  }, [editor, note, updateNote]);

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
      <RichText editor={editor} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 12, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 8 }
});
