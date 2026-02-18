import { Tabs } from "expo-router";
import { Redirect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { useAuthStore } from "../../src/stores/auth-store";

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0F172A",
        headerStyle: { backgroundColor: "#FFFFFF" },
        tabBarStyle: { backgroundColor: "#FFFFFF" }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "All Notes",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="notes" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: "Folders",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="folder" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          title: "Tags",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="label" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="search" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" color={color} size={size} />,
          headerRight: () => (
            <Pressable onPress={signOut} style={{ marginRight: 14 }}>
              <MaterialIcons name="logout" color="#111827" size={22} />
            </Pressable>
          )
        }}
      />
    </Tabs>
  );
}
