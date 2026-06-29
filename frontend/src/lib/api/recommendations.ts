import { request } from "./client";
import type { ContentItem } from "@/types/content";

export interface PersonalizedRecommendations {
  followed_works_movies: ContentItem[];
  followed_works_series: ContentItem[];
  genre_recommendations_movies: ContentItem[];
  genre_recommendations_series: ContentItem[];
  list_recommendations_movies: ContentItem[];
  list_recommendations_series: ContentItem[];
}

export const recommendationsApi = {
  getPersonalized: () => request<PersonalizedRecommendations>("/recommendations/personalized"),
};
