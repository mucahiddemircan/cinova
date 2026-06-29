"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { customListApi } from "@/lib/api";
import OverlappingCarousel from "@/components/common/OverlappingCarousel";
import Skeleton from "@/components/layout/Skeleton";
import CreateListModal from "@/components/layout/CreateListModal";
import { useLanguage } from "@/providers/language-provider";
import type { User } from "@/types";

interface UserCustomListsViewProps {
  username: string;
  currentUser: User | null;
}

export default function UserCustomListsView({
  username,
  currentUser,
}: UserCustomListsViewProps) {
  const { t, getLocalizedPath } = useLanguage();
  const [customLists, setCustomLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalType, setCreateModalType] = useState<"movie" | "series" | null>(
    null
  );

  const isSelf = currentUser?.username === username;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await customListApi.getByUsername(username);
        setCustomLists(data || []);
      } catch (err) {
        console.error("Özel listeler yüklenemedi:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [username]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-fade-in">
        {[1, 2, 3, 4, 5].map((i) => (
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
    );
  }

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col gap-8">
        {isSelf && (
          <div className="flex flex-row items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-0.5 tracking-tight">
                {t("myLists.manageTitle")}
              </h2>
              <p className="text-text-secondary text-xs md:text-sm font-medium opacity-85">
                {t("myLists.manageSub")}
              </p>
            </div>
            <button
              onClick={() => setCreateModalType("movie")}
              className="px-4 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer text-sm flex items-center gap-2 shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} />
              {t("myLists.newListBtn")}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {customLists.map((list) => (
            <div key={list.id} className="flex flex-col items-start">
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
                  className="text-lg font-black text-white mb-0.5 truncate hover:underline transition-all w-full"
                >
                  {list.title}
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium opacity-80">
                  <Link
                    href={getLocalizedPath(`/${username}`)}
                    className="hover:underline transition-all"
                  >
                    @{username}
                  </Link>
                  <span>•</span>
                  <span>
                    {list.is_private ? t("common.private") : t("common.public")}{" "}
                    {list.media_type === "movie"
                      ? t("common.movieList")
                      : t("common.seriesList")}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {customLists.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
              <p className="text-text-secondary font-bold">
                {t("myLists.noLists")}
              </p>
            </div>
          )}
        </div>
      </div>

      {createModalType && (
        <CreateListModal
          mediaType={createModalType}
          onClose={() => setCreateModalType(null)}
          onSuccess={() => {
            customListApi.getByUsername(username).then(setCustomLists);
            window.dispatchEvent(new CustomEvent("library-updated"));
          }}
        />
      )}
    </div>
  );
}
