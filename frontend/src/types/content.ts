// ─── Movie / Series ──────────────────────────────────────────────────

export type MediaType = "movie" | "tv" | "series";

/** TMDB movie/series card (list view) */
export interface ContentItem {
  id: number;
  tmdb_id: number;
  title: string;
  name?: string; // series
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[] | string;
  media_type: MediaType;
  type?: MediaType;
  popularity?: number;
  certification?: string;
  rating?: number;
  created_at?: string;
}

/** Movie/Series details page */
export interface ContentDetail extends ContentItem {
  description?: string;
  trailer_key?: string | null;
  original_language?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  genres?: Genre[];
  production_countries?: ProductionCountry[];
  spoken_languages?: SpokenLanguage[];
  credits?: Credits;
  videos?: VideoResult;
  watch_providers?: WatchProviders;
  similar?: ContentItem[];
  recommendations?: ContentItem[];
  cast?: CastMember[];
  crew?: CrewMember[];
  production_companies?: Array<{ id?: number; name: string } | string>;
  seasons?: Season[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

// ─── Cast & Crew ────────────────────────────────────────────────────

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  known_for_department?: string;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

// ─── Person ────────────────────────────────────────────────────────

export interface Person {
  id: number;
  tmdb_id?: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  known_for?: ContentItem[];
}

export interface PersonDetail extends Person {
  original_name?: string;
  is_following?: boolean;
  followers_count?: number;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  gender: number;
  also_known_as: string[];
  combined_credits?: {
    cast: PersonCredit[];
    crew: PersonCredit[];
  };
  external_ids?: ExternalIds;
}

export interface PersonCredit extends ContentItem {
  character?: string;
  job?: string;
  department?: string;
  episode_count?: number;
}

export interface ExternalIds {
  imdb_id?: string;
  instagram_id?: string;
  twitter_id?: string;
}

// ─── Video / Trailer ────────────────────────────────────────────────

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface VideoResult {
  results: Video[];
}

// ─── Watch Providers ────────────────────────────────────────────────

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface WatchProviderCountry {
  link: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export interface WatchProviders {
  results: Record<string, WatchProviderCountry>;
}

// ─── Season / Episode ───────────────────────────────────────────────

export interface Season {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number;
  episodes?: Episode[];
}

export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

// ─── Home Data ──────────────────────────────────────────────────────

export interface HomeData {
  movies: ContentItem[];
  series: ContentItem[];
  people: Person[];
}

// ─── Paginated Response ─────────────────────────────────────────────

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  total_pages: number;
  total_results: number;
}
