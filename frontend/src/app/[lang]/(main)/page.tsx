"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/language-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import { contentApi } from "@/lib/api/content";
import { recommendationsApi } from "@/lib/api/recommendations";
import MovieList from "@/components/content/MovieList";
import PersonList from "@/components/content/PersonList";
import {
  MovieListSkeleton,
  PersonListSkeleton,
} from "@/components/content/CardSkeleton";

const EMPTY_RECS = {
  followed_works_movies: [],
  followed_works_series: [],
  genre_recommendations_movies: [],
  genre_recommendations_series: [],
  list_recommendations_movies: [],
  list_recommendations_series: [],
};

export default function HomePage() {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);

  // Home Data (Trending)
  const { data: homeData, isLoading: homeLoading } = useQuery({
    queryKey: ["home-data"],
    queryFn: () => contentApi.getHomeData(),
  });

  // Personal Recommendations logic (Ported from legacy HomeView)
  const { data: personalRecs, isLoading: recsLoading, error: recsError } = useQuery({
    queryKey: ["personal-recs", user?.id],
    queryFn: async () => {
      if (!user) return EMPTY_RECS;
      return await recommendationsApi.getPersonalized();
    },
    enabled: !!user,
  });

  const hasInitialData = useMemo(() => {
    if (!personalRecs) return false;
    return (
      (personalRecs.list_recommendations_movies?.length || 0) > 0 ||
      (personalRecs.list_recommendations_series?.length || 0) > 0 ||
      (personalRecs.genre_recommendations_movies?.length || 0) > 0 ||
      (personalRecs.genre_recommendations_series?.length || 0) > 0 ||
      (personalRecs.followed_works_movies?.length || 0) > 0 ||
      (personalRecs.followed_works_series?.length || 0) > 0
    );
  }, [personalRecs]);

  const movies = homeData?.movies || [];
  const series = homeData?.series || [];
  const people = homeData?.people || [];

  if (homeLoading && movies.length === 0 && series.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <MovieListSkeleton />
        <MovieListSkeleton />
        <PersonListSkeleton />
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-2">
      {!user && (
        <div className="md:hidden mb-4 p-6 bg-gradient-to-br from-bg-surface to-bg-base border border-white/5 rounded-3xl overflow-hidden relative group">
          <h4 className="text-white font-bold text-lg mb-2">
            {t("home.ctaTitle")}
          </h4>
          <p className="text-text-secondary text-sm mb-5 leading-relaxed">
            {t("home.ctaText")}
          </p>
          <Link
            href="/register"
            className="inline-block bg-brand hover:bg-brand-hover text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/20 transition-all active:scale-95"
          >
            {t("home.ctaButton")}
          </Link>
        </div>
      )}

      {user && recsLoading && !hasInitialData && (
        <div className="flex flex-col gap-2">
          <MovieListSkeleton />
        </div>
      )}

      {user && personalRecs && (
        <>
          {personalRecs.list_recommendations_movies.length > 0 && (
            <MovieList
              title={t("home.listRecsMovies")}
              contents={personalRecs.list_recommendations_movies}
              to="/movies/recommendations"
              user={user}
            />
          )}
          {personalRecs.list_recommendations_series.length > 0 && (
            <MovieList
              title={t("home.listRecsSeries")}
              contents={personalRecs.list_recommendations_series}
              to="/series/recommendations"
              user={user}
            />
          )}
          {personalRecs.genre_recommendations_movies.length > 0 && (
            <MovieList
              title={t("home.genreRecsMovies")}
              contents={personalRecs.genre_recommendations_movies}
              to="/movies/recommendations"
              user={user}
            />
          )}
          {personalRecs.genre_recommendations_series.length > 0 && (
            <MovieList
              title={t("home.genreRecsSeries")}
              contents={personalRecs.genre_recommendations_series}
              to="/series/recommendations"
              user={user}
            />
          )}
          {personalRecs.followed_works_movies.length > 0 && (
            <MovieList
              title={t("home.followedMovies")}
              contents={personalRecs.followed_works_movies}
              to="/movies/recommendations"
              user={user}
            />
          )}
          {personalRecs.followed_works_series.length > 0 && (
            <MovieList
              title={t("home.followedSeries")}
              contents={personalRecs.followed_works_series}
              to="/series/recommendations"
              user={user}
            />
          )}
        </>
      )}

      <MovieList
        title={t("home.trendMovies")}
        contents={movies}
        to="/movies/trending"
        user={user}
      />
      <PersonList
        title={t("home.popularPeople")}
        contents={people}
        to="/people/popular"
        user={user}
      />
      <MovieList
        title={t("home.trendSeries")}
        contents={series}
        to="/series/trending"
        user={user}
      />
    </div>
  );
}
