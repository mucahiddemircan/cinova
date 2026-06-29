"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/language-provider";
import { userApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import FollowButton from "./FollowButton";
import FollowStats from "./FollowStats";
import FollowMenu from "./FollowMenu";
import Skeleton from "../layout/Skeleton";
import { useLibraryStore } from "@/stores/library-store";
import Avatar from "../common/Avatar";
import ErrorState from "../common/ErrorState";
import type { User } from "@/types";

interface ProfileLayoutProps {
  user: User | null;
  username: string;
  children: React.ReactNode;
}

type ProfileViewData = {
  username: string;
  avatar_url?: string | null;
  is_following?: boolean;
  followers_count?: number;
  following_count?: number;
};

export default function ProfileLayout({
  user: currentUser,
  username,
  children,
}: ProfileLayoutProps) {
  const { t, getLocalizedPath } = useLanguage();
  const pathname = usePathname();
  const {
    data: profileData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => userApi.getByUsername(username),
  });
  const profile = profileData as unknown as ProfileViewData | undefined;

  const isSelf = currentUser?.username === username;

  const { isFollowingUser } = useLibraryStore();
  const isCurrentlyFollowing = isFollowingUser(username);
  const displayedFollowersCount = useMemo(() => {
    if (!profile) return 0;
    const initialFollowing = !!profile.is_following;
    const diff = (isCurrentlyFollowing ? 1 : 0) - (initialFollowing ? 1 : 0);
    return Math.max(0, (profile.followers_count || 0) + diff);
  }, [profile, isCurrentlyFollowing]);

  if (loading) {
    return (
      <div className="w-full animate-fade-in">
        <header className="mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 text-center md:text-left">
          <div className="shrink-0">
            <Skeleton
              className="w-32 h-32 md:w-40 md:h-40 rounded-full"
              variant="shimmer"
            />
          </div>

          <div className="flex flex-col gap-5 items-center md:items-start w-full min-w-0">
            <Skeleton
              className="h-12 md:h-20 w-3/4 max-w-md"
              variant="shimmer"
            />

            <div className="flex gap-6">
              <Skeleton className="h-6 w-24" variant="shimmer" />
              <Skeleton className="h-6 w-24" variant="shimmer" />
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full mt-2">
              <Skeleton className="h-11 w-32 rounded-xl" variant="shimmer" />
              <Skeleton className="h-11 w-11 rounded-xl" variant="shimmer" />
            </div>
          </div>
        </header>

        <div className="flex items-center gap-6 md:gap-8 mb-10 border-b border-white/5 pb-[1px]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pb-4">
              <Skeleton className="h-5 w-24 md:w-32" variant="shimmer" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-4">
              <Skeleton
                className="aspect-[2/3] w-full rounded-2xl"
                variant="shimmer"
              />
              <Skeleton className="h-6 w-3/4" variant="shimmer" />
              <Skeleton className="h-4 w-1/2" variant="shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if ((error as { status?: number } | null)?.status === 404) {
    return (
      <ErrorState
        title={t("errors.notFound.user")}
        subtitle={t("errors.notFound.subtitle")}
        buttonText={t("common.backToHome")}
        buttonLink="/"
        errorCode="404"
      />
    );
  }

  if (error || !profile) {
    return (
      <ErrorState
        title={error?.message || t("errors.notFound.user")}
        subtitle={t("errors.notFound.subtitle")}
        buttonText={t("common.backToHome")}
        buttonLink="/"
      />
    );
  }

  const tabs = [
    {
      name: t("profileLayout.overview"),
      path: getLocalizedPath(`/${username}`),
      exact: true,
    },
    {
      name: t("profileLayout.likes"),
      path: getLocalizedPath(`/${username}/likes`),
      exact: false,
    },
    {
      name: t("profileLayout.dislikes"),
      path: getLocalizedPath(`/${username}/dislikes`),
      exact: false,
    },
    {
      name: t("profileLayout.watchlist"),
      path: getLocalizedPath(`/${username}/watchlist`),
      exact: false,
    },
    {
      name: t("profileLayout.watched"),
      path: getLocalizedPath(`/${username}/watched`),
      exact: false,
    },
    {
      name: t("profileLayout.lists"),
      path: getLocalizedPath(`/${username}/lists`),
      exact: true,
    },
  ];

  return (
    <div className="w-full animate-fade-in">
      <header className="mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 text-center md:text-left">
        <div className="shrink-0">
          <Avatar
            src={profile.avatar_url || ""}
            alt={profile.username}
            size="xl"
            type="profile"
            className="w-32 h-32 md:w-40 md:h-40 shadow-2xl"
          />
        </div>

        <div className="flex flex-col gap-5 items-center md:items-start w-full min-w-0">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter leading-tight break-all">
            {profile.username}
          </h1>

          <FollowStats
            followersCount={displayedFollowersCount}
            followingCount={profile.following_count || 0}
            username={username}
          />

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full">
            <FollowButton
              isSelf={isSelf}
              isFollowing={!!profile.is_following}
              username={username}
              type="user"
              user={currentUser}
              extraData={{
                username: username,
                name: username,
                avatar_url: profile.avatar_url || undefined,
              }}
            />
            {!isSelf && (
              <FollowMenu
                isFollowing={!!profile.is_following}
                username={username}
                type="user"
                user={currentUser}
                extraData={{
                  username: username,
                  name: username,
                  avatar_url: profile.avatar_url || undefined,
                }}
              />
            )}
          </div>
        </div>
      </header>

      <nav className="flex items-center gap-6 md:gap-8 mb-10 border-b border-white/5 relative overflow-x-auto scrollbar-none pb-[1px]">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.path
            : pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`pb-4 text-[13px] md:text-sm font-bold tracking-wide transition-all relative whitespace-nowrap shrink-0 ${
                isActive
                  ? "text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.name}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full z-10" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-[400px]">
        {/* Child component represents the outlet where we can pass the profile data and isSelf via context if needed, but in Next.js we just render children. Any child page will fetch its own specific data or share it via a context provider if needed. */}
        {children}
      </div>
    </div>
  );
}
