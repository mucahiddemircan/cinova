"use client";

import { useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/providers/language-provider";
import { useInfiniteQuery } from "@tanstack/react-query";
import { contentApi } from "@/lib/api/content";
import MovieCard from "@/components/content/MovieCard";
import PersonCard from "@/components/content/PersonCard";
import FilterBar from "@/components/content/FilterBar";
import useScrollRestoration from "@/hooks/use-scroll-restoration";
import ErrorState from "@/components/common/ErrorState";
import { useAuthStore } from "@/stores/auth-store";

interface CategoryViewProps {
  type: "movies" | "series" | "people";
  category: string;
  role?: string | null;
  staticTitle?: string;
  staticContents?: any[];
}

export default function CategoryView({
  type,
  category,
  role,
  staticTitle,
  staticContents,
}: CategoryViewProps) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const defaultSort = category === "trending" ? "trending" : "popularity.desc";

  const filters = useMemo(
    () => ({
      sort_by: searchParams.get("sort_by") || defaultSort,
      with_genres: searchParams.get("genres") || "",
      year: searchParams.get("year") || "",
      vote_average_gte: searchParams.get("rating") || "",
      vote_count_gte: searchParams.get("vote_count") || "",
      watch_region: searchParams.get("watch_region") || "",
      with_watch_providers: searchParams.get("providers") || "",
      with_watch_monetization_types: searchParams.get("monetization") || "",
      date_from: searchParams.get("date_from") || "",
      date_to: searchParams.get("date_to") || "",
      with_release_type: searchParams.get("release_types") || "",
      with_runtime_gte: searchParams.get("runtime_from") || "",
      with_runtime_lte: searchParams.get("runtime_to") || "",
      with_original_language: searchParams.get("original_language") || "",
    }),
    [searchParams, defaultSort]
  );

  const viewTitle = useMemo(() => {
    const titles: Record<string, string> = {
      "movies-popular": t("category.popularMovies"),
      "movies-now-playing": t("category.nowPlayingMovies"),
      "movies-upcoming": t("category.upcomingMovies"),
      "movies-top-rated": t("category.topRatedMovies"),
      "movies-trending": t("category.trendingMovies"),
      "series-popular": t("category.popularSeries"),
      "series-on-the-air": t("category.onTheAirSeries"),
      "series-top-rated": t("category.topRatedSeries"),
      "series-trending": t("category.trendingSeries"),
      "people-popular-actor": t("category.popularPeople"),
      "people-popular-director": t("category.popularPeople"),
      "people-popular-": t("category.popularPeople"),
    };
    const titleKey =
      type === "people"
        ? `${type}-popular-${role || ""}`
        : `${type}-${category}`;
    return staticTitle || titles[titleKey] || t("category.defaultCategory");
  }, [type, category, role, staticTitle, t]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery({
    queryKey: ["category", type, category, role, filters],
    queryFn: async ({ pageParam = 1 }) => {
      if (type === "people") {
        const apiCategory = role ? `popular-${role}s` : "popular";
        return await contentApi.getCategory("person", apiCategory, pageParam);
      }

      const hasCustomFilters =
        filters.with_genres ||
        filters.year ||
        (filters.vote_average_gte && filters.vote_average_gte !== "0") ||
        (filters.vote_count_gte && filters.vote_count_gte !== "0") ||
        filters.with_watch_providers ||
        filters.with_watch_monetization_types ||
        filters.date_from ||
        filters.date_to ||
        filters.with_release_type ||
        (filters.with_runtime_gte && filters.with_runtime_gte !== "0") ||
        (filters.with_runtime_lte && filters.with_runtime_lte !== "400") ||
        filters.with_original_language ||
        (filters.sort_by !== defaultSort && filters.sort_by !== "trending");

      if (hasCustomFilters) {
        const cleanFilters: any = { page: pageParam };
        if (filters.sort_by && filters.sort_by !== "trending")
          cleanFilters.sort_by = filters.sort_by;
        if (filters.with_genres) cleanFilters.with_genres = filters.with_genres;
        if (filters.vote_average_gte && filters.vote_average_gte !== "0")
          cleanFilters.vote_average_gte = filters.vote_average_gte;
        if (filters.vote_count_gte && filters.vote_count_gte !== "0")
          cleanFilters.vote_count_gte = filters.vote_count_gte;
        if (filters.watch_region) cleanFilters.watch_region = filters.watch_region;
        if (filters.with_watch_providers)
          cleanFilters.with_watch_providers = filters.with_watch_providers;
        if (filters.with_watch_monetization_types)
          cleanFilters.with_watch_monetization_types =
            filters.with_watch_monetization_types;

        if (filters.date_from) {
          if (type === "movies") cleanFilters.release_date_gte = filters.date_from;
          else cleanFilters.first_air_date_gte = filters.date_from;
        }
        if (filters.date_to) {
          if (type === "movies") cleanFilters.release_date_lte = filters.date_to;
          else cleanFilters.first_air_date_lte = filters.date_to;
        }
        if (filters.with_release_type)
          cleanFilters.with_release_type = filters.with_release_type;
        if (filters.with_runtime_gte && filters.with_runtime_gte !== "0")
          cleanFilters.with_runtime_gte = filters.with_runtime_gte;
        if (filters.with_runtime_lte && filters.with_runtime_lte !== "400")
          cleanFilters.with_runtime_lte = filters.with_runtime_lte;
        if (filters.with_original_language)
          cleanFilters.with_original_language = filters.with_original_language;

        if (filters.year) {
          if (type === "movies") cleanFilters.primary_release_year = filters.year;
          else cleanFilters.first_air_date_year = filters.year;
        }

        return await contentApi.discover(
          type === "series" ? "series" : "movies",
          cleanFilters
        );
      }

      return await contentApi.getCategory(type, category, pageParam);
    },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.page < lastPage.total_pages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: !staticContents,
  });

  const scrollKey = useMemo(
    () => `category_scroll_${type}_${category}_${searchParams.toString()}`,
    [type, category, searchParams]
  );
  
  const items = useMemo(() => {
    if (staticContents) return staticContents;
    return data?.pages.flatMap((page: any) => page.results) || [];
  }, [data, staticContents]);

  const totalResults = staticContents
    ? staticContents.length
    : data?.pages[0]?.total_results || 0;

  const isReady = status === "success" && items.length > 0;
  useScrollRestoration(scrollKey, isReady);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "pending" || !hasNextPage) return;

    const cb = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    const observer = new IntersectionObserver(cb);
    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [status, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === "error") {
    return (
      <ErrorState
        title={t("errors.generic")}
        subtitle={(error as any).message}
        buttonText={t("common.backToHome")}
        buttonLink="/"
      />
    );
  }

  return (
    <div className="py-6 animate-fade-in flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-text-primary">{viewTitle}</h1>
        {totalResults > 0 && (
          <p className="text-sm text-text-secondary">
            {t("category.resultsFound", {
              count: totalResults.toLocaleString(),
            })}
          </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {type !== "people" &&
          !staticContents &&
          category !== "recommendations" &&
          category !== "trending" && (
            <aside className="w-full md:w-72 flex-shrink-0">
              <FilterBar type={type} category={category} />
            </aside>
          )}

        <div className="flex-1 w-full">
          {items.length === 0 && (staticContents || status === "success") ? (
            <div className="flex flex-col items-center justify-center py-20 bg-bg-surface border border-white/5 rounded-2xl">
              <p className="text-text-secondary text-lg">
                {t("category.noResults")}
              </p>
            </div>
          ) : (
            <div className="content-grid">
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="w-full">
                  {type === "people" ? (
                    <PersonCard person={item} basePath="/people" user={user} />
                  ) : (
                    <MovieCard movie={item} user={user} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-10 w-full" />

          {(status === "pending" || isFetchingNextPage) && (
            <div className="content-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={`skeleton-${i}`} className="flex flex-col gap-3">
                  <div className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                  <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!hasNextPage && items.length > 0 && (
            <div className="py-12 text-center border-t border-white/5 mt-8">
              <p className="text-text-secondary italic">{t("category.allLoaded")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
