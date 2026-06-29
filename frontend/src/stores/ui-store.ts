import { create } from "zustand";
import type { User } from "@/types";

interface Toast {
  id: number;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UIState {
  toasts: Toast[];
  showToast: (payload: string | Omit<Toast, "id">) => void;
  removeToast: (id: number) => void;
  requireAuth: (user: User | null, message?: string) => boolean;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  showToast: (payload) => {
    const id = Date.now() + Math.random();
    const data: Omit<Toast, "id"> =
      typeof payload === "string" ? { message: payload } : payload;

    set((state) => ({
      toasts: [{ id, ...data }, ...state.toasts],
    }));

    const duration = data.action ? 5000 : 3000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  requireAuth: (user, message = "Bu işlemi yapmak için giriş yapmalısın.") => {
    if (!user) {
      const showToast = useUIStore.getState().showToast;
      showToast(message);
      return false;
    }
    return true;
  },
}));
