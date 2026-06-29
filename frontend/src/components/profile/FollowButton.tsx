"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/language-provider";
import { followsApi } from "@/lib/api";
import { useLibraryStore } from "@/stores/library-store";
import { Settings, Loader2, Plus, Pencil } from "lucide-react";
import type { User } from "@/types";

interface FollowButtonProps {
  isSelf?: boolean;
  onToggle?: (isFollowing: boolean) => void;
  username?: string;
  personId?: number;
  type: "user" | "person";
  extraData?: any;
  isFollowing?: boolean;
  size?: "sm" | "md";
  user: User | null;
}

export default function FollowButton({
  isSelf,
  onToggle,
  username,
  personId,
  type,
  extraData,
  isFollowing: propFollowing,
  size = "md",
  user,
}: FollowButtonProps) {
  const { t, getLocalizedPath } = useLanguage();
  const { isFollowingUser, isFollowingPerson, updateLocalStatus } =
    useLibraryStore();
  const [loading, setLoading] = useState(false);

  const followingFromContext =
    type === "user" && username
      ? isFollowingUser(username)
      : personId
      ? isFollowingPerson(personId)
      : false;

  const following =
    propFollowing !== undefined ? propFollowing : followingFromContext;

  const requireAuth = () => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: t("errors.authRequired") })
      );
      return false;
    }
    return true;
  };

  if (isSelf) {
    return (
      <Link
        href={getLocalizedPath("/settings")}
        className={`${
          size === "sm"
            ? "px-3 py-1.5 text-[10px] rounded-lg"
            : "px-4 py-2 text-xs rounded-xl"
        } bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5 flex items-center gap-2`}
      >
        <Pencil size={size === "sm" ? 12 : 14} strokeWidth={2.5} />
        {t("profile.editProfile")}
      </Link>
    );
  }

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth() || loading) return;

    setLoading(true);
    const contextType = type === "user" ? "follow-user" : "follow-person";
    const id = type === "user" ? username! : personId!;

    updateLocalStatus(contextType as any, id, !following, !following ? extraData : {});
    onToggle?.(!following);

    try {
      if (following) {
        if (type === "user" && username) await followsApi.unfollowUser(username);
        else if (personId) await followsApi.unfollowPerson(personId);
      } else {
        if (type === "user" && username) await followsApi.followUser(username);
        else if (personId) await followsApi.followPerson(personId);
      }
    } catch (err) {
      console.error("Takip hatası:", err);
      updateLocalStatus(contextType as any, id, following);
      onToggle?.(following);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses =
    size === "sm"
      ? "px-4 py-1.5 rounded-lg text-[10px] min-w-[80px]"
      : "px-8 py-3 rounded-2xl text-sm min-w-[140px]";

  return (
    <button
      onClick={handleFollow}
      onMouseDown={(e) => e.stopPropagation()}
      className={`${sizeClasses} font-bold transition-all flex items-center justify-center gap-1.5 ${
        following
          ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
          : "bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20"
      } active:scale-95 cursor-pointer ${
        loading ? "opacity-70" : "opacity-100"
      }`}
    >
      {!following && <Plus size={size === "sm" ? 14 : 18} strokeWidth={2.5} />}

      <span>{following ? t("follows.unfollow") : t("follows.follow")}</span>
    </button>
  );
}
