"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/providers/language-provider";
import { useMetadata } from "@/providers/metadata-provider";
import { libraryApi, userApi } from "@/lib/api";
import { URL_TO_STATUS } from "@/constants";
import { formatTimeAgo, resolveGenreNames } from "@/lib/utils";
import MovieCard from "@/components/content/MovieCard";
import CardActions from "@/components/content/CardActions";
import PlaceholderImage from "@/components/common/PlaceholderImage";
import ErrorState from "@/components/common/ErrorState";
import Avatar from "@/components/common/Avatar";
import {
  Clock,
  Check,
  ThumbsUp,
  ThumbsDown,
  Folder,
  ArrowDown,
  ArrowUp,
  List,
  LayoutGrid,
  Star,
} from "lucide-react";
import type { ContentItem, PublicProfile, User } from "@/types";

interface UserListViewProps {
  username: string;
  statusUrl: string;
  currentUser: User | null;
  mediaType?: string;
}

type ApiError = Error & { status?: number };

export default function UserListView({
  username,
  statusUrl,
  currentUser,
  mediaType,
}: UserListViewProps) {
  const { t, getLocalizedPath } = useLanguage();
  const { getGenreName } = useMetadata();
  const router = useRouter();

  const status = URL_TO_STATUS[statusUrl] || statusUrl;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [owner, setOwner] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("list_view_mode");
      return stored === "grid" ? "grid" : "list";
    }
    return "list";
  });
  const [sortBy, setSortBy] = useState<"date" | "alphabet" | "rating">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("list_view_mode", viewMode);
  }, [viewMode]);

  const handleSort = (type: "date" | "alphabet" | "rating") => {
    if (sortBy === type) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(type);
      setSortOrder("desc");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const profile = await userApi.getByUsername(username);
        setOwner(profile);

        // Fetch content (optionally filtered by media type)
        const effectiveMediaType =
          mediaType === "movies" ? "movie" : mediaType === "series" ? "series" : null;
        const data = await libraryApi.getUserList(username, status, effectiveMediaType as "movie" | "series" | null);
        const mappedData = data.map((item) => ({
          ...item,
          id: item.tmdb_id || item.id,
        }));
        setItems(mappedData);
      } catch (err) {
        console.error("Liste yükleme hatası:", err);
        if (err instanceof Error) {
          setError(err as ApiError);
        } else {
          setError(new Error(t("common.error")));
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [username, status, mediaType, t]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === "alphabet") {
        const result = (a.title || "").localeCompare(b.title || "");
        return sortOrder === "desc" ? result : -result;
      } else if (sortBy === "rating") {
        const valA = a.rating || a.vote_average || 0;
        const valB = b.rating || b.vote_average || 0;
        return sortOrder === "desc" ? valB - valA : valA - valB;
      } else {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      }
    });
  }, [items, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="animate-fade-in py-8 max-w-7xl mx-auto px-4">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white/5 animate-pulse rounded-none" />
            <div className="flex-grow flex flex-col gap-4">
              <div className="h-12 md:h-20 w-3/4 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 w-full bg-white/5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={error?.message || t("common.error")}
        subtitle={t("listView.emptySub")}
        buttonText={t("common.backToHome")}
        buttonLink="/"
        errorCode={error?.status === 404 ? "404" : undefined}
      />
    );
  }

  const getColorStyles = (s: string) => {
    const styles: Record<string, string> = {
      watchlist: "bg-indigo-950/60 text-indigo-400",
      watched: "bg-emerald-950/60 text-emerald-400",
      like: "bg-pink-950/60 text-pink-400",
      dislike: "bg-red-950/60 text-red-400",
    };
    return styles[s] || "bg-brand/20 text-brand";
  };

  const colorStyle = getColorStyles(status);

  return (
    <div className="animate-fade-in py-8 max-w-7xl mx-auto px-4 pb-20">
      <header className="mb-16">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
          <div
            className={`w-32 h-32 md:w-48 md:h-48 rounded-none flex items-center justify-center shrink-0 transition-transform ${colorStyle}`}
          >
            {status === "watchlist" && <Clock size={60} className="md:w-24 md:h-24" strokeWidth={2} />}
            {status === "watched" && <Check size={60} className="md:w-24 md:h-24" strokeWidth={2} />}
            {status === "like" && <ThumbsUp size={60} className="md:w-24 md:h-24" strokeWidth={2} />}
            {status === "dislike" && <ThumbsDown size={60} className="md:w-24 md:h-24" strokeWidth={2} />}
          </div>

          <div className="flex-grow text-center md:text-left pb-2">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <span className="text-sm font-bold text-white/60 tracking-wide">
                {mediaType === "movies"
                  ? t("listView.movieList")
                  : t("listView.seriesList")}
              </span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-text-primary tracking-tighter mb-4">
              {status === "watchlist" && t("status.watchlist")}
              {status === "watched" && t("status.watched")}
              {status === "like" && t("status.likes")}
              {status === "dislike" && t("status.dislikes")}
              {!["watchlist", "watched", "like", "dislike"].includes(status) &&
                (t(`status.${status.toLowerCase()}`) || status)}
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-3 text-text-secondary font-bold text-lg">
              <Link
                href={getLocalizedPath(`/${owner?.username || ""}`)}
                className="text-text-primary hover:underline transition-colors flex items-center gap-2"
              >
                <Avatar
                  src={owner?.avatar_url}
                  alt={owner?.username}
                  size="xs"
                  type="profile"
                  showBorder={false}
                />
                {owner?.username}
              </Link>
              <span className="opacity-30">•</span>
              <span>
                {mediaType === "movies"
                  ? t("listView.movieCount", { count: items.length })
                  : t("listView.seriesCount", { count: items.length })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-bg-surface/30 rounded-[3rem] border-2 border-dashed border-white/5">
          <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-8 text-text-secondary/20">
            <Folder size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-bold text-text-secondary">
            {t("listView.emptyTitle")}
          </h3>
          <p className="text-text-secondary/60 mt-3 text-center max-w-md">
            {t("listView.emptySub")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-end w-full mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">{t("listView.sortBy")}</span>
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center gap-2 text-white hover:bg-white/5 py-1.5 px-3 rounded-md transition-colors cursor-pointer text-sm font-medium"
                  >
                    <span>
                      {sortBy === "date" && t("listView.sortByDate")}
                      {sortBy === "alphabet" && t("listView.sortByAlpha")}
                      {sortBy === "rating" && t("listView.sortByRating")}
                    </span>
                    {sortOrder === "desc" ? (
                      <ArrowDown size={18} className="text-brand" />
                    ) : (
                      <ArrowUp size={18} className="text-brand" />
                    )}
                  </button>

                  {isSortOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-bg-surface border border-white/5 rounded-lg shadow-xl overflow-hidden min-w-[170px] z-50">
                      {(["date", "alphabet", "rating"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            handleSort(opt);
                            setIsSortOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-sm transition-colors hover:bg-white/10 cursor-pointer flex justify-between items-center ${
                            sortBy === opt
                              ? "text-brand font-bold"
                              : "text-text-secondary hover:text-white"
                          }`}
                        >
                          <span>
                            {opt === "date" && t("listView.sortByDate")}
                            {opt === "alphabet" && t("listView.sortByAlpha")}
                            {opt === "rating" && t("listView.sortByRating")}
                          </span>
                          {sortBy === opt &&
                            (sortOrder === "desc" ? (
                              <ArrowDown size={16} className="text-brand" />
                            ) : (
                              <ArrowUp size={16} className="text-brand" />
                            ))}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">{t("listView.viewMode")}</span>
                <div className="flex items-center bg-bg-surface p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white/10 text-white shadow-lg"
                        : "text-text-secondary hover:text-white"
                    }`}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white/10 text-white shadow-lg"
                        : "text-text-secondary hover:text-white"
                    }`}
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
              {sortedItems.map((item) => (
                <MovieCard key={item.id} movie={item} user={currentUser} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col relative w-full">
              <div className="grid grid-cols-[30px_minmax(0,1fr)_100px_50px_60px] sm:grid-cols-[40px_minmax(0,1fr)_150px_70px_80px] gap-3 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium text-text-secondary border-b border-white/10 mb-2 mt-4 sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-md">
                <div className="flex items-center justify-center font-normal">{t("listView.tableIndex")}</div>

                <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors group w-max" onClick={() => handleSort("alphabet")}>
                  {t("listView.tableTitle")}
                  {sortBy === "alphabet" && (
                    sortOrder === "desc" ? (
                      <ArrowDown size={16} strokeWidth={3} className="text-brand" />
                    ) : (
                      <ArrowUp size={16} strokeWidth={3} className="text-brand" />
                    )
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort("date")}>
                  {t("listView.tableDate")}
                  {sortBy === "date" && (
                    sortOrder === "desc" ? (
                      <ArrowDown size={16} strokeWidth={3} className="text-brand" />
                    ) : (
                      <ArrowUp size={16} strokeWidth={3} className="text-brand" />
                    )
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort("rating")}>
                  {t("listView.tableRating")}
                  {sortBy === "rating" && (
                    sortOrder === "desc" ? (
                      <ArrowDown size={16} strokeWidth={3} className="text-brand" />
                    ) : (
                      <ArrowUp size={16} strokeWidth={3} className="text-brand" />
                    )
                  )}
                </div>

                <div className="flex items-center justify-end">
                </div>
              </div>

              <div className="flex flex-col gap-1 w-full">
                {sortedItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      if (e.button === 0) {
                        router.push(
                          getLocalizedPath(
                            `/${(item.type || item.media_type) === "series" ? "series" : "movies"}/${
                              item.id
                            }`
                          )
                        );
                      }
                    }}
                    className="grid grid-cols-[30px_minmax(0,1fr)_100px_50px_60px] sm:grid-cols-[40px_minmax(0,1fr)_150px_70px_80px] gap-3 sm:gap-4 items-center px-2 py-2 sm:px-4 sm:py-3 rounded-xl bg-transparent hover:bg-white/5 transition-all cursor-pointer group/card relative"
                  >
                    <div className="flex justify-center text-text-secondary group-hover:text-white transition-colors text-sm sm:text-base">
                      {index + 1}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
                      <div className="w-10 h-14 sm:w-12 sm:h-16 rounded overflow-hidden shrink-0 bg-bg-surface border border-white/5">
                        {item.poster_path ? (
                          <img
                            src={item.poster_path}
                            alt={item.title}
                            className="w-full h-full object-cover rounded shadow-sm group-hover:shadow-md transition-shadow"
                          />
                        ) : (
                          <PlaceholderImage type={(item.type || item.media_type || "movie") as "movie" | "series"} iconSize={16} />
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm sm:text-base font-bold text-white line-clamp-2 hover:underline transition-all w-fit max-w-full block">
                          {item.title}
                        </p>
                        <div className="flex flex-col gap-0.5 mt-0.5 sm:mt-1">
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-text-secondary group-hover:text-white/60 transition-colors whitespace-nowrap overflow-hidden">
                            {item.release_date && (
                              <span>{item.release_date.split("-")[0]}</span>
                            )}
                            {item.vote_average && item.vote_average > 0 && (
                              <>
                                {item.release_date && <span>•</span>}
                                <div className="flex items-center gap-0.5">
                                  <Star size={10} fill="#eab308" color="#eab308" />
                                  <span>{item.vote_average.toFixed(1)}</span>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-text-secondary/50 group-hover:text-white/40 italic truncate max-w-full">
                            {resolveGenreNames(
                              item.genre_ids,
                              getGenreName,
                              item.type || item.media_type,
                              t("common.genreNotSpecified")
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-text-secondary flex justify-end truncate group-hover:text-white text-right transition-colors">
                      {item.created_at ? formatTimeAgo(item.created_at, t) : "-"}
                    </div>

                    <div className="flex justify-end gap-1.5 text-xs sm:text-sm items-center">
                      {item.vote_average && item.vote_average > 0 ? (
                        <>
                          <Star size={12} fill="#eab308" color="#eab308" />
                          <span className="font-medium text-text-secondary group-hover:text-white transition-colors">{item.vote_average.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                      {item.rating && item.rating > 0 && (
                        <span className="ml-1 text-xs text-brand font-bold">({item.rating})</span>
                      )}
                    </div>

                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <CardActions movie={item} user={currentUser} variant="list" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
