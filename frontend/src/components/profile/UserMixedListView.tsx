"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/providers/language-provider";
import { libraryApi } from "@/lib/api";
import { URL_TO_STATUS } from "@/constants";
import MovieList from "@/components/content/MovieList";
import Skeleton from "@/components/layout/Skeleton";
import type { ContentItem, User } from "@/types";

interface UserMixedListViewProps {
  username: string;
  statusUrl: string;
  currentUser: User | null;
}

export default function UserMixedListView({
  username,
  statusUrl,
  currentUser,
}: UserMixedListViewProps) {
  const { t, getLocalizedPath } = useLanguage();

  const status = URL_TO_STATUS[statusUrl] || statusUrl;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    movies: ContentItem[];
    series: ContentItem[];
  }>({
    movies: [],
    series: [],
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [movieData, seriesData] = await Promise.all([
          libraryApi.getUserList(username, status, "movie"),
          libraryApi.getUserList(username, status, "series"),
        ]);

        const mapContent = (items: any[]) =>
          items.map((item) => ({ ...item, id: item.tmdb_id || item.id }));

        setData({
          movies: mapContent(movieData),
          series: mapContent(seriesData),
        });
      } catch (err) {
        console.error("Mixed view loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [username, status]);

  if (loading) {
    return (
      <div className="space-y-12 animate-fade-in">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 mb-6" variant="shimmer" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                className="aspect-[2/3] w-40 rounded-xl shrink-0"
                variant="shimmer"
              />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 mb-6" variant="shimmer" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                className="aspect-[2/3] w-40 rounded-xl shrink-0"
                variant="shimmer"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasContent = data.movies.length > 0 || data.series.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-bg-surface/20 rounded-[3rem] border-2 border-dashed border-white/5">
        <h3 className="text-xl font-bold text-text-secondary">
          {t("mixedListView.emptyTitle")}
        </h3>
        <p className="text-text-secondary/50 mt-2">{t("mixedListView.emptySub")}</p>
      </div>
    );
  }

  const getTitle = (mediaType: "movie" | "series") => {
    const keyMap: Record<string, string> = {
      like: mediaType === "movie" ? "likedMovies" : "likedSeries",
      dislike: mediaType === "movie" ? "dislikedMovies" : "dislikedSeries",
      watchlist: mediaType === "movie" ? "watchlistMovies" : "watchlistSeries",
      watched: mediaType === "movie" ? "completedMovies" : "completedSeries",
    };
    return t(`mixedListView.${keyMap[status]}`) || status;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {data.movies.length > 0 && (
        <MovieList
          title={getTitle("movie")}
          contents={data.movies.slice(0, 20).map((m) => ({
            ...m,
            hideDetails: true,
          }))}
          to={getLocalizedPath(`/${username}/${statusUrl}/movies`)}
          user={currentUser}
          variant="small"
        />
      )}

      {data.series.length > 0 && (
        <MovieList
          title={getTitle("series")}
          contents={data.series.slice(0, 20).map((m) => ({
            ...m,
            hideDetails: true,
          }))}
          to={getLocalizedPath(`/${username}/${statusUrl}/series`)}
          user={currentUser}
          variant="small"
        />
      )}
    </div>
  );
}
