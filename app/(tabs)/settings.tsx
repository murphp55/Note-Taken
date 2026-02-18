import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "../../src/stores/auth-store";
import { ENV } from "../../src/lib/env";

export default function SettingsScreen() {
  const session = useAuthStore((s) => s.session);

  const createApiKey = async () => {
    if (!session?.access_token) return;
    const res = await fetch(`${ENV.APP_API_BASE_URL}/v1/keys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    const data = await res.json();
    if (!data.apiKey) {
      Alert.alert("Error", data.error ?? "Failed to create key");
      return;
    }
    await Clipboard.setStringAsync(data.apiKey);
    Alert.alert("API key created", "The key is copied to clipboard.");
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.text}>Generate a personal API key to call the notes API from Claude externally.</Text>
      <Pressable style={styles.button} onPress={createApiKey}>
        <Text style={styles.buttonText}>Generate API Key</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 24, fontWeight: "700", color: "#111827" },
  text: { color: "#4B5563" },
  button: { borderRadius: 10, backgroundColor: "#111827", paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "600" }
});
