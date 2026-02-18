import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const ENV = {
  SUPABASE_URL: requireEnv("SUPABASE_URL", extra.supabaseUrl),
  SUPABASE_ANON_KEY: requireEnv("SUPABASE_ANON_KEY", extra.supabaseAnonKey),
  APP_API_BASE_URL: extra.apiBaseUrl ?? "http://localhost:8787",
  GOOGLE_WEB_CLIENT_ID: extra.googleWebClientId ?? ""
};
