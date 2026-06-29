"use client";

/**
 * Notification panel component.
 * Desktop/tablet: Dropdown panel (triggered on Bell button click).
 * Mobile: Full-page overlay.
 */

import { useState, useRef, useEffect, MouseEvent } from "react";
import { formatTimeAgo } from "@/lib/utils";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/language-provider";
import { useNotificationStore } from "@/stores/notification-store";
import {
  Bell,
  UserPlus,
  MessageSquare,
  Heart,
  ThumbsUp,
  X,
  CheckCheck,
  MoreHorizontal,
  Check,
  Trash2,
} from "lucide-react";
import Avatar from "../common/Avatar";
import type { Notification } from "@/types";

/**
 * Returns icon based on notification type.
 */
function NotificationIcon({ type, size = 14 }: { type: string; size?: number }) {
  const iconProps = {
    size,
    strokeWidth: 2.2,
    className: "text-white",
    fill: "currentColor",
  };
  switch (type) {
    case "follow":
      return <UserPlus {...iconProps} />;
    case "comment_reply":
      return <MessageSquare {...iconProps} />;
    case "comment_like":
      return <ThumbsUp {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
}

/**
 * Generates redirect URL based on notification type.
 */
function getNotificationLink(n: Notification) {
  switch (n.type) {
    case "follow":
      return `/${n.actor_username || ""}`;
    case "comment_reply":
    case "comment_like": {
      const path = n.media_type === "series" ? "series" : "movies";
      return `/${path}/${n.tmdb_id || ""}/comments#comment-${n.comment_id || ""}`;
    }
    default:
      return "/";
  }
}

/**
 * Returns notification message text (excluding username).
 */
function getNotificationText(type: string, t: any) {
  switch (type) {
    case "follow":
      return t("notifications.types.follow");
    case "comment_reply":
      return t("notifications.types.commentReply");
    case "comment_like":
      return t("notifications.types.commentLike");
    default:
      return t("notifications.types.default");
  }
}

interface NotificationMenuProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Three-dot menu component.
 */
function NotificationMenu({
  notification,
  onMarkRead,
  onDelete,
}: NotificationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX,
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const { t } = useLanguage();

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all cursor-pointer"
      >
        <MoreHorizontal size={16} strokeWidth={2.5} />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: `${coords.top + 5}px`,
              left: `${coords.left}px`,
              transform: "translateX(-100%)",
            }}
            className="w-52 bg-black border border-white/20 rounded-md shadow-2xl shadow-black/60 z-[999] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {!notification.is_read && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkRead(notification.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-primary hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Check
                  size={15}
                  strokeWidth={2.5}
                  className="text-text-secondary"
                />
                {t("notifications.markRead")}
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(notification.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <Trash2 size={15} strokeWidth={2.5} />
              {t("common.delete")}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

interface NotificationRowProps {
  notification: Notification;
  onClick?: () => void;
}

/**
 * Single notification row component.
 */
function NotificationRow({ notification, onClick }: NotificationRowProps) {
  const link = getNotificationLink(notification);
  const markOneRead = useNotificationStore((s) => s.markOneRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const { t } = useLanguage();

  const router = useRouter();
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // If the clicked element is a link or inside a link, do not perform primary redirection
    if ((e.target as HTMLElement).closest("a") || (e.target as HTMLElement).closest("button")) return;

    // Mark as read when clicked
    if (!notification.is_read) {
      markOneRead(notification.id);
    }
    if (onClick) onClick();
    router.push(link);
  };

  const isAnonymous = notification.type === "comment_like";
  const profileLink = isAnonymous ? "" : `/${notification.actor_username || ""}`;

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-white/20 group/row cursor-pointer relative ${
        !notification.is_read ? "bg-white/5" : ""
      }`}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute left-1.5 top-[1.35rem] w-[5px] h-[5px] rounded-full bg-brand shadow-[0_0_6px_rgba(229,0,0,0.5)]" />
      )}

      {/* Avatar */}
      {isAnonymous ? (
        <div className="shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-full bg-bg-surface-hover border border-white/5 flex items-center justify-center text-text-secondary text-sm font-bold shadow-sm">
            <Heart size={18} strokeWidth={2.5} fill="currentColor" />
          </div>
        </div>
      ) : (
        <Link
          href={profileLink}
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
          className="shrink-0 mt-0.5"
        >
          <Avatar
            src={notification.actor_avatar_url as string}
            alt={(notification.actor_username as string) || "User"}
            size="md"
            type="profile"
            className="w-9 h-9"
          />
        </Link>
      )}

      {/* Content + Time */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[13px] text-text-primary leading-snug font-medium break-words">
          {!isAnonymous && (
            <>
              <Link
                href={profileLink}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClick) onClick();
                }}
                className="font-bold text-white hover:underline"
              >
                {notification.actor_username as string}
              </Link>{" "}
            </>
          )}
          {isAnonymous
            ? notification.message
            : getNotificationText(notification.type, t)}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <NotificationIcon type={notification.type} size={13} />
          <p className="text-[11px] text-text-secondary font-medium">
            {formatTimeAgo(notification.created_at, t)}
          </p>
        </div>
      </div>

      {/* Three-dot menu */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <NotificationMenu
          notification={notification}
          onMarkRead={markOneRead}
          onDelete={deleteNotification}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Desktop / Tablet Dropdown Panel
// ────────────────────────────────────────────────

interface DesktopNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  toggleRef: React.RefObject<HTMLButtonElement | null>;
}

export function DesktopNotificationPanel({
  isOpen,
  onClose,
  toggleRef,
}: DesktopNotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const { t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (!isOpen) return;
      if (panelRef.current && panelRef.current.contains(e.target as Node))
        return;
      if (toggleRef?.current && toggleRef.current.contains(e.target as Node))
        return;

      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, toggleRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-3 w-[380px] bg-black border border-white/20 rounded-md shadow-2xl shadow-black/60 z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">
          {t("notifications.title")}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <CheckCheck size={14} strokeWidth={2.5} />
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-[420px] overflow-y-auto custom-scrollbar divide-y divide-white/[0.04]">
        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell
              size={32}
              strokeWidth={1.5}
              className="text-white/20 mx-auto mb-3"
            />
            <p className="text-text-secondary text-sm font-medium">
              {t("notifications.empty")}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onClick={onClose} />
          ))
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Mobile Full-Page Notification Screen
// ────────────────────────────────────────────────

interface MobileNotificationScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNotificationScreen({
  isOpen,
  onClose,
}: MobileNotificationScreenProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] bg-black flex flex-col transition-all duration-300 ${
        isOpen
          ? "opacity-100 visible translate-y-0"
          : "opacity-0 invisible translate-y-4"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
        <h2 className="text-lg font-bold text-text-primary">
          {t("notifications.title")}
        </h2>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary active:text-white transition-colors cursor-pointer"
            >
              <CheckCheck size={16} strokeWidth={2.5} />
              {t("notifications.markAllRead")}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-bg-surface hover:bg-bg-surface-hover flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/[0.04]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Bell size={40} strokeWidth={1.5} className="text-white/20" />
            <p className="text-text-secondary text-sm font-medium">
              {t("notifications.empty")}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onClick={onClose} />
          ))
        )}
      </div>
    </div>,
    document.body
  );
}

// ────────────────────────────────────────────────
// Bell Button Component (Shared)
// ────────────────────────────────────────────────

interface NotificationBellProps {
  onClick: () => void;
  className?: string;
}

export function NotificationBell({
  onClick,
  className = "",
}: NotificationBellProps) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer ${className}`}
    >
      <Bell size={20} strokeWidth={2.5} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-brand/30 animate-in zoom-in duration-200">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
