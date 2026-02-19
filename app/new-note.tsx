import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../src/stores/auth-store";
import { useNotesStore } from "../src/stores/notes-store";

/**
 * Deep-link entry point for Android App Actions / Gemini on Pixel.
 *
 * Gemini opens:  notetaken://new-note?title=Meeting%20notes&content=...
 * This screen creates the note immediately and redirects to the notes list.
 *
 * If the user isn't signed in, they're sent to the login screen first;
 * the deep link is lost (acceptable — notes require auth).
 */
export default function NewNoteScreen() {
  const { title, content } = useLocalSearchParams<{ title?: string; content?: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const createNote = useNotesStore((s) => s.createNote);
  const done = useRef(false);

  useEffect(() => {
    if (authLoading || done.current) return;
    done.current = true;

    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    createNote(user.id, null, title, content)
      .then(() => router.replace("/(tabs)/"))
      .catch(() => router.replace("/(tabs)/"));
  }, [authLoading, user]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#111827" />
      <Text style={styles.text}>Creating note…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#F9FAFB" },
  text: { color: "#6B7280", fontSize: 15 }
});
