"use client";

import Link from "next/link";
import { useLanguage } from "@/providers/language-provider";

interface FollowStatsProps {
  followersCount: number;
  followingCount?: number;
  isPerson?: boolean;
  username?: string;
}

export default function FollowStats({
  followersCount,
  followingCount,
  isPerson,
  username,
}: FollowStatsProps) {
  const { t, getLocalizedPath } = useLanguage();
  const followersLink = username ? getLocalizedPath(`/${username}/followers`) : "#";
  const followingLink = username ? getLocalizedPath(`/${username}/following`) : "#";

  return (
    <div className="flex items-center gap-6">
      <Link href={followersLink} className="transition-all hover:underline">
        <span className="text-[16px] font-bold text-white">
          {followersCount || 0}
        </span>
        <span className="text-[16px] text-text-secondary">
          {" "}
          {t("follows.followers")}
        </span>
      </Link>
      {!isPerson && (
        <Link href={followingLink} className="transition-all hover:underline">
          <span className="text-[16px] font-bold text-white">
            {followingCount || 0}
          </span>
          <span className="text-[16px] text-text-secondary">
            {" "}
            {t("follows.following")}
          </span>
        </Link>
      )}
    </div>
  );
}
