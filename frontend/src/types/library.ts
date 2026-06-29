// ─── Library ────────────────────────────────────────────────────────

export interface LibraryStatus {
  watchlist: boolean;
  watched: boolean;
  liked: boolean;
  disliked: boolean;
}

export interface FollowedUser {
  username: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface FollowedPerson {
  id: number;
  tmdb_id: number;
  name?: string;
  profile_path?: string | null;
}

export interface LibrarySummary {
  status_map: Record<number, LibraryStatus>;
  follows: {
    users: FollowedUser[];
    people: FollowedPerson[];
  };
  custom_lists: CustomListSummary[];
}

export interface LibraryToggleRequest {
  tmdb_id: number;
  media_type: string;
  action: string;
  value: boolean;
  title?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  genre_ids?: string | number[];
}

// ─── Custom Lists ───────────────────────────────────────────────────

export interface CustomListSummary {
  id: string;
  name: string;
  slug: string;
  item_count: number;
}

export interface CustomList {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_public: boolean;
  user_id: string;
  username: string;
  items: CustomListItem[];
  created_at: string;
}

export interface CustomListItem {
  tmdb_id: number;
  media_type: string;
  title?: string;
  poster_path?: string | null;
  added_at: string;
}

export interface CreateListRequest {
  title: string;
  description?: string;
  is_private?: boolean;
  media_type: string;
  items?: { tmdb_id: number }[];
}

// ─── Follows ────────────────────────────────────────────────────────

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface PersonFollowStats {
  followers_count: number;
  is_following: boolean;
}

// ─── Library Summary Stats ──────────────────────────────────────────

export interface LibraryStats {
  watchlist: number;
  watched: number;
  liked: number;
  disliked: number;
  movie_watchlist?: number;
  movie_watched?: number;
  series_watchlist?: number;
  series_watched?: number;
}
