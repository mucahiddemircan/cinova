"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/providers/language-provider";
import { followsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import PersonCard from "@/components/content/PersonCard";
import { Users } from "lucide-react";
import Skeleton from "@/components/layout/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import type { PublicProfile, User, Person } from "@/types";

interface FollowsListViewProps {
  username: string;
  type: "followers" | "following";
  user: User | null;
}

interface FollowingData {
  users: PublicProfile[];
  people: Person[];
}

export default function FollowsListView({
  username,
  type,
  user,
}: FollowsListViewProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"user" | "person">("user");
  const [sortBy, setSortBy] = useState<"alpha" | "recent">("alpha");

  const {
    data = { users: [], people: [] } as FollowingData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["follows", username, type],
    queryFn: async () => {
      if (type === "followers") {
        const followers = await followsApi.getFollowers(username);
        return { users: followers, people: [] } as FollowingData;
      }
      return followsApi.getFollowing(username);
    },
  });

  const effectiveActiveTab =
    type === "following" &&
    activeTab === "user" &&
    data?.users &&
    data.users.length === 0 &&
    data?.people &&
    data.people.length > 0
      ? "person"
      : activeTab;

  const items: Array<PublicProfile | Person> = useMemo(() => {
    if (!data) return [];
    const rawItems = effectiveActiveTab === "user" ? data.users : data.people;
    return Array.isArray(rawItems) ? rawItems : [];
  }, [data, effectiveActiveTab]);

  const sortedItems = useMemo(() => {
    const result = [...items].sort((a, b) => {
      if (sortBy === "alpha") {
        const nameA =
          effectiveActiveTab === "user"
            ? (a as PublicProfile).username
            : (a as Person).name;
        const nameB =
          effectiveActiveTab === "user"
            ? (b as PublicProfile).username
            : (b as Person).name;
        return (nameA || "").localeCompare(nameB || "", "tr");
      }
      return 0;
    });

    if (sortBy === "recent") {
      result.reverse();
    }
    return result;
  }, [items, sortBy, effectiveActiveTab]);

  if (loading) {
    return (
      <div className="animate-fade-in pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-4 py-6">
              <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full" variant="shimmer" />
              <Skeleton className="h-4 w-24" variant="shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={(error as Error)?.message || t("common.error")}
        subtitle={t("follows.emptySub")}
        buttonText={t("common.backToHome")}
        buttonLink="/"
      />
    );
  }

  const title = type === "followers" ? t("follows.followers") : t("follows.following");

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 pb-12">
      <header className="sticky top-0 z-30 bg-bg-base/95 backdrop-blur-md pt-8 pb-6 mb-10 border-b border-white/5">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight mb-1">{title}</h1>
            <p className="text-text-secondary text-sm font-medium opacity-60">
              {type === "followers"
                ? t("follows.followersSub", { username })
                : effectiveActiveTab === "user"
                ? t("follows.followingProfilesSub", { username })
                : t("follows.followingPeopleSub", { username })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {type === "following" && data.people?.length > 0 && (
              <div className="flex p-1 bg-white/5 rounded-full border border-white/10 shadow-lg backdrop-blur-sm w-full sm:w-auto overflow-hidden">
                <button
                  onClick={() => setActiveTab("user")}
                  className={`flex-1 sm:px-6 py-2 rounded-full font-bold transition-all cursor-pointer text-[11px] whitespace-nowrap ${
                    effectiveActiveTab === "user" ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-white"
                  }`}
                >
                  {t("follows.profilesTab")}
                </button>
                <button
                  onClick={() => setActiveTab("person")}
                  className={`flex-1 sm:px-6 py-2 rounded-full font-bold transition-all cursor-pointer text-[11px] whitespace-nowrap ${
                    effectiveActiveTab === "person" ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-white"
                  }`}
                >
                  {t("follows.peopleTab")}
                </button>
              </div>
            )}

            <div className="flex p-1 bg-white/5 rounded-full border border-white/10 shadow-lg w-full sm:w-auto overflow-hidden">
              <button
                onClick={() => setSortBy("alpha")}
                className={`flex-1 sm:px-6 py-2 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  sortBy === "alpha" ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-white"
                }`}
              >
                {t("follows.sortAlpha")}
              </button>
              <button
                onClick={() => setSortBy("recent")}
                className={`flex-1 sm:px-6 py-2 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  sortBy === "recent" ? "bg-white text-black shadow-md" : "text-text-secondary hover:text-white"
                }`}
              >
                {type === "followers" ? t("follows.sortRecentFollowers") : t("follows.sortRecentFollowing")}
              </button>
            </div>
          </div>
        </div>
      </header>

      {sortedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 rounded-2xl overflow-hidden">
          {sortedItems.map((item) => {
            const id = effectiveActiveTab === "user" ? (item as PublicProfile).username : (item as Person).id;
            const personProp =
              effectiveActiveTab === "user"
                ? {
                    ...(item as PublicProfile),
                    name: (item as PublicProfile).username,
                    title: (item as PublicProfile).username,
                    type: "profile",
                    known_for_department: t("follows.profileTag"),
                    profile_path: (item as PublicProfile).avatar_url,
                  }
                : item;

            return (
              <div key={id}>
                <PersonCard person={personProp} user={user} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 bg-bg-surface/10 rounded-[4rem] border-2 border-dashed border-white/5">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 text-text-secondary/20">
            <Users size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-bold text-text-secondary opacity-50">
            {type === "followers" ? t("follows.noFollowers") : t("follows.noFollowing")}
          </h3>
          <p className="text-text-secondary/30 mt-2 font-medium">{t("follows.emptySub")}</p>
        </div>
      )}
    </div>
  );
}
