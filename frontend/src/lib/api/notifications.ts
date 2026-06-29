import { request } from "./client";
import type { Notification, UnreadCount } from "@/types";

export const notificationsApi = {
  getAll: (limit = 20, offset = 0) =>
    request<Notification[]>(
      `/notifications/?limit=${limit}&offset=${offset}`
    ),

  markAllRead: () =>
    request<{ success: boolean }>("/notifications/read", { method: "POST" }),

  markOneRead: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  deleteOne: (id: string) =>
    request<{ success: boolean; was_unread?: boolean }>(
      `/notifications/${id}`,
      { method: "DELETE" }
    ),

  getUnreadCount: () => request<UnreadCount>("/notifications/unread-count"),
};
