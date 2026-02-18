import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "../../src/stores/auth-store";
import { ENV } from "../../src/lib/env";

type ApiKey = { id: string; created_at: string; last_used_at: string | null };

export default function SettingsScreen() {
  const session = useAuthStore((s) => s.session);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [generating, setGenerating] = useState(false);

  const fetchKeys = async () => {
    if (!session?.access_token) return;
    const res = await fetch(`${ENV.APP_API_BASE_URL}/v1/keys`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys ?? []);
    }
  };

  useEffect(() => {
    fetchKeys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const createApiKey = async () => {
    if (!session?.access_token) return;
    setGenerating(true);
    try {
      const res = await fetch(`${ENV.APP_API_BASE_URL}/v1/keys`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (!data.apiKey) {
        Alert.alert("Error", data.error ?? "Failed to create key");
        return;
      }
      await Clipboard.setStringAsync(data.apiKey);
      Alert.alert("API key created", "The key has been copied to your clipboard.");
      await fetchKeys();
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!session?.access_token) return;
    const res = await fetch(`${ENV.APP_API_BASE_URL}/v1/keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } else {
      const data = await res.json();
      Alert.alert("Error", data.error ?? "Failed to revoke key");
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.text}>Generate a personal API key to call the notes API from Claude externally.</Text>
      <Pressable style={[styles.button, generating && styles.buttonDisabled]} onPress={createApiKey} disabled={generating}>
        <Text style={styles.buttonText}>{generating ? "Generating..." : "Generate API Key"}</Text>
      </Pressable>

      {keys.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Active API Keys</Text>
          <FlatList
            data={keys}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.keyRow}>
                <View style={styles.keyMeta}>
                  <Text style={styles.keyId}>{"••••"}{item.id.slice(-8)}</Text>
                  <Text style={styles.keyDate}>Created {new Date(item.created_at).toLocaleDateString()}</Text>
                  <Text style={styles.keyDate}>
                    {item.last_used_at
                      ? `Last used ${new Date(item.last_used_at).toLocaleDateString()}`
                      : "Never used"}
                  </Text>
                </View>
                <Pressable style={styles.revokeButton} onPress={() => revokeKey(item.id)}>
                  <Text style={styles.revokeText}>Revoke</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 24, fontWeight: "700", color: "#111827" },
  text: { color: "#4B5563" },
  button: { borderRadius: 10, backgroundColor: "#111827", paddingVertical: 12, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginTop: 8 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    gap: 12
  },
  keyMeta: { flex: 1, gap: 2 },
  keyId: { fontFamily: "monospace", fontSize: 13, color: "#111827" },
  keyDate: { fontSize: 11, color: "#6B7280" },
  revokeButton: { borderWidth: 1, borderColor: "#EF4444", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  revokeText: { color: "#EF4444", fontSize: 13, fontWeight: "600" }
});
