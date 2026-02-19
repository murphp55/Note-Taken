import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../src/stores/auth-store";
import { useNotesStore } from "../src/stores/notes-store";
import { AIPromptBar } from "../src/components/ai-prompt-bar";

export default function RootLayout() {
  const initAuth = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const initNotes = useNotesStore((s) => s.init);
  const resetNotes = useNotesStore((s) => s.reset);

  // Track previous userId to detect logout (user transitions from a value to null)
  const prevUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!user?.id) return;
    initNotes(user.id);
  }, [initNotes, user?.id]);

  // On logout or session expiry: dispose realtime channels and clear local cache
  useEffect(() => {
    if (prevUserIdRef.current && !user?.id) {
      resetNotes();
    }
    prevUserIdRef.current = user?.id;
  }, [user?.id, resetNotes]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="new-note" />
        </Stack>
      </View>
      {!!user && <AIPromptBar />}
    </View>
  );
}
