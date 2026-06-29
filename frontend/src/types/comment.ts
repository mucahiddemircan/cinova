// ─── Comments ───────────────────────────────────────────────────────

export interface Comment {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  tmdb_id: number;
  media_type: string;
  content: string;
  parent_id: string | null;
  like_count: number;
  dislike_count: number;
  reply_count: number;
  user_interaction: "like" | "dislike" | null;
  is_edited: boolean;
  is_spoiler: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  tmdb_id: number;
  media_type: string;
  content: string;
  parent_id?: string | null;
  is_spoiler?: boolean;
}

export interface UpdateCommentRequest {
  content: string;
  is_spoiler?: boolean;
}

export type CommentSortType = "newest" | "oldest" | "popular" | "top";
