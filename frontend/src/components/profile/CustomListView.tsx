"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/language-provider";
import { customListApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { formatTimeAgo } from "@/lib/utils";
import MovieCard from "@/components/content/MovieCard";
import CardActions from "@/components/content/CardActions";
import { List, LayoutGrid, ArrowDown, ArrowUp, Folder, Clock, Trash2, Lock, Globe } from "lucide-react";
import PlaceholderImage from "@/components/common/PlaceholderImage";
import ErrorState from "@/components/common/ErrorState";
import type { User } from "@/types";

interface CustomListViewProps {
  username: string;
  slug: string;
  currentUser: User | null;
}

type ListItem = {
  id: number;
  tmdb_id: number;
  title: string;
  poster_path?: string | null;
  created_at?: string;
};

type CustomListViewData = {
  id: number;
  title: string;
  description?: string | null;
  user_id?: string;
  is_private?: boolean;
  media_type: "movie" | "series";
  created_at?: string;
  items?: ListItem[];
};

export default function CustomListView({ username, slug, currentUser }: CustomListViewProps) {
  const { t, getLocalizedPath } = useLanguage();
  const router = useRouter();

  const { data: rawList, isLoading: loading, error } = useQuery({
    queryKey: ["custom-list", username, slug],
    queryFn: () => customListApi.getBySlug(username, slug),
  });

  const list = rawList as unknown as CustomListViewData | undefined;

  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("list_view_mode") as "list" | "grid") || "list";
    }
    return "list";
  });
  const [sortBy, setSortBy] = useState<"date" | "alphabet">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("list_view_mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (type: "date" | "alphabet") => {
    if (sortBy === type) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(type);
      setSortOrder("desc");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("customList.deleteConfirm"))) return;
    if (!list) return;
    try {
      await customListApi.delete(String(list.id));
      window.dispatchEvent(new CustomEvent("library-updated"));
      router.push(getLocalizedPath(`/${username}/lists`));
    } catch {
      alert(t("customList.deleteError"));
    }
  };

  const items = useMemo(() => list?.items || [], [list]);
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === "alphabet") {
        const result = (a.title || "").localeCompare(b.title || "");
        return sortOrder === "desc" ? result : -result;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [items, sortBy, sortOrder]);

  const isOwner = !!currentUser && currentUser.id === list?.user_id;

  if (loading) {
    return (
      <div className="animate-fade-in py-8 max-w-7xl mx-auto px-4">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white/5 animate-pulse rounded-2xl" />
            <div className="flex-1 flex flex-col gap-4">
              <div className="h-12 md:h-20 w-3/4 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <ErrorState
        title={t("errors.notFound.title")}
        subtitle={t("errors.notFound.subtitle")}
        buttonText={t("common.backToHome")}
        buttonLink="/"
        errorCode={(error as { status?: number } | null)?.status === 404 ? "404" : undefined}
      />
    );
  }

  return (
    <div className="animate-fade-in py-8 max-w-7xl mx-auto px-4 pb-20">
      <header className="mb-16 relative group">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] bg-gradient-to-br from-brand/20 to-indigo-900/40 flex items-center justify-center shrink-0 shadow-2xl border border-white/5">
            <List size={60} className="md:w-24 md:h-24 text-brand" strokeWidth={2} />
          </div>

          <div className="flex-grow text-center md:text-left pb-2">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black text-white tracking-widest flex items-center gap-2">
                {list.is_private ? <Lock size={12} /> : <Globe size={12} />}
                {list.is_private ? t("customList.privateTitle") : t("customList.publicTitle")}
              </span>
              <span className="text-[10px] font-black text-text-secondary tracking-widest">
                {list.media_type === "movie" ? t("customList.movieCollection") : t("customList.seriesCollection")}
              </span>
            </div>

            <h1 className="text-4xl md:text-7xl font-black text-text-primary tracking-tighter mb-4 leading-tight">{list.title}</h1>

            {list.description && (
              <p className="text-text-secondary text-base md:text-lg font-medium max-w-2xl mb-6 line-clamp-3">{list.description}</p>
            )}

            <div className="flex items-center justify-center md:justify-start gap-4 text-text-secondary font-bold text-sm">
              <div className="flex items-center gap-2">
                <span className="opacity-60 font-black">{t("customList.createdBy")}</span>
                <span className="text-white">{isOwner ? t("customList.you") : `@${username}`}</span>
              </div>
              <span className="opacity-20">•</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{items.length}</span>
                <span className="opacity-60 font-black">{list.media_type === "movie" ? t("common.movie") : t("common.series")}</span>
              </div>
              <span className="opacity-20">•</span>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>{formatTimeAgo(list.created_at || "", t)}</span>
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="absolute top-0 right-0 md:relative md:top-auto md:right-auto flex gap-3">
              <button onClick={handleDelete} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all cursor-pointer group" title={t("customList.deleteTooltip")}>
                <Trash2 size={20} />
              </button>
            </div>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-bg-surface/30 rounded-[3rem] border-2 border-dashed border-white/5">
          <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-8 text-text-secondary/20">
            <Folder size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-bold text-text-secondary">{t("customList.emptyTitle")}</h3>
          <p className="text-text-secondary/60 mt-3 text-center max-w-md">{t("customList.emptySub")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between w-full bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black text-text-secondary tracking-widest">{t("customList.sortBy")}</span>
                <div className="relative" ref={sortRef}>
                  <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-2 text-white bg-white/5 py-2 px-4 rounded-xl transition-all hover:bg-white/10 cursor-pointer text-sm font-bold">
                    <span>{sortBy === "date" ? t("customList.sortByDate") : t("customList.sortByAlpha")}</span>
                    {sortOrder === "desc" ? <ArrowDown size={16} className="text-brand" /> : <ArrowUp size={16} className="text-brand" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center bg-black/20 p-1.5 rounded-xl border border-white/5">
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === "list" ? "bg-white/10 text-white shadow-lg" : "text-text-secondary hover:text-white"}`}>
                <List size={20} />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === "grid" ? "bg-white/10 text-white shadow-lg" : "text-text-secondary hover:text-white"}`}>
                <LayoutGrid size={20} />
              </button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid gap-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {sortedItems.map((item) => (
                <div key={item.id}>
                  <MovieCard movie={{ id: item.tmdb_id, title: item.title, type: list.media_type, poster_path: item.poster_path }} user={currentUser} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col w-full bg-white/[0.01] rounded-3xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-[50px_minmax(0,1fr)_150px_100px] gap-4 px-6 py-4 text-[11px] font-black text-text-secondary tracking-widest border-b border-white/5 bg-white/[0.02]">
                <div className="text-center">{t("customList.tableIndex")}</div>
                <div>{t("customList.tableContent")}</div>
                <div className="text-right">{t("customList.tableDate")}</div>
                <div></div>
              </div>

              <div className="flex flex-col">
                {sortedItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(getLocalizedPath(`/${list.media_type === "series" ? "series" : "movies"}/${item.tmdb_id}`))}
                    className="grid grid-cols-[50px_minmax(0,1fr)_150px_100px] gap-4 items-center px-6 py-4 hover:bg-white/[0.04] transition-all cursor-pointer group border-b border-white/[0.02] last:border-0"
                  >
                    <div className="text-center text-text-secondary font-bold group-hover:text-white">{index + 1}</div>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                        {item.poster_path ? <img src={item.poster_path} alt={item.title} className="w-full h-full object-cover" /> : <PlaceholderImage type={list.media_type} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-white truncate group-hover:text-brand transition-colors">{item.title}</h4>
                        <span className="text-[11px] font-bold text-text-secondary">
                          {list.media_type === "movie" ? t("common.movie") : t("common.series")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm font-medium text-text-secondary group-hover:text-white">{formatTimeAgo(item.created_at || "", t)}</div>
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentUser && <CardActions movie={{ id: item.tmdb_id, title: item.title, type: list.media_type, poster_path: item.poster_path }} user={currentUser} variant="list" />}
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
