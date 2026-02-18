import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuthStore } from "../stores/auth-store";
import { useNotesStore } from "../stores/notes-store";
import { ENV } from "../lib/env";

export function AIPromptBar() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const session = useAuthStore((s) => s.session);
  const notes = useNotesStore((s) => s.notes);
  const noteTags = useNotesStore((s) => s.noteTags);
  const tags = useNotesStore((s) => s.tags);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const refresh = useNotesStore((s) => s.refresh);
  const userId = useAuthStore((s) => s.user?.id);

  const context = useMemo(
    () => ({
      activeNoteId,
      notes: notes.map((n) => ({ id: n.id, title: n.title, content: n.content, updated_at: n.updated_at })),
      tags,
      noteTags
    }),
    [activeNoteId, noteTags, notes, tags]
  );

  const runPrompt = async () => {
    if (!prompt.trim() || !session?.access_token || !userId) return;
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch(`${ENV.APP_API_BASE_URL}/v1/ai/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ instruction: prompt, context })
      });
      const data = await res.json();
      setResponse(data.summary ?? "Done.");
      await refresh(userId);
      setPrompt("");
    } catch (error) {
      setResponse(error instanceof Error ? error.message : "Failed to execute command.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        placeholder='Ask Claude to act on notes, e.g. "summarize fitness notes"'
        value={prompt}
        onChangeText={setPrompt}
      />
      <Pressable style={styles.button} disabled={loading} onPress={runPrompt}>
        <Text style={styles.buttonText}>{loading ? "Running..." : "Run"}</Text>
      </Pressable>
      {!!response && <Text style={styles.response}>{response}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FAFAFA",
    gap: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  button: {
    alignSelf: "flex-end",
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buttonText: { color: "#FFFFFF", fontWeight: "600" },
  response: { color: "#374151", fontSize: 12 }
});
