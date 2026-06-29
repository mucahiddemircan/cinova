// ─── Notifications ──────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;

  actor_username?: string;
  actor_avatar_url?: string | null;
  actor_initial?: string;
  comment_id?: string;
  tmdb_id?: number;
  media_type?: string;
}

export interface UnreadCount {
  count: number;
}

export type NotificationType =
  | "comment_reply"
  | "comment_like"
  | "comment_dislike"
  | "follow"
  | "list_like"
  | "system";
