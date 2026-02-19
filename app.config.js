import "dotenv/config";

export default {
  expo: {
    name: "NoteTaken",
    slug: "notetaken",
    scheme: "notetaken",
    version: "0.1.0",
    orientation: "default",
    userInterfaceStyle: "automatic",
    platforms: ["ios", "android", "web"],
    plugins: ["expo-router", "expo-secure-store", "./plugins/with-app-actions"],
    experiments: {
      typedRoutes: true
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.notetaken.app"
    },
    android: {
      package: "com.notetaken.app"
    },
    web: {
      bundler: "metro"
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      apiBaseUrl: process.env.APP_API_BASE_URL ?? "http://localhost:8787",
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? ""
    }
  }
};
