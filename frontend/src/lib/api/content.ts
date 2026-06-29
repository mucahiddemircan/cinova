import { request } from "./client";
import type {
  ContentItem,
  ContentDetail,
  HomeData,
  PaginatedResponse,
  Season,
  CastMember,
  CrewMember,
  SearchResults,
} from "@/types";

export const contentApi = {
  getHomeData: () => request<HomeData>("/movies/home-data"),

  search: (query: string, type = "all") =>
    request<SearchResults | any[]>(
      `/movies/search?q=${encodeURIComponent(query)}&type=${type}`
    ),

  getById: (type: string, id: string | number) => {
    const path = type === "series" ? "series" : "movies";
    return request<ContentDetail>(`/${path}/${id}`);
  },

  getCategory: (type: string, category: string, page = 1) => {
    if (type === "person") {
      return request<PaginatedResponse<ContentItem>>(
        `/people/popular?page=${page}`
      );
    }
    const path = type === "series" ? "series" : type === "movies" ? "movies" : type;
    const catMap: Record<string, string> = {
      "movies-popular": "popular",
      "movies-now-playing": "now-playing",
      "movies-upcoming": "upcoming",
      "movies-top-rated": "top-rated",
      "series-popular": "popular",
      "series-on-the-air": "on-the-air",
      "series-top-rated": "top-rated",
    };
    const mappedCat = catMap[`${type}-${category}`] || category;
    return request<PaginatedResponse<ContentItem>>(
      `/${path}/${mappedCat}?page=${page}`
    );
  },

  discover: (type: string, params: Record<string, string>) => {
    const path = type === "series" ? "series" : "movies";
    const queryParams = new URLSearchParams(params).toString();
    return request<PaginatedResponse<ContentItem>>(
      `/${path}/discover?${queryParams}`
    );
  },

  getRecommendations: (type: string, id: string | number) => {
    const path = type === "series" ? "series" : "movies";
    return request<ContentItem[]>(`/${path}/${id}/recommendations`);
  },

  getSeason: (seriesId: string | number, seasonNumber: number) =>
    request<Season>(`/series/${seriesId}/seasons/${seasonNumber}`),

  getCast: (type: string, id: string | number) => {
    const path = type === "series" ? "series" : "movies";
    return request<{ cast: CastMember[]; crew: CrewMember[] }>(
      `/${path}/${id}/cast`
    );
  },
};
