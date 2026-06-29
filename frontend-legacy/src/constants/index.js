/**
 * Constant values used application-wide.
 *
 * Logical values such as watchlist states, navigation routes
 * and sorting preferences are kept here.
 * 
 * NOTE: Display texts (labels, genre names, departments, etc.) 
 * are managed dynamically via the i18n system (src/i18n) or MetadataContext. 
 *
 */

// Watchlist states (Logical IDs)
export const WATCHLIST_STATUSES = {
    WATCHLIST: "watchlist",
    WATCHED: "watched",
};

// Brand name (injected into i18n parameters via LanguageContext)
export const BRAND_NAME = "Cinova";

// Display order of lists on profile page
export const STATUS_ORDER = [
    "watchlist",
    "watched",
];

// URL slug -> state mapping (route parameter resolution)
export const URL_TO_STATUS = {
    "watchlist": "watchlist",
    "watched": "watched",
    "likes": "like",
    "dislikes": "dislike",
};

// State -> URL slug mapping (link generation)
export const STATUS_SLUGS = {
    "watchlist": "watchlist",
    "watched": "watched",
    "like": "likes",
    "dislike": "dislikes",
};

// Category navigations used in Navbar and discover page
// 'name' properties are removed since they are now retrieved via i18n using t().
export const MOVIE_CATEGORIES = [
    { key: "popular", path: "/movies/popular" },
    { key: "nowPlaying", path: "/movies/now-playing" },
    { key: "upcoming", path: "/movies/upcoming" },
    { key: "topRated", path: "/movies/top-rated" },
];

export const SERIES_CATEGORIES = [
    { key: "popular", path: "/series/popular" },
    { key: "onTheAir", path: "/series/on-the-air" },
    { key: "topRated", path: "/series/top-rated" },
];

