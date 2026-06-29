"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { useAuthStore, createAuthStore, AuthStoreContext, type AuthStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useUIStore } from "@/stores/ui-store";
import { setAccessToken } from "@/lib/api";
import type { User } from "@/types";

// ─── Auth Initializer ───────────────────────────────────────────────

interface AuthInitializerProps {
  children: ReactNode;
}

function AuthInitializer({ children }: AuthInitializerProps) {
  const { initializeAuth, user, loading } = useAuthStore();
  const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);
  const { fetchInitialData, connectSSE, reset } = useNotificationStore();

  useEffect(() => {
    const cleanup = initializeAuth();
    return () => {
      cleanup.then((unsubscribe) => unsubscribe());
    };
  }, [initializeAuth]);

  // Library and Notification synchronization
  useEffect(() => {
    if (user) {
      fetchLibrary(true);
      fetchInitialData();
      connectSSE();
    } else if (!loading) {
      fetchLibrary(false);
      reset();
    }
  }, [user, loading, fetchLibrary, fetchInitialData, connectSSE, reset]);

  // Global show-toast event listener
  useEffect(() => {
    const showToast = useUIStore.getState().showToast;
    const handleEvent = (e: CustomEvent) => showToast(e.detail);
    window.addEventListener("show-toast", handleEvent as EventListener);
    return () =>
      window.removeEventListener("show-toast", handleEvent as EventListener);
  }, []);

  return <>{children}</>;
}

// ─── Toast Container ────────────────────────────────────────────────

function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-18 md:bottom-5 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center pointer-events-none px-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="w-auto max-w-max bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-[12px] font-bold shadow-2xl border border-white/5 flex items-center justify-between gap-6 pointer-events-auto animate-in fade-in slide-in-from-bottom-8 duration-500 transition-all"
        >
          <span className="whitespace-nowrap">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                removeToast(t.id);
              }}
              className="bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap shadow-sm"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Providers Component ───────────────────────────────────────

interface ProvidersProps {
  children: ReactNode;
  initialUser: User | null;
  initialAccessToken: string | null;
}

export function Providers({
  children,
  initialUser,
  initialAccessToken,
}: ProvidersProps) {
  const storeRef = useRef<AuthStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createAuthStore({
      user: initialUser,
      loading: false, // loading: false during SSR and hydration if initial state is populated
    });
    // Set access token immediately on initialization
    if (initialAccessToken) {
      setAccessToken(initialAccessToken);
    }
  }

  return (
    <QueryProvider>
      <LanguageProvider>
        <AuthStoreContext.Provider value={storeRef.current}>
          <AuthInitializer>
            {children}
            <ToastContainer />
          </AuthInitializer>
        </AuthStoreContext.Provider>
      </LanguageProvider>
    </QueryProvider>
  );
}

