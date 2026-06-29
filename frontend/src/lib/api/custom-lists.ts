import { request } from "./client";
import type {
  CustomList,
  CustomListSummary,
  CreateListRequest,
} from "@/types";

export const customListApi = {
  create: (data: CreateListRequest) =>
    request<CustomList>("/custom-lists/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: () => request<CustomListSummary[]>("/custom-lists/"),

  getByUsername: (username: string) =>
    request<CustomListSummary[]>(`/custom-lists/user/${username}`),

  getBySlug: (username: string, slug: string) =>
    request<CustomList>(`/custom-lists/${username}/${slug}`),

  getById: (id: string) => request<CustomList>(`/custom-lists/id/${id}`),

  delete: (id: string) =>
    request<{ success: boolean }>(`/custom-lists/${id}`, {
      method: "DELETE",
    }),

  addItems: (
    id: string,
    items: { tmdb_id: number; media_type: string }[]
  ) =>
    request<{ success: boolean }>(`/custom-lists/${id}/items`, {
      method: "POST",
      body: JSON.stringify(items),
    }),

  removeItem: (id: string, tmdbId: number) =>
    request<{ success: boolean }>(`/custom-lists/${id}/items/${tmdbId}`, {
      method: "DELETE",
    }),
};
