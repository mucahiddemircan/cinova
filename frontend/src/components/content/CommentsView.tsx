"use client";

import { useLanguage } from "@/providers/language-provider";
import { contentApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import CommentSystem from "@/components/comments/CommentSystem";
import Skeleton from "@/components/layout/Skeleton";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { useAuthStore } from "@/stores/auth-store";

interface CommentsViewProps {
  type: "movie" | "series";
  id: string;
}

export default function CommentsView({ type, id }: CommentsViewProps) {
  const { t, getLocalizedPath } = useLanguage();
  const user = useAuthStore((s) => s.user);

  const { data: movie, isLoading } = useQuery({
    queryKey: ["details", type, id],
    queryFn: () => contentApi.getById(type, id),
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in w-full py-12 container mx-auto px-6 max-w-4xl">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full py-12 container mx-auto px-6 max-w-4xl">
      <div className="mb-10">
        <Link
          href={getLocalizedPath(`/${type === "series" ? "series" : "movies"}/${id}`)}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-4 group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">{t("common.back")}</span>
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          {movie?.title}
        </h1>
        <p className="text-text-secondary font-medium mt-1">{t("comments.title")}</p>
      </div>

      <CommentSystem type={type} id={Number(id)} user={user} isFullView />
    </div>
  );
}
