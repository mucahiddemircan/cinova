"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/language-provider";
import { commentApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import { ChevronDown } from "lucide-react";
import LoadingDots from "../common/LoadingDots";
import type { User, CommentSortType, Comment } from "@/types";

interface CommentSystemProps {
  type: string;
  id: number;
  user: User | null;
  limit?: number;
  isFullView?: boolean;
  onCountChange?: (count: number) => void;
}

export default function CommentSystem({
  type,
  id,
  user,
  limit = 3,
  isFullView = false,
  onCountChange,
}: CommentSystemProps) {
  const { t, getLocalizedPath } = useLanguage();
  const [sort, setSort] = useState<CommentSortType>("top");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const {
    data: comments = [],
    isLoading: loading,
    refetch,
  } = useQuery<Comment[]>({
    queryKey: ["comments", type, id, sort],
    queryFn: () => commentApi.getByContent(type, id, sort),
  });

  const totalCount = comments.length;

  useEffect(() => {
    if (onCountChange) onCountChange(totalCount);
  }, [onCountChange, totalCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCommentSubmit = async (content: string, isSpoiler: boolean) => {
    try {
      await commentApi.create({
        tmdb_id: id,
        media_type: type,
        content,
        is_spoiler: isSpoiler,
      });
      await refetch();
    } catch (err) {
      console.error("Yorum gonderme hatasi:", err);
    }
  };

  const displayComments = isFullView ? comments : comments.slice(0, limit);

  return (
    <div id="comments-section" className="scroll-mt-24">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3">
          {t("comments.title")} ({totalCount})
        </h2>

        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-text-secondary text-sm font-medium">{t("category.sortBy")}:</span>

          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 text-white hover:bg-white/5 py-1.5 px-3 rounded-md transition-colors cursor-pointer text-sm font-bold"
            >
              <span>{sort === "top" ? t("comments.sortTop") : t("comments.sortNewest")}</span>
              <ChevronDown
                size={16}
                strokeWidth={3}
                className={`text-white/30 transition-transform duration-300 ${isSortOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 top-full mt-2 bg-bg-surface border border-white/5 rounded-xl shadow-2xl overflow-hidden min-w-[150px] z-[60] animate-fade-in shadow-black/80">
                {[
                  { id: "top", label: t("comments.sortTop") },
                  { id: "newest", label: t("comments.sortNewest") },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSort(opt.id as CommentSortType);
                      setIsSortOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-sm transition-colors cursor-pointer flex justify-between items-center ${
                      sort === opt.id
                        ? "text-white font-bold bg-white/10"
                        : "text-text-secondary hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CommentInput user={user} onSubmit={handleCommentSubmit} />

      <div className="space-y-2">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <LoadingDots size="lg" className="text-white/20" />
          </div>
        ) : displayComments.length === 0 ? (
          <div className="py-12 px-6 rounded-2xl border border-dashed border-white/5 text-center">
            <p className="text-text-secondary text-sm font-medium">{t("comments.noComments")}</p>
          </div>
        ) : (
          <>
            {displayComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} user={user} onUpdate={refetch} />
            ))}

            {!isFullView && totalCount > limit && (
              <div className="mt-8">
                <Link
                  href={getLocalizedPath(`/${type === "series" ? "series" : "movies"}/${id}/comments`)}
                  className="block w-full text-center py-4 bg-bg-surface hover:bg-bg-surface-hover border border-white/5 rounded-xl font-bold text-sm transition-all hover:border-white/10 active:scale-[0.99] group"
                >
                  <span className="text-text-secondary group-hover:text-white transition-colors">
                    {t("comments.seeAllCount", { count: totalCount })}
                  </span>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
