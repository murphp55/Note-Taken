import { useEffect } from "react";
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

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!user?.id) return;
    initNotes(user.id);
  }, [initNotes, user?.id]);

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
        </Stack>
      </View>
      {!!user && <AIPromptBar />}
    </View>
  );
}
