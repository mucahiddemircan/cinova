"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Folder } from "lucide-react";
import { libraryApi, customListApi } from "@/lib/api";
import OverlappingCarousel from "@/components/common/OverlappingCarousel";
import MovieList from "@/components/content/MovieList";
import Skeleton from "@/components/layout/Skeleton";
import { MovieListSkeleton } from "@/components/content/CardSkeleton";
import { useLanguage } from "@/providers/language-provider";
import { useAuthStore } from "@/stores/auth-store";
import type { ContentItem, User } from "@/types";

interface ProfileOverviewProps {
  username: string;
  currentUser?: User | null;
}

export default function ProfileOverview({
  username,
  currentUser: propCurrentUser,
}: ProfileOverviewProps) {
  const { t, getLocalizedPath } = useLanguage();
  const storeUser = useAuthStore((s) => s.user);
  const currentUser = propCurrentUser !== undefined ? propCurrentUser : storeUser;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    likedMovies: ContentItem[];
    likedSeries: ContentItem[];
    completedMovies: ContentItem[];
    completedSeries: ContentItem[];
    customLists: any[];
  }>({
    likedMovies: [],
    likedSeries: [],
    completedMovies: [],
    completedSeries: [],
    customLists: [],
  });

  useEffect(() => {
    const loadProfileSummary = async () => {
      setLoading(true);
      try {
        const [
          likedMovies,
          likedSeries,
          watchedMovies,
          watchedSeries,
          customLists,
        ] = await Promise.all([
          libraryApi.getUserList(username, "like", "movie"),
          libraryApi.getUserList(username, "like", "series"),
          libraryApi.getUserList(username, "watched", "movie"),
          libraryApi.getUserList(username, "watched", "series"),
          customListApi.getByUsername(username),
        ]);

        const mapContent = (items: any[], type: string): ContentItem[] =>
          items.map((item) => ({
            ...item,
            id: item.tmdb_id || item.id,
            type: item.media_type || item.type || type,
          }));

        setData({
          likedMovies: mapContent(likedMovies, "movie"),
          likedSeries: mapContent(likedSeries, "series"),
          completedMovies: mapContent(watchedMovies, "movie"),
          completedSeries: mapContent(watchedSeries, "series"),
          customLists: customLists || [],
        });
      } catch (err) {
        console.error("Profil özeti yüklenemedi:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileSummary();
  }, [username]);

  // Sync state if interactions change globally (simplified for Next.js)
  useEffect(() => {
    const handleStatusChange = (e: any) => {
      const { tmdb_id, liked, watched, media_type } = e.detail;

      setData((prev) => {
        const newData = { ...prev };
        const mType = media_type;

        if (e.detail.hasOwnProperty("liked")) {
          const likedKey =
            mType === "series" ? "likedSeries" : "likedMovies";
          if (!liked) {
            (newData as any)[likedKey] = (prev as any)[likedKey].filter(
              (it: any) => (it.tmdb_id || it.id) !== tmdb_id
            );
          }
        }

        if (e.detail.hasOwnProperty("watched")) {
          const watchedKey =
            mType === "series" ? "completedSeries" : "completedMovies";
          if (!watched) {
            (newData as any)[watchedKey] = (prev as any)[watchedKey].filter(
              (it: any) => (it.tmdb_id || it.id) !== tmdb_id
            );
          }
        }

        return newData;
      });
    };

    window.addEventListener("contentStatusChanged", handleStatusChange);
    return () =>
      window.removeEventListener("contentStatusChanged", handleStatusChange);
  }, [username]);

  if (loading) {
    return (
      <div className="space-y-10 animate-fade-in">
        {[1, 2, 3, 4].map((i) => (
          <MovieListSkeleton key={i} isSmall={true} count={8} />
        ))}

        <div className="mt-16 space-y-8">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-start w-full gap-4">
                <Skeleton
                  className="w-full h-[100px] md:h-[140px] rounded-2xl"
                  variant="shimmer"
                />
                <div className="flex flex-col gap-2 w-full px-1">
                  <Skeleton className="h-6 w-3/4" variant="shimmer" />
                  <Skeleton className="h-4 w-1/2" variant="shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasAnyContent =
    data.customLists.length > 0 ||
    data.likedMovies.length > 0 ||
    data.likedSeries.length > 0 ||
    data.completedMovies.length > 0 ||
    data.completedSeries.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-bg-surface/20 rounded-[3rem] border-2 border-dashed border-white/5">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 text-text-secondary/20">
          <Folder size={40} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-bold text-text-secondary">
          {t("profile.noContent")}
        </h3>
        <p className="text-text-secondary/50 mt-2">
          {t("profile.noContentSub")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {data.likedMovies.length > 0 && (
        <MovieList
          title={t("profile.likedMovies")}
          contents={data.likedMovies
            .slice(0, 20)
            .map((m) => ({ ...m, hideDetails: true }))}
          to={getLocalizedPath(`/${username}/likes/movies`)}
          user={currentUser}
          variant="small"
        />
      )}

      {data.likedSeries.length > 0 && (
        <MovieList
          title={t("profile.likedSeries")}
          contents={data.likedSeries
            .slice(0, 20)
            .map((m) => ({ ...m, hideDetails: true }))}
          to={getLocalizedPath(`/${username}/likes/series`)}
          user={currentUser}
          variant="small"
        />
      )}

      {data.completedMovies.length > 0 && (
        <MovieList
          title={t("profile.watchedMovies")}
          contents={data.completedMovies
            .slice(0, 20)
            .map((m) => ({ ...m, hideDetails: true }))}
          to={getLocalizedPath(`/${username}/watched/movies`)}
          user={currentUser}
          variant="small"
        />
      )}

      {data.completedSeries.length > 0 && (
        <MovieList
          title={t("profile.watchedSeries")}
          contents={data.completedSeries
            .slice(0, 20)
            .map((m) => ({ ...m, hideDetails: true }))}
          to={getLocalizedPath(`/${username}/watched/series`)}
          user={currentUser}
          variant="small"
        />
      )}

      {data.customLists.length > 0 && (
        <section className="mb-10">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-text-primary">
              <Link
                href={getLocalizedPath(`/${username}/lists`)}
                className="hover:underline decoration-white cursor-pointer transition-all"
              >
                {t("profile.lists")}
              </Link>
            </h2>
            <Link
              href={getLocalizedPath(`/${username}/lists`)}
              className="text-sm text-text-secondary hover:text-text-primary hover:underline cursor-pointer font-medium tracking-wide transition-colors decoration-white mb-1"
            >
              {t("profile.showAllLists")}
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.customLists.map((list) => {
              return (
                <div key={list.id} className="flex flex-col items-start w-full">
                  <Link
                    href={getLocalizedPath(`/${username}/lists/${list.slug}`)}
                    className="w-full mb-4 cursor-pointer flex justify-start relative group"
                  >
                    <OverlappingCarousel
                      posters={list.posters}
                      className="justify-start"
                    />
                  </Link>

                  <div className="flex flex-col items-start text-left w-full min-w-0 px-1">
                    <Link
                      href={getLocalizedPath(`/${username}/lists/${list.slug}`)}
                      className="text-lg font-black text-text-primary hover:underline truncate w-full"
                    >
                      {list.title}
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium opacity-60">
                      <Link
                        href={getLocalizedPath(`/${username}`)}
                        className="hover:underline transition-all"
                      >
                        @{username}
                      </Link>
                      <span>•</span>
                      <span>
                        {list.is_private
                          ? t("common.private")
                          : t("common.public")}{" "}
                        {list.media_type === "movie"
                          ? t("common.movieList")
                          : t("common.seriesList")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
