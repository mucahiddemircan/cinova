"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand";
import type { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { authApi, setAccessToken, ApiError } from "@/lib/api";

export interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<() => void>;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

export type AuthStore = ReturnType<typeof createAuthStore>;

export const createAuthStore = (initialState: Partial<AuthState> = {}) => {
  return createStore<AuthState>((set, get) => ({
    user: null,
    loading: true,

    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),

    /**
     * Checks session at application startup.
     * Returns cleanup function (subscription.unsubscribe).
     */
    initializeAuth: async () => {
      let currentUserId: string | null = null;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setAccessToken(session.access_token);
          currentUserId = session.user.id;
          if (!get().user) {
            try {
              const userData = await authApi.getMe();
              set({ user: userData });
            } catch (err) {
              console.error("Kullanıcı verisi alınamadı:", err);
              set({ user: null });
              if (err instanceof ApiError && err.status === 401) {
                await supabase.auth.signOut();
              }
            }
          }
        } else {
          set({ user: null });
        }
      } catch (err) {
        console.error("Oturum kontrolü hatası:", err);
      } finally {
        set({ loading: false });
      }

      // Listen to auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setAccessToken(session.access_token);
          if (session.user.id !== currentUserId) {
            currentUserId = session.user.id;
            try {
              const userData = await authApi.getMe();
              set({ user: userData });
            } catch (err) {
              console.error("Kullanıcı verisi alınamadı:", err);
              if (err instanceof ApiError && err.status === 401) {
                await supabase.auth.signOut();
              }
            }
          }
        } else if (event === "SIGNED_OUT") {
          setAccessToken(null);
          currentUserId = null;
          set({ user: null });
        }
      });

      return () => subscription.unsubscribe();
    },

    handleLogin: async () => {
      set({ loading: true });
      try {
        const userData = await authApi.getMe();
        set({ user: userData });
      } catch (err) {
        console.error("Giriş sonrası profil çekme hatası:", err);
      } finally {
        set({ loading: false });
      }
    },

    handleLogout: async () => {
      await authApi.logout();
      set({ user: null });
    },

    ...initialState,
  }));
};

export const AuthStoreContext = createContext<AuthStore | null>(null);

export function useAuthStore(): AuthState;
export function useAuthStore<T>(selector: (state: AuthState) => T): T;
export function useAuthStore<T>(selector?: (state: AuthState) => T) {
  const store = useContext(AuthStoreContext);
  if (!store) {
    throw new Error("useAuthStore must be used within AuthStoreProvider");
  }
  return useStore(store, selector || ((s) => s as unknown as T));
}

