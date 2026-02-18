import { Stack } from "expo-router";
import { Redirect } from "expo-router";
import { useAuthStore } from "../../src/stores/auth-store";

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  if (user) {
    return <Redirect href="/(tabs)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
