/**
 * Constant values used application-wide.
 */

// Watchlist states
export const WATCHLIST_STATUSES = {
  WATCHLIST: "watchlist",
  WATCHED: "watched",
} as const;

// Brand name
export const BRAND_NAME = "Cinova";

// Display order of lists on profile page
export const STATUS_ORDER = ["watchlist", "watched"] as const;

// URL slug -> state mapping
export const URL_TO_STATUS: Record<string, string> = {
  watchlist: "watchlist",
  watched: "watched",
  likes: "like",
  dislikes: "dislike",
};

// State -> URL slug mapping
export const STATUS_SLUGS: Record<string, string> = {
  watchlist: "watchlist",
  watched: "watched",
  like: "likes",
  dislike: "dislikes",
};

// Category navigations
export const MOVIE_CATEGORIES = [
  { key: "popular", path: "/movies/popular" },
  { key: "nowPlaying", path: "/movies/now-playing" },
  { key: "upcoming", path: "/movies/upcoming" },
  { key: "topRated", path: "/movies/top-rated" },
] as const;

export const SERIES_CATEGORIES = [
  { key: "popular", path: "/series/popular" },
  { key: "onTheAir", path: "/series/on-the-air" },
  { key: "topRated", path: "/series/top-rated" },
] as const;
