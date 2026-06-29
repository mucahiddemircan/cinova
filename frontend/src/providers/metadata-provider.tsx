"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { metadataApi } from "@/lib/api";
import { useLanguage } from "./language-provider";
import type { MetadataConfig } from "@/types";

interface MetadataContextValue extends MetadataConfig {
  loading: boolean;
  error: Error | null;
  getGenreName: (id: number, type?: string) => string;
  getCountryName: (code: string) => string;
  translateLocal: (category: string, key: string) => string;
  refresh: () => Promise<void>;
}

const MetadataContext = createContext<MetadataContextValue | null>(null);

export function MetadataProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const [metadata, setMetadata] = useState<
    MetadataConfig & { loading: boolean; error: Error | null }
  >({
    genres: { movie: {}, series: {} },
    countries: {},
    languages: {},
    local: {},
    loading: true,
    error: null,
  });

  const fetchMetadata = async () => {
    try {
      setMetadata((prev) => ({ ...prev, loading: true }));
      const config = await metadataApi.getConfig();
      setMetadata({
        ...config,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
      setMetadata((prev) => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [language]);

  const getGenreName = (id: number, type = "movie"): string => {
    const typeKey = type === "tv" || type === "series" ? "series" : "movie";
    return metadata.genres[typeKey]?.[id] || `Genre ${id}`;
  };

  const getCountryName = (code: string): string =>
    metadata.countries[code] || code;

  const translateLocal = (category: string, key: string): string => {
    const catMap = metadata.local[category] || {};
    return catMap[key] || key;
  };

  return (
    <MetadataContext.Provider
      value={{
        ...metadata,
        getGenreName,
        getCountryName,
        translateLocal,
        refresh: fetchMetadata,
      }}
    >
      {children}
    </MetadataContext.Provider>
  );
}

export const useMetadata = (): MetadataContextValue => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error("useMetadata must be used within a MetadataProvider");
  }
  return context;
};
