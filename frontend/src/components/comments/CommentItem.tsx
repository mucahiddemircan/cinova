"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { commentApi } from "@/lib/api";
import { formatTimeAgo } from "@/lib/utils";
import { useLanguage } from "@/providers/language-provider";
import CommentInput from "./CommentInput";
import {
  MoreVertical,
  Edit,
  Trash2,
  Reply,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  MessageSquareWarning,
} from "lucide-react";
import Avatar from "../common/Avatar";
import LoadingDots from "../common/LoadingDots";
import type { User } from "@/types";

interface CommentItemProps {
  comment: any;
  user: User | null;
  onUpdate?: () => void;
}

export default function CommentItem({ comment, user, onUpdate }: CommentItemProps) {
  const { t, getLocalizedPath } = useLanguage();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash;
    if (!hash.startsWith("#comment-")) return false;

    const targetId = parseInt(hash.replace("#comment-", ""));
    if (Number.isNaN(targetId)) return false;

    return targetId !== comment.id && comment.replies_count > 0;
  });
  const [replies, setReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [interaction, setInteraction] = useState<string | null>(
    comment.user_interaction
  );
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [dislikesCount, setDislikesCount] = useState(comment.dislikes_count);
  const [repliesCount, setRepliesCount] = useState(comment.replies_count);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLDivElement>(null);

  const isOwner = user && user.username === comment.username;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showDeleteModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showDeleteModal]);

  const handleReply = async (content: string, isSpoiler: boolean) => {
    try {
      await commentApi.create({
        tmdb_id: comment.tmdb_id || 0,
        media_type: comment.media_type || "",
        content,
        parent_id: comment.id,
        is_spoiler: isSpoiler,
      });
      setIsReplying(false);
      setRepliesCount((prev: number) => prev + 1);
      if (showReplies) {
        loadReplies();
      } else {
        setShowReplies(true);
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Yanıt gönderme hatası:", err);
    }
  };

  const handleUpdate = async (content: string, isSpoiler: boolean) => {
    try {
      await commentApi.update(comment.id, { content, is_spoiler: isSpoiler });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Yorum düzenleme hatası:", err);
    }
  };

  const handleDelete = async () => {
    try {
      await commentApi.delete(comment.id);
      setShowDeleteModal(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Yorum silme hatası:", err);
    }
  };

  const loadReplies = useCallback(async () => {
    setRepliesLoading(true);
    try {
      const data = await commentApi.getReplies(comment.id);
      setReplies(data);
      setRepliesCount(data.length);
    } catch (err) {
      console.error("Yanıtları yükleme hatası:", err);
    } finally {
      setRepliesLoading(false);
    }
  }, [comment.id]);

  useEffect(() => {
    if (showReplies) {
      loadReplies();
    }
  }, [showReplies, loadReplies]);

  const handleInteract = async (type: "like" | "dislike") => {
    if (!user) return;
    const newType = interaction === type ? "clear" : type;
    const prevInteraction = interaction;
    const prevLikes = likesCount;
    const prevDislikes = dislikesCount;

    setInteraction(newType === "clear" ? null : type);
    if (type === "like") {
      if (prevInteraction === "like") setLikesCount(prevLikes - 1);
      else {
        setLikesCount(prevLikes + 1);
        if (prevInteraction === "dislike") setDislikesCount(prevDislikes - 1);
      }
    } else if (type === "dislike") {
      if (prevInteraction === "dislike") setDislikesCount(prevDislikes - 1);
      else {
        setDislikesCount(prevDislikes + 1);
        if (prevInteraction === "like") setLikesCount(prevLikes - 1);
      }
    }

    try {
      await commentApi.interact(comment.id, newType);
    } catch {
      setInteraction(prevInteraction);
      setLikesCount(prevLikes);
      setDislikesCount(prevDislikes);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#comment-")) return;

    const targetId = parseInt(hash.replace("#comment-", ""));
    if (Number.isNaN(targetId) || targetId !== comment.id) return;

    const timeout = setTimeout(() => {
      if (!commentRef.current) return;
      commentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      commentRef.current.classList.add("comment-highlight");
      window.setTimeout(() => {
        commentRef.current?.classList.remove("comment-highlight");
      }, 2600);
    }, 300);

    return () => clearTimeout(timeout);
  }, [comment.id]);

  return (
    <>
      <div
        ref={commentRef}
        id={`comment-${comment.id}`}
        className="flex gap-4 items-start mb-6 group/item pt-2 scroll-mt-24 transition-colors"
      >
        <Link href={getLocalizedPath(`/${comment.username}`)} className="shrink-0">
          <Avatar
            src={comment.avatar_url || ""}
            alt={comment.username}
            size="md"
            type="profile"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-1 pr-2">
            <div className="flex items-center gap-2">
              <Link
                href={getLocalizedPath(`/${comment.username}`)}
                className="text-sm font-bold text-white hover:underline cursor-pointer tracking-tight"
              >
                @{comment.username}
              </Link>
              <span className="text-[11px] text-text-secondary flex items-center gap-1.5">
                {formatTimeAgo(comment.created_at, t)}
                {comment.is_edited && (
                  <span className="opacity-40 font-medium">
                    ({t("comments.edited")})
                  </span>
                )}
              </span>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-white transition-all cursor-pointer"
              >
                <MoreVertical size={18} strokeWidth={2} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-bg-surface border border-white/5 rounded-xl shadow-2xl overflow-hidden min-w-[140px] z-[60] animate-fade-in shadow-black/80">
                  {isOwner ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
                      >
                        <Edit size={14} strokeWidth={2} />
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteModal(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                        {t("common.delete")}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setIsReplying(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
                    >
                      <Reply size={14} strokeWidth={2} />
                      {t("comments.reply")}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => {
                        setIsReplying(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3 border-t border-white/5"
                    >
                      <Reply size={14} strokeWidth={2} />
                      {t("comments.reply")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mt-2">
              <CommentInput
                user={user}
                initialValue={comment.content}
                autoFocus={true}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <>
              {comment.is_spoiler && !showSpoiler && !isOwner ? (
                <div className="flex items-center gap-3 mb-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-[14px] text-white/50">
                    <MessageSquareWarning size={14} className="shrink-0" />
                    {t("comments.spoilerWarning")}
                  </div>
                  <button
                    onClick={() => setShowSpoiler(true)}
                    className="text-[13px] font-bold text-white hover:underline cursor-pointer transition-all"
                  >
                    {t("comments.showComment")}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words mb-3 pr-2">
                  {comment.content}
                </p>
              )}

              <div className="flex items-center gap-1 -ml-2 mb-2">
                <button
                  onClick={() => handleInteract("like")}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-white/5 transition-all text-[12px] font-bold cursor-pointer ${
                    interaction === "like" ? "text-white" : "text-white"
                  }`}
                >
                  <ThumbsUp
                    size={16}
                    strokeWidth={2}
                    fill={interaction === "like" ? "currentColor" : "none"}
                  />
                  {likesCount > 0 && likesCount}
                </button>

                <button
                  onClick={() => handleInteract("dislike")}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-white/5 transition-all text-[12px] font-bold cursor-pointer ${
                    interaction === "dislike" ? "text-white" : "text-white"
                  }`}
                >
                  <ThumbsDown
                    size={16}
                    strokeWidth={2}
                    fill={interaction === "dislike" ? "currentColor" : "none"}
                  />
                  {dislikesCount > 0 && dislikesCount}
                </button>

                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="px-3 py-1.5 rounded-full hover:bg-white/5 transition-all text-[12px] font-bold text-white/90 cursor-pointer"
                >
                  {t("comments.reply")}
                </button>
              </div>
            </>
          )}

          {isReplying && (
            <div className="mt-4">
              <CommentInput
                user={user}
                placeholder={t("comments.addReplyPlaceholder")}
                autoFocus={true}
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}

          {repliesCount > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-2 text-white/50 text-[13px] font-bold py-2 hover:bg-white/5 px-3 rounded-full transition-all cursor-pointer mt-1"
            >
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={
                  showReplies
                    ? "rotate-180 transition-transform"
                    : "transition-transform"
                }
              />
              {repliesCount} {t("comments.repliesCount")}
            </button>
          )}

          {showReplies && (
            <div className="mt-4 pl-0 md:pl-6 border-l border-white/5 ml-5">
              {repliesLoading ? (
                <div className="py-4 flex justify-center md:justify-start">
                  <LoadingDots size="sm" className="text-text-secondary/30" />
                </div>
              ) : (
                replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    user={user}
                    onUpdate={loadReplies}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {typeof document !== "undefined" &&
        showDeleteModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative bg-bg-surface border border-white/10 rounded-2xl w-full max-w-[400px] overflow-hidden shadow-2xl animate-scale-up">
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2">
                  {t("comments.deleteTitle")}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                  {t("comments.deleteConfirm")}
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-5 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-6 py-2.5 text-sm font-bold bg-brand text-white rounded-xl hover:bg-brand-hover transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-brand/10"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
