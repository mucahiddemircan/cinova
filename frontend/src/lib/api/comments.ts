import { request } from "./client";
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentSortType,
} from "@/types";

export const commentApi = {
  getByContent: (type: string, id: string | number, sort: CommentSortType = "newest") =>
    request<Comment[]>(`/comments/${type}/${id}?sort=${sort}`),

  getReplies: (commentId: string) =>
    request<Comment[]>(`/comments/${commentId}/replies`),

  create: (body: CreateCommentRequest) =>
    request<Comment>("/comments/", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  interact: (commentId: string, type: "like" | "dislike" | "clear") =>
    request<{ success: boolean }>(
      `/comments/${commentId}/interact?interaction_type=${type}`,
      { method: "POST" }
    ),

  delete: (commentId: string) =>
    request<{ success: boolean }>(`/comments/${commentId}`, {
      method: "DELETE",
    }),

  update: (commentId: string, body: UpdateCommentRequest) =>
    request<Comment>(`/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
