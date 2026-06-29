import { request } from "./client";
import type {
  LibrarySummary,
  LibraryStatus,
  LibraryToggleRequest,
  ContentItem,
} from "@/types";

export const libraryApi = {
  toggle: (body: LibraryToggleRequest) =>
    request<{ success: boolean }>("/library/", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getStatus: (mediaType: string, tmdbId: number) =>
    request<LibraryStatus>(`/library/status/${mediaType}/${tmdbId}`),

  getSummary: (username = "me") =>
    request<LibrarySummary>(
      `/library/summary${username === "me" ? "-me" : `/${username}`}`
    ),

  getUserList: (
    username: string,
    action: string,
    mediaType: string | null = null
  ) => {
    const query = mediaType ? `?media_type=${mediaType}` : "";
    return request<ContentItem[]>(
      `/library/list/${username || "me"}/${action}${query}`
    );
  },
};

// Backward Compatibility Wrappers
export const interactionsApi = {
  toggle: (body: {
    tmdb_id: number;
    media_type: string;
    interaction_type: string;
  }) => {
    const libraryBody: LibraryToggleRequest = {
      ...body,
      action: body.interaction_type,
      value: true,
    };
    return libraryApi.toggle(libraryBody);
  },

  getStatus: (tmdbId: number, mediaType: string) =>
    libraryApi.getStatus(mediaType, tmdbId),

  getByType: (
    userId: string | null,
    mediaType: string,
    type: string
  ) => libraryApi.getUserList(userId || "me", type, mediaType),
};

export const watchlistApi = {
  getSummary: async (username?: string) => {
    const data = await libraryApi.getSummary(username || "me");
    return data;
  },
};
