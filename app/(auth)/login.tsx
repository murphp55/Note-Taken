import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuthStore } from "../../src/stores/auth-store";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useAuthStore((s) => s.signInWithEmail);
  const signUp = useAuthStore((s) => s.signUpWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const onSignIn = async () => {
    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert("Sign in failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const onSignUp = async () => {
    try {
      await signUp(email, password);
      Alert.alert("Account created", "Check email for verification if enabled.");
    } catch (error) {
      Alert.alert("Sign up failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>NoteTaken</Text>
      <Text style={styles.subtitle}>Personal knowledge system synced in real time.</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={onSignIn}>
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>
      <Pressable style={styles.buttonSecondary} onPress={onSignUp}>
        <Text style={styles.buttonSecondaryText}>Create Account</Text>
      </Pressable>
      <Pressable style={styles.buttonSecondary} onPress={signInWithGoogle}>
        <Text style={styles.buttonSecondaryText}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 20, gap: 12, backgroundColor: "#F9FAFB" },
  title: { fontSize: 32, fontWeight: "700", color: "#111827" },
  subtitle: { color: "#4B5563", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  button: { borderRadius: 10, backgroundColor: "#111827", paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "600" },
  buttonSecondary: { borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", paddingVertical: 12, alignItems: "center" },
  buttonSecondaryText: { color: "#111827", fontWeight: "600" }
});
