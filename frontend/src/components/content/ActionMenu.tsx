"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { libraryApi, followsApi, customListApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useLibraryStore } from "@/stores/library-store";
import { useLanguage } from "@/providers/language-provider";
import {
  ThumbsUp,
  ThumbsDown,
  Plus,
  Play,
  Users,
  Eye,
  Clock,
  Share,
  ChevronRight,
  Copy,
  SquarePlus,
  SquareCheck,
  UserPlus,
  UserCheck,
  X,
  List,
} from "lucide-react";
import CreateListModal from "../layout/CreateListModal";
import type { User } from "@/types";

interface ActionMenuProps {
  movie: any;
  position: any;
  onClose: () => void;
  onInteractionToggle?: (type: "like" | "dislike") => void;
  onListSelect?: (status: "watchlist" | "watched") => void;
  interactionStatus?: string | null;
  watchlistStatus?: string | null;
  user: User | null;
  initialView?: "default" | "lists";
}

export default function ActionMenu({
  movie,
  position,
  onClose,
  onInteractionToggle: propOnInteractionToggle,
  onListSelect: propOnListSelect,
  interactionStatus: propInteractionStatus,
  watchlistStatus: _propWatchlistStatus,
  user,
  initialView = "default",
}: ActionMenuProps) {
  const { t, getLocalizedPath } = useLanguage();
  const {
    getInteractionStatus,
    getItemStatus,
    isFollowingUser,
    isFollowingPerson,
    updateLocalStatus,
  } = useLibraryStore();
  const router = useRouter();

  const requireAuth = () => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: t("errors.authRequired") })
      );
      return false;
    }
    return true;
  };

  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(
    initialView === "lists" ? "lists" : null
  );
  const [submenuTop, setSubmenuTop] = useState(0);

  const itemStatus = getItemStatus(movie.id);
  const currentInteraction =
    propInteractionStatus !== undefined
      ? propInteractionStatus
      : getInteractionStatus(movie.id);
  const currentIsFollowing =
    movie.type === "profile"
      ? isFollowingUser(movie.title)
      : isFollowingPerson(movie.id);

  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [customListOverrides, setCustomListOverrides] = useState<Record<string, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: customLists = [], isFetching: customListLoading, refetch: refetchLists } = useQuery<any[]>({
    queryKey: ["custom-lists", user?.id, movie.id, movie.type],
    queryFn: async () => {
      const lists = await customListApi.list();
      return lists.filter(
        (l: any) =>
          l.media_type === (movie.type === "series" ? "series" : "movie")
      );
    },
    enabled: !!user,
  });

  const initialCustomListMap = useMemo(() => {
    const initial: Record<string, boolean> = {};
    customLists.forEach((l: any) => {
      initial[l.id] = l.items?.some((i: any) => i.tmdb_id === movie.id);
    });
    return initial;
  }, [customLists, movie.id]);

  const closeSubmenuWithDelay = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 300);
  };

  const cancelCloseSubmenu = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const [tempStatus, setTempStatus] = useState({
    watchlist: itemStatus.watchlist,
    watched: itemStatus.watched,
    like: itemStatus.liked,
    dislike: itemStatus.disliked,
  });
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const isListsOnly = initialView === "lists";

  const handleInteractionToggle = async (type: "like" | "dislike") => {
    if (isListsOnly) {
      setTempStatus((prev) => {
        const isDisliked = type === "dislike";
        const isLiked = type === "like";
        const newState = { ...prev, [type]: !prev[type] };

        if (!prev[type]) {
          if (isLiked) newState.dislike = false;
          if (isDisliked) newState.like = false;
        }
        return newState;
      });
      setPendingChanges((prev) => {
        const next = new Set(prev);
        next.add("like");
        next.add("dislike");
        return next;
      });
      return;
    }

    if (propOnInteractionToggle) {
      propOnInteractionToggle(type);
      onClose();
      return;
    }

    if (!requireAuth()) {
      onClose();
      return;
    }

    const isRemoving = itemStatus[type === "like" ? "liked" : "disliked"];
    const newInteraction = isRemoving ? null : type;
    updateLocalStatus(type, movie.id, !isRemoving);

    const interactionLabel = t(`status.${type}s`);
    const msg = isRemoving
      ? t("common.removedFromList", { label: interactionLabel })
      : t("common.addedToList", { label: interactionLabel });
    window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));

    try {
      await libraryApi.toggle({
        tmdb_id: movie.id,
        media_type: movie.type === "series" ? "series" : "movie",
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        release_date: movie.release_date || movie.first_air_date,
        genre_ids: Array.isArray(movie.genre_ids)
          ? movie.genre_ids.join(",")
          : movie.genre_ids,
        action: type,
        value: !isRemoving,
      });
    } catch (err) {
      console.error(err);
      updateLocalStatus("interaction", movie.id, currentInteraction as any);
    }
  };

  const handleListSelect = async (newStatus: "watchlist" | "watched") => {
    if (isListsOnly) {
      setTempStatus((prev) => {
        const newState = { ...prev, [newStatus]: !prev[newStatus] };
        if (newStatus === "watched" && newState.watched) {
          newState.watchlist = false;
        }
        return newState;
      });
      setPendingChanges((prev) => {
        const next = new Set(prev);
        next.add("watchlist");
        next.add("watched");
        return next;
      });
      return;
    }

    if (propOnListSelect) {
      propOnListSelect(newStatus);
      onClose();
      return;
    }

    if (!requireAuth()) {
      onClose();
      return;
    }

    const isRemoving =
      itemStatus[newStatus === "watchlist" ? "watchlist" : "watched"];

    updateLocalStatus(newStatus, movie.id, !isRemoving);

    const listLabel = t(`status.${newStatus}`);
    const msg = isRemoving
      ? t("common.removedFromList", { label: listLabel })
      : t("common.addedToList", { label: listLabel });
    window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));

    try {
      await libraryApi.toggle({
        tmdb_id: movie.id,
        media_type: movie.type === "series" ? "series" : "movie",
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        release_date: movie.release_date || movie.first_air_date,
        genre_ids: Array.isArray(movie.genre_ids)
          ? movie.genre_ids.join(",")
          : movie.genre_ids,
        action: newStatus,
        value: !isRemoving,
      });
    } catch (err) {
      console.error(err);
      updateLocalStatus(newStatus, movie.id, isRemoving);
    }
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const mediaType = movie.type === "series" ? "series" : "movie";

      const keys = ["watchlist", "watched", "like", "dislike"] as const;

      const changes: { key: string; value: boolean }[] = [];
      keys.forEach((key) => {
        const newValue = tempStatus[key];
        const statusKey =
          key === "like" ? "liked" : key === "dislike" ? "disliked" : key;
        const oldValue = itemStatus[statusKey as keyof typeof itemStatus];

        if (newValue !== oldValue) {
          changes.push({ key, value: newValue as boolean });
        }
      });

      for (const change of changes) {
        await libraryApi.toggle({
          tmdb_id: movie.id,
          media_type: mediaType,
          title: movie.title || movie.name,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          release_date: movie.release_date || movie.first_air_date,
          genre_ids: movie.genre_ids,
          action: change.key,
          value: change.value,
        });
        updateLocalStatus(change.key as any, movie.id, change.value);
      }

      for (const list of customLists as any[]) {
        const wasInList = list.items?.some((i: any) => i.tmdb_id === movie.id);
        const isNowInList =
          customListOverrides[list.id] ?? initialCustomListMap[list.id] ?? false;
        if (wasInList !== isNowInList) {
          if (isNowInList) {
            await customListApi.addItems(list.id, [
              { tmdb_id: movie.id, media_type: mediaType },
            ]);
          } else {
            await customListApi.removeItem(list.id, movie.id);
          }
        }
      }

      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: t("common.saved") })
      );

      onClose();
    } catch (err) {
      console.error("Kaydetme hatası:", err);
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: t("common.error") })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!requireAuth()) {
      onClose();
      return;
    }

    const isFollowing = currentIsFollowing;
    const type = movie.type === "profile" ? "follow-user" : "follow-person";
    const extraData = !isFollowing
      ? {
          name: movie.title || movie.name,
          username: movie.title || movie.name,
          profile_path: movie.poster_path,
          avatar_url: movie.poster_path,
          tmdb_id: movie.id,
        }
      : {};

    updateLocalStatus(
      type as any,
      movie.type === "profile" ? movie.title || movie.name : movie.id,
      !isFollowing,
      extraData
    );

    const msg = !isFollowing
      ? t("social.userFollowed", { user: movie.title || movie.name })
      : t("social.userUnfollowed", { user: movie.title || movie.name });
    window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));

    try {
      if (movie.type === "profile") {
        isFollowing
          ? await followsApi.unfollowUser(movie.title || movie.name)
          : await followsApi.followUser(movie.title || movie.name);
      } else {
        isFollowing
          ? await followsApi.unfollowPerson(movie.id)
          : await followsApi.followPerson(movie.id);
      }
      onClose();
    } catch (err) {
      console.error(err);
      updateLocalStatus(
        type as any,
        movie.type === "profile" ? movie.title || movie.name : movie.id,
        isFollowing
      );
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showCreateModal) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest(
          `button[title="${t("common.options")}"]`
        ) &&
        !(e.target as Element).closest(
          `button[title="${t("common.addToList")}"]`
        )
      ) {
        onClose();
      }
    };
    const handleScroll = () => {
      if (showCreateModal) return;
      onClose();
    };
    const handleCloseAll = () => {
      if (showCreateModal) return;
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("close-all-menus", handleCloseAll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("close-all-menus", handleCloseAll);
    };
  }, [onClose, showCreateModal, t]);

  const handleShare = () => {
    const url = `${window.location.origin}${getNavPath()}`;
    navigator.clipboard.writeText(url);
    window.dispatchEvent(
      new CustomEvent("show-toast", { detail: t("social.linkCopied") })
    );
    onClose();
  };

  const getNavPath = () => {
    if (movie.type === "profile") return `/${movie.title || movie.name}`;
    if (movie.type === "person") return `/people/${movie.id}`;
    return `/${movie.type === "series" ? "series" : "movies"}/${movie.id}`;
  };

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    onMouseEnter,
    hasSubmenu,
    rightIcon: RightIcon,
    active,
    interactionType,
  }: any) => {
    const handleMouseEnter = (e: React.MouseEvent) => {
      cancelCloseSubmenu();
      if (hasSubmenu && menuRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();
        setSubmenuTop(rect.top - menuRect.top - 6);
        onMouseEnter();
      } else {
        onMouseEnter?.();
      }
    };

    return (
      <button
        onMouseEnter={handleMouseEnter}
        onClick={onClick}
        className={`w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-all flex items-center justify-between group/item rounded-sm text-text-primary/90 hover:text-white ${
          hasSubmenu ? "cursor-default" : "cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon
              size={17}
              strokeWidth={1.5}
              className={active ? "text-white" : ""}
            />
          )}
          <span className="text-[13px] font-medium">{label}</span>
        </div>
        {hasSubmenu && (
          <ChevronRight
            size={14}
            strokeWidth={2}
            className="text-text-secondary/50 group-hover/item:text-white transition-colors"
          />
        )}
        {RightIcon && (
          <div
            className="p-1 transition-all"
            onClick={(e) => {
              if (interactionType) {
                e.stopPropagation();
                handleInteractionToggle(interactionType);
              }
            }}
          >
            <RightIcon
              size={18}
              strokeWidth={1.5}
              className={
                active
                  ? "icon-active-check"
                  : "text-white/30 group-hover/item:text-white"
              }
            />
          </div>
        )}
      </button>
    );
  };

  const TopIcon = ({ status, icon: Icon, label }: any) => {
    const isInteraction = status === "like" || status === "dislike";

    let isActive = false;
    if (isListsOnly) {
      isActive = tempStatus[status as keyof typeof tempStatus] as boolean;
    } else {
      isActive = isInteraction
        ? itemStatus[status === "like" ? "liked" : "disliked"]
        : itemStatus[status as "watchlist" | "watched"];
    }

    const handleClick = () => {
      if (isInteraction) handleInteractionToggle(status);
      else handleListSelect(status);
    };

    return (
      <button
        onClick={handleClick}
        className="group flex flex-col items-center justify-center transition-all w-14 cursor-pointer py-1.5"
        title={label}
      >
        <Icon
          size={25}
          strokeWidth={isActive ? 2.5 : 2}
          className={`transition-all ${
            isActive
              ? "text-white"
              : "text-[#555] group-hover:text-white group-hover:scale-110 active:scale-95"
          }`}
          fill={isActive ? "currentColor" : "none"}
        />
      </button>
    );
  };

  const CustomListRow = ({ list }: { list: any }) => {
    const wasInList = list.items?.some((i: any) => i.tmdb_id === movie.id);
    const [instantSaved, setInstantSaved] = useState(wasInList);
    const displaySaved = isListsOnly
      ? customListOverrides[list.id] ?? wasInList
      : instantSaved;
    const [isListLoading, setIsListLoading] = useState(false);

    const toggleList = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!requireAuth()) {
        if (isListsOnly) onClose();
        return;
      }

      if (isListsOnly) {
        const currentSaved = customListOverrides[list.id] ?? wasInList;
        setCustomListOverrides((prev) => ({
          ...prev,
          [list.id]: !currentSaved,
        }));
        setPendingChanges((prev) => new Set(prev).add(`custom_${list.id}`));
      } else {
        setIsListLoading(true);
        try {
          if (displaySaved) {
            await customListApi.removeItem(list.id, movie.id);
            setInstantSaved(false);
            window.dispatchEvent(
              new CustomEvent("show-toast", {
                detail: t("common.removedFromList", { label: list.title }),
              })
            );
          } else {
            await customListApi.addItems(list.id, [
              {
                tmdb_id: movie.id,
                media_type: movie.type === "series" ? "series" : "movie",
              },
            ]);
            setInstantSaved(true);
            window.dispatchEvent(
              new CustomEvent("show-toast", {
                detail: t("common.addedToList", { label: list.title }),
              })
            );
          }
        } catch (err) {
          console.error(err);
          window.dispatchEvent(
            new CustomEvent("show-toast", { detail: t("errors.generic") })
          );
        } finally {
          setIsListLoading(false);
        }
      }
    };

    return (
      <div
        onClick={toggleList}
        className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] transition-all cursor-pointer group rounded-sm"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <List
            size={16}
            strokeWidth={1.5}
            className={`flex-shrink-0 ${
              displaySaved ? "text-brand" : "text-[#666] group-hover:text-white"
            }`}
          />
          <span className="font-medium text-[13px] text-white/90 transition-colors group-hover:text-white truncate">
            {list.title}
          </span>
        </div>
        {isListLoading ? (
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
        ) : displaySaved ? (
          <SquareCheck
            size={18}
            strokeWidth={1.5}
            className="icon-active-check flex-shrink-0"
          />
        ) : (
          <SquarePlus
            size={18}
            strokeWidth={1.5}
            className="text-[#555] group-hover:text-white flex-shrink-0"
          />
        )}
      </div>
    );
  };

  const CreateNewListRow = () => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setShowCreateModal(true);
      }}
      className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] transition-all cursor-pointer group rounded-sm border-b border-white/[0.05] mb-1"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <Plus
          size={16}
          strokeWidth={1.5}
          className="flex-shrink-0 text-[#666] group-hover:text-white"
        />
        <span className="font-medium text-[13px] text-white/90 transition-colors group-hover:text-white truncate">
          {t("myLists.newListBtn")}
        </span>
      </div>
    </div>
  );

  const getSubmenuClass = () => {
    const viewportWidth = window.innerWidth;
    const menuRect = menuRef.current?.getBoundingClientRect();
    if (!menuRect) return "left-full";
    if (menuRect.right + 180 > viewportWidth - 15) {
      return "right-full";
    }
    return "left-full";
  };

  const menuStyle: any = {};

  if (position.x !== undefined) {
    const menuWidth = 210;
    const estimatedHeight = isListsOnly
      ? 450
      : movie.type === "person" || movie.type === "profile"
      ? 120
      : 260;

    if (position.x + menuWidth > window.innerWidth - 15) {
      menuStyle.left = position.x - menuWidth;
    } else {
      menuStyle.left = position.x;
    }

    if (position.y + estimatedHeight > window.innerHeight - 20) {
      menuStyle.top = position.y - estimatedHeight;
    } else {
      menuStyle.top = position.y;
    }
  } else {
    if (position.isUp) {
      menuStyle.bottom = position.bottom;
      menuStyle.left = position.left;
    } else {
      menuStyle.top = position.top;
      menuStyle.left = position.left;
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={menuStyle}
      className={`fixed z-[9999] bg-bg-surface border border-white/[0.08] rounded shadow-2xl p-1.5 min-w-[210px] animate-in fade-in zoom-in duration-150 ${
        isListsOnly ? "w-[230px]" : ""
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {isListsOnly ? (
        <>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
            <span className="text-[14px] font-semibold text-white/60">
              {t("common.addToList")}
            </span>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-around py-3 px-2 border-b border-white/[0.05]">
            <TopIcon status="like" icon={ThumbsUp} label={t("status.likes")} />
            <TopIcon
              status="dislike"
              icon={ThumbsDown}
              label={t("status.dislikes")}
            />
            <TopIcon
              status="watchlist"
              icon={Clock}
              label={t("status.watchlist")}
            />
            <TopIcon status="watched" icon={Eye} label={t("status.watched")} />
          </div>

          <div className="max-h-[300px] overflow-y-auto custom-scrollbar mt-1">
            <div className="py-1">
              <CreateNewListRow />
              {customListLoading ? (
                <div className="px-3 py-4 text-center text-xs text-white/50">
                  {t("common.loading")}
                </div>
              ) : customLists.length > 0 ? (
                customLists.map((list) => (
                  <CustomListRow key={list.id} list={list} />
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-white/50">
                  {t("myLists.noLists")}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 mt-1 border-t border-white/[0.05]">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xs font-bold text-text-secondary hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={loading || pendingChanges.size === 0}
              className={`flex-1 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-lg transition-all shadow-lg shadow-brand/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed cursor-pointer active:scale-95 flex items-center justify-center gap-2`}
            >
              {loading ? (
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                t("common.save")
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          {movie.type === "person" || movie.type === "profile" ? (
            <>
              <MenuItem
                label={
                  currentIsFollowing ? t("social.unfollow") : t("social.follow")
                }
                icon={currentIsFollowing ? UserCheck : UserPlus}
                active={currentIsFollowing}
                onMouseEnter={closeSubmenuWithDelay}
                onClick={() => {
                  handleFollowToggle();
                }}
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-around py-2 px-1 border-b border-white/[0.05] mb-1">
                <TopIcon
                  status="like"
                  icon={ThumbsUp}
                  label={t("status.likes")}
                />
                <TopIcon
                  status="dislike"
                  icon={ThumbsDown}
                  label={t("status.dislikes")}
                />
                <TopIcon
                  status="watchlist"
                  icon={Clock}
                  label={t("status.watchlist")}
                />
                <TopIcon
                  status="watched"
                  icon={Eye}
                  label={t("status.watched")}
                />
              </div>

              <MenuItem
                label={t("common.addToList")}
                icon={Plus}
                hasSubmenu
                onMouseEnter={() => setActiveSubmenu("lists")}
              />

              <MenuItem
                label={t("details.watchOptions")}
                icon={Play}
                onMouseEnter={closeSubmenuWithDelay}
                onClick={() => {
                  router.push(getLocalizedPath(`${getNavPath()}/watch`));
                  onClose();
                }}
              />
              <MenuItem
                label={t("details.cast")}
                icon={Users}
                onMouseEnter={closeSubmenuWithDelay}
                onClick={() => {
                  router.push(getLocalizedPath(`${getNavPath()}/cast`));
                  onClose();
                }}
              />
            </>
          )}

          <MenuItem
            label={t("social.share")}
            icon={Share}
            hasSubmenu
            onMouseEnter={() => setActiveSubmenu("share")}
          />

          {activeSubmenu && (
            <div
              ref={submenuRef}
              className={`absolute bg-bg-surface border border-white/[0.08] rounded shadow-2xl p-1.5 min-w-[180px] animate-in fade-in slide-in-from-left-2 duration-150 ${getSubmenuClass()}`}
              style={{ top: submenuTop }}
              onMouseEnter={cancelCloseSubmenu}
            >
              {activeSubmenu === "share" ? (
                <MenuItem
                  label={t("social.copyLink")}
                  icon={Copy}
                  onClick={handleShare}
                />
              ) : (
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <CreateNewListRow />
                  {customListLoading ? (
                    <div className="px-3 py-4 text-center text-xs text-white/50">
                      {t("common.loading")}
                    </div>
                  ) : customLists.length > 0 ? (
                    customLists.map((list) => (
                      <CustomListRow key={list.id} list={list} />
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-white/50">
                      {t("myLists.noLists")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateListModal
          mediaType={movie.type === "series" ? "series" : "movie"}
          initialItems={[
            {
              id: movie.id,
              title: movie.title || movie.name,
              poster_path: movie.poster_path,
            },
          ]}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetchLists();
          }}
        />
      )}
    </div>,
    document.body
  );
}
