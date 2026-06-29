import { create } from "zustand";
import type { Notification } from "@/types";
import { notificationsApi, getAccessToken } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  eventSource: EventSource | null;
  retryTimeout: ReturnType<typeof setTimeout> | null;

  fetchInitialData: () => Promise<void>;
  connectSSE: () => void;
  disconnect: () => void;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  eventSource: null,
  retryTimeout: null,

  fetchInitialData: async () => {
    try {
      const [notifs, countData] = await Promise.all([
        notificationsApi.getAll(20, 0),
        notificationsApi.getUnreadCount(),
      ]);
      set({ notifications: notifs, unreadCount: countData.count });
    } catch (err) {
      console.error("Bildirim verisi çekme hatası:", err);
    }
  },

  connectSSE: () => {
    const token = getAccessToken();
    if (!token) {
      setTimeout(() => get().connectSSE(), 1000);
      return;
    }

    // Close previous connection
    const prev = get().eventSource;
    if (prev) prev.close();

    const es = new EventSource(
      `${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`,
      { withCredentials: true }
    );

    es.addEventListener("notification", (event) => {
      try {
        const data = JSON.parse(event.data) as Notification;
        set((state) => {
          const filtered = state.notifications.filter(
            (n) => n.id !== data.id
          );
          return {
            notifications: [data, ...filtered].slice(0, 20),
            unreadCount: state.unreadCount + 1,
          };
        });
      } catch (err) {
        console.error("SSE mesaj parse hatası:", err);
      }
    });

    es.addEventListener("ping", () => {
      // Heartbeat — keeps connection alive
    });

    es.onerror = () => {
      es.close();
      set({ eventSource: null });
      const timeout = setTimeout(() => get().connectSSE(), 5000);
      set({ retryTimeout: timeout });
    };

    set({ eventSource: es });
  },

  disconnect: () => {
    const { eventSource, retryTimeout } = get();
    if (eventSource) eventSource.close();
    if (retryTimeout) clearTimeout(retryTimeout);
    set({ eventSource: null, retryTimeout: null });
  },

  markAllRead: async () => {
    try {
      await notificationsApi.markAllRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
        })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("Bildirimleri okundu işaretleme hatası:", err);
    }
  },

  markOneRead: async (id) => {
    try {
      await notificationsApi.markOneRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error("Bildirim okundu işaretleme hatası:", err);
    }
  },

  deleteNotification: async (id) => {
    try {
      const result = await notificationsApi.deleteOne(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: result.was_unread
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }));
    } catch (err) {
      console.error("Bildirim silme hatası:", err);
    }
  },

  reset: () => {
    get().disconnect();
    set({ notifications: [], unreadCount: 0 });
  },
}));
