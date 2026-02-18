import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  init: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  loading: true,
  session: null,
  user: null,
  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, loading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });
  },
  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  signUpWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
  signInWithGoogle: async () => {
    const redirectTo = Linking.createURL("/auth/callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    });
    if (error) throw error;
    if (!data?.url) {
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      return;
    }
    const queryString = result.url.split("#")[1] ?? "";
    const params = new URLSearchParams(queryString);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (sessionError) throw sessionError;
    await get().init();
  }
}));
