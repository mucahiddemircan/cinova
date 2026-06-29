// ─── API Response Wrappers ──────────────────────────────────────────

/** General API error structure */
export interface ApiError {
  detail: string;
  status: number;
}

/** Metadata configuration (incoming from backend) */
export interface MetadataConfig {
  genres: {
    movie: Record<number, string>;
    series: Record<number, string>;
  };
  countries: Record<string, string>;
  languages: Record<string, string>;
  local: Record<string, Record<string, string>>;
}

/** Certification map */
export type CertificationMap = Record<string, number>;

/** Search results */
export interface SearchResults {
  movies: import("./content").ContentItem[];
  series: import("./content").ContentItem[];
  people: import("./content").Person[];
  relevant?: import("./content").ContentItem[];
  profiles?: import("./user").PublicProfile[];
}

/** Provider info */
export interface ProviderInfo {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}
