"use client";

import { useState, useRef, useEffect } from "react";
import { Ellipsis, Plus, Check, SquarePlus, SquareCheck } from "lucide-react";
import ActionMenu from "./ActionMenu";
import { libraryApi } from "@/lib/api";
import { useLibraryStore } from "@/stores/library-store";
import { useLanguage } from "@/providers/language-provider";
import type { User } from "@/types";

interface CardActionsProps {
  movie: any;
  user: User | null;
  onStatusChange?: (id: number, status: string | null) => void;
  variant?: "card" | "detail" | "ghost" | "list";
}

export default function CardActions({
  movie,
  user,
  onStatusChange,
  variant = "card",
}: CardActionsProps) {
  const { t } = useLanguage();
  const {
    getWatchlistStatus,
    getInteractionStatus,
    getItemStatus,
    updateLocalStatus,
  } = useLibraryStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 } as any);

  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const popoverTriggerRef = useRef<HTMLButtonElement>(null);

  const watchlistStatus = getWatchlistStatus(movie.id);
  const interactionStatus = getInteractionStatus(movie.id);
  const isPersonOrProfile =
    movie.type === "person" || movie.type === "profile";

  const requireAuth = () => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: t("errors.authRequired") })
      );
      return false;
    }
    return true;
  };

  const handleInteractionToggle = async (type: "like" | "dislike") => {
    if (!requireAuth()) return;
    try {
      const mediaType = movie.type === "series" ? "series" : "movie";
      const isRemoving = interactionStatus === type;
      const newStatus = isRemoving ? null : type;

      await libraryApi.toggle({
        tmdb_id: movie.id,
        media_type: mediaType,
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        release_date: movie.release_date || movie.first_air_date,
        action: type,
        value: !isRemoving,
      });

      updateLocalStatus("interaction", movie.id, newStatus);

      const interactionLabel = t(`status.${type}s`);
      const msg = isRemoving
        ? t("common.removedFromList", { label: interactionLabel })
        : t("common.addedToList", { label: interactionLabel });
      window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));
    } catch (err) {
      console.error("Etkileşim hatası:", err);
    }
  };

  const handleListSelect = async (newStatus: "watchlist" | "watched") => {
    if (!requireAuth()) return;

    if (watchlistStatus === newStatus) {
      handleListRemove();
      return;
    }

    setLoading(true);
    try {
      const mediaType = movie.type === "series" ? "series" : "movie";
      await libraryApi.toggle({
        tmdb_id: movie.id,
        media_type: mediaType,
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        release_date: movie.release_date || movie.first_air_date,
        action: newStatus,
        value: true,
      });

      updateLocalStatus("watchlist", movie.id, newStatus);

      const listLabel = t(`status.${newStatus}`);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: t("common.addedToList", { label: listLabel }),
        })
      );

      onStatusChange?.(movie.id, newStatus);
    } catch (err) {
      console.error("Liste ekleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleListRemove = async () => {
    if (!requireAuth()) return;
    setLoading(true);
    try {
      const mediaType = movie.type === "series" ? "series" : "movie";
      const oldStatus = watchlistStatus;

      if (!oldStatus) return;

      await libraryApi.toggle({
        tmdb_id: movie.id,
        media_type: mediaType,
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        release_date: movie.release_date || movie.first_air_date,
        action: oldStatus,
        value: false,
      });

      updateLocalStatus("watchlist", movie.id, null);

      const listLabel = t(`status.${oldStatus}`);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: t("common.removedFromList", { label: listLabel }),
        })
      );

      onStatusChange?.(movie.id, null);
    } catch (err) {
      console.error("Liste silme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePosition = (
    triggerRef: React.RefObject<HTMLElement | null>,
    menuWidth: number,
    estimatedHeight = 300
  ) => {
    if (!triggerRef.current) return { top: 0, left: 0 };
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.left;

    if (left + menuWidth > viewportWidth - 15) {
      left = rect.right - menuWidth;
    }

    if (left < 10) {
      left = 10;
    }

    if (rect.bottom + 8 + estimatedHeight > viewportHeight - 20) {
      return {
        bottom: viewportHeight - rect.top + 8,
        left: left,
        isUp: true,
      };
    }

    return {
      top: rect.bottom + 8,
      left: left,
      isUp: false,
    };
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMenuOpen) {
      setIsMenuOpen(false);
    } else {
      if (!requireAuth()) return;
      window.dispatchEvent(new CustomEvent("close-all-menus"));
      setMenuPosition(calculatePosition(menuTriggerRef, 240, 240));
      setIsMenuOpen(true);
      setIsPopoverOpen(false);
    }
  };

  const togglePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPopoverOpen) {
      setIsPopoverOpen(false);
    } else {
      if (!requireAuth()) return;
      window.dispatchEvent(new CustomEvent("close-all-menus"));
      setMenuPosition(calculatePosition(popoverTriggerRef, 230, 380));
      setIsPopoverOpen(true);
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleCloseMenus = () => {
      setIsMenuOpen(false);
      setIsPopoverOpen(false);
    };
    window.addEventListener("close-all-menus", handleCloseMenus);
    return () => {
      window.removeEventListener("close-all-menus", handleCloseMenus);
    };
  }, []);

  const isAnyMenuOpen = isMenuOpen || isPopoverOpen;

  const cardButtonClass =
    "p-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white hover:text-white hover:bg-black/90 transition-all shadow-lg";
  const detailButtonClass =
    "bg-bg-surface-hover hover:bg-white/10 px-5 py-3 md:px-6 md:py-3.5 rounded-full border border-white/10 text-white font-bold text-sm md:text-base flex items-center gap-2.5 transition-all active:scale-95";
  const optionsDetailClass =
    "bg-bg-surface-hover hover:bg-white/10 p-3 md:p-3.5 rounded-full border border-white/10 text-white transition-all active:scale-95";

  const ghostButtonClass =
    "p-2 text-[#b3b3b3] hover:text-white hover:scale-105 transition-all active:scale-95 cursor-pointer";

  return (
    <div
      className={`${
        variant === "card"
          ? "absolute top-2 right-2 opacity-0 group-hover/card:opacity-100"
          : variant === "list"
          ? "relative opacity-100"
          : "relative opacity-100"
      } flex items-center gap-2 z-30 transition-opacity duration-200 ${
        isAnyMenuOpen ? "opacity-100" : ""
      }`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {!isPersonOrProfile && (
        <button
          ref={popoverTriggerRef}
          onClick={togglePopover}
          className={`${
            variant === "detail"
              ? detailButtonClass
              : variant === "ghost"
              ? ghostButtonClass
              : cardButtonClass
          }`}
          title={t("common.addToList")}
        >
          {watchlistStatus || interactionStatus ? (
            variant === "card" || variant === "list" ? (
              <Check size={18} strokeWidth={2.5} className="text-white" />
            ) : (
              <SquareCheck
                size={variant === "ghost" ? 26 : 20}
                strokeWidth={1.5}
                className="icon-active-check"
              />
            )
          ) : variant === "card" || variant === "list" ? (
            <Plus size={18} strokeWidth={2.5} />
          ) : (
            <SquarePlus
              size={variant === "ghost" ? 26 : 20}
              strokeWidth={1.5}
            />
          )}
          {variant === "detail" && <span>{t("common.addToList")}</span>}
        </button>
      )}

      <button
        ref={menuTriggerRef}
        onClick={toggleMenu}
        className={`transition-all cursor-pointer ${
          variant === "detail"
            ? optionsDetailClass
            : variant === "ghost"
            ? ghostButtonClass
            : cardButtonClass
        }`}
        title={t("common.options")}
      >
        {variant === "card" || variant === "list" ? (
          <Ellipsis size={18} strokeWidth={2.5} fill="none" />
        ) : (
          <Ellipsis
            size={variant === "ghost" ? 26 : 20}
            strokeWidth={2.5}
            fill="none"
          />
        )}
      </button>

      {isMenuOpen && (
        <ActionMenu
          movie={movie}
          position={menuPosition}
          onClose={() => setIsMenuOpen(false)}
          interactionStatus={interactionStatus}
          watchlistStatus={watchlistStatus}
          onInteractionToggle={handleInteractionToggle}
          onListSelect={handleListSelect}
          user={user}
        />
      )}

      {isPopoverOpen && (
        <ActionMenu
          movie={movie}
          position={menuPosition}
          onClose={() => setIsPopoverOpen(false)}
          interactionStatus={interactionStatus}
          watchlistStatus={watchlistStatus}
          onInteractionToggle={handleInteractionToggle}
          onListSelect={handleListSelect}
          initialView="lists"
          user={user}
        />
      )}
    </div>
  );
}
