import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuthStore } from "../stores/auth-store";
import { useNotesStore } from "../stores/notes-store";
import { ENV } from "../lib/env";

type SseEvent =
  | { type: "summary_delta"; text: string }
  | { type: "done"; summary: string; ops: unknown[] }
  | { type: "error"; message: string };

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
      if (Platform.OS === "web") {
        await runStreaming(session.access_token, userId);
      } else {
        await runBatch(session.access_token, userId);
      }
    } catch (error) {
      setResponse(error instanceof Error ? error.message : "Failed to execute command.");
    } finally {
      setLoading(false);
    }
  };

  const runStreaming = async (token: string, uid: string) => {
    const res = await fetch(`${ENV.APP_API_BASE_URL}/v1/ai/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ instruction: prompt, context })
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({ error: "Stream request failed" }));
      setResponse((data as { error?: string }).error ?? "Stream request failed");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotDelta = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE lines are separated by \n; events are separated by \n\n.
      // Keep the last incomplete line in the buffer.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice("data: ".length);
        try {
          const event = JSON.parse(jsonStr) as SseEvent;
          if (event.type === "summary_delta") {
            gotDelta = true;
            setResponse((prev) => prev + event.text);
          } else if (event.type === "done") {
            // Use summary as fallback in case no deltas arrived (e.g. empty summary field).
            if (!gotDelta) setResponse(event.summary || "Done.");
            await refresh(uid);
            setPrompt("");
          } else if (event.type === "error") {
            setResponse(event.message || "Execution failed.");
          }
        } catch {
          // Skip malformed SSE data lines.
        }
      }
    }
  };

  const runBatch = async (token: string, uid: string) => {
    const res = await fetch(`${ENV.APP_API_BASE_URL}/v1/ai/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ instruction: prompt, context })
    });
    const data = (await res.json()) as { summary?: string; error?: string };
    if (!res.ok) {
      setResponse(data.error ?? "Execution failed.");
      return;
    }
    setResponse(data.summary ?? "Done.");
    await refresh(uid);
    setPrompt("");
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
