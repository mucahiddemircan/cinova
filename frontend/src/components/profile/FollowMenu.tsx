"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/providers/language-provider";
import { followsApi } from "@/lib/api";
import { useLibraryStore } from "@/stores/library-store";
import { MoreHorizontal, Plus, Copy } from "lucide-react";
import type { User } from "@/types";

interface FollowMenuProps {
  onToggle?: (isFollowing: boolean) => void;
  username?: string;
  personId?: number;
  type?: "user" | "person";
  isFollowing?: boolean;
  extraData?: any;
  user: User | null;
}

export default function FollowMenu({
  onToggle,
  username,
  personId,
  type = "user",
  isFollowing: propFollowing,
  extraData,
  user,
}: FollowMenuProps) {
  const { t } = useLanguage();
  const { isFollowingUser, isFollowingPerson, updateLocalStatus } =
    useLibraryStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyToClipboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById("copy-link-btn");
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = t("followMenu.copied");
        setTimeout(() => {
          btn.innerHTML = originalText;
          setIsOpen(false);
        }, 2000);
      }
    });
  };

  const handleFollow = async () => {
    if (!requireAuth()) {
      setIsOpen(false);
      return;
    }

    const contextType = type === "user" ? "follow-user" : "follow-person";
    const id = type === "user" ? username! : personId!;
    const newState = !following;

    updateLocalStatus(contextType as any, id, newState, newState ? extraData : {});
    onToggle?.(newState);
    setIsOpen(false);

    try {
      if (newState) {
        if (type === "user" && username) await followsApi.followUser(username);
        else if (personId) await followsApi.followPerson(personId);
      } else {
        if (type === "user" && username) await followsApi.unfollowUser(username);
        else if (personId) await followsApi.unfollowPerson(personId);
      }
    } catch (err) {
      console.error(err);
      updateLocalStatus(contextType as any, id, !newState);
      onToggle?.(!newState);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-all border border-white/5 active:scale-90 cursor-pointer"
      >
        <MoreHorizontal size={20} strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-bg-surface border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in-up">
          <button
            onClick={handleFollow}
            className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center gap-3 cursor-pointer ${
              following
                ? "text-red-400 hover:bg-red-400/10"
                : "text-text-primary hover:bg-brand hover:text-white"
            }`}
          >
            {following ? (
              <>
                <Plus size={16} strokeWidth={2} className="rotate-45" />
                {t("follows.unfollow")}
              </>
            ) : (
              <>
                <Plus size={16} strokeWidth={2} />
                {t("follows.follow")}
              </>
            )}
          </button>
          <button
            id="copy-link-btn"
            onClick={copyToClipboard}
            className="w-full text-left px-4 py-3 text-sm font-bold text-text-primary hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer"
          >
            <Copy size={16} strokeWidth={2} />
            {type === "user"
              ? t("followMenu.copyProfile")
              : t("followMenu.copyPerson")}
          </button>
        </div>
      )}
    </div>
  );
}
