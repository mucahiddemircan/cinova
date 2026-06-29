"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/providers/language-provider";
import { X, Search, Plus, Loader2, AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";
import { contentApi, customListApi } from "@/lib/api";
import PlaceholderImage from "../common/PlaceholderImage";

interface CreateListModalProps {
  mediaType?: "movie" | "series" | "tv";
  onClose: () => void;
  onSuccess?: () => void;
  initialItems?: CreateListItem[];
}

interface CreateListItem {
  id: number;
  title: string;
  poster_path?: string | null;
  release_date?: string;
}

interface ConfirmationDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

function ConfirmationDialog({ onCancel, onConfirm, t }: ConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/20 rounded-lg p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4 text-white/90">
          <AlertTriangle size={24} className="text-white/60" />
          <h3 className="text-lg font-bold">{t("createListModal.confirmTitle")}</h3>
        </div>
        <p className="text-white/60 text-sm mb-6 leading-relaxed">{t("createListModal.confirmMsg")}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-bold transition-all text-sm"
          >
            {t("createListModal.confirmNo")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded font-bold transition-all text-sm"
          >
            {t("createListModal.confirmYes")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateListModal({
  mediaType: initialMediaType,
  onClose,
  onSuccess,
  initialItems = [],
}: CreateListModalProps) {
  const { t } = useLanguage();
  const [activeMediaType, setActiveMediaType] = useState<
    "movie" | "series" | "tv"
  >(initialMediaType || "movie");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CreateListItem[]>([]);
  const [addedItems, setAddedItems] = useState<CreateListItem[]>(initialItems);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTitleError, setShowTitleError] = useState(false);

  // Confirmation modal states
  const [showConfirm, setShowConfirm] = useState<{
    show: boolean;
    action: string | null;
    pendingType: "movie" | "series" | "tv" | null;
  }>({ show: false, action: null, pendingType: null });

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const mouseDownTarget = useRef<EventTarget | null>(null);

  // Unsaved changes check
  const isDirty =
    title.trim() !== "" || description.trim() !== "" || addedItems.length > 0;

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await contentApi.search(query, activeMediaType);
      const items = (
        Array.isArray(results) ? results : (results as any).results || []
      ) as CreateListItem[];
      setSearchResults(items.slice(0, 5));
    } catch (err) {
      console.error("Arama hatası:", err);
    } finally {
      setIsSearching(false);
    }
  }, [activeMediaType]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, handleSearch]);

  const addItem = (item: CreateListItem) => {
    if (addedItems.some((i) => i.id === item.id)) return;
    setAddedItems((prev) => [...prev, item]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeItem = (id: number) => {
    setAddedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setShowTitleError(true);
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title,
        description,
        is_private: privacy === "private",
        media_type: activeMediaType,
        items: addedItems.map((item) => ({
          tmdb_id: item.id,
          title: item.title,
          poster_path: item.poster_path,
        })),
      };
      await customListApi.create(payload);
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: t("createListModal.success") })
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Kaydetme hatası:", err);
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: t("createListModal.error") })
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseRequest = () => {
    if (isDirty) {
      setShowConfirm({ show: true, action: "close", pendingType: null });
    } else {
      onClose();
    }
  };

  const handleTabSwitch = (type: "movie" | "series") => {
    if (type === activeMediaType) return;
    if (isDirty) {
      setShowConfirm({ show: true, action: "switch", pendingType: type });
    } else {
      setActiveMediaType(type);
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAddedItems([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const confirmAction = () => {
    if (showConfirm.action === "close") {
      onClose();
    } else if (showConfirm.action === "switch" && showConfirm.pendingType) {
      setActiveMediaType(showConfirm.pendingType);
      resetForm();
    }
    setShowConfirm({ show: false, action: null, pendingType: null });
  };
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-black/75 p-4 md:p-8 overflow-y-auto animate-in fade-in duration-300 flex justify-center"
      onMouseDown={(e) => {
        mouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        if (
          e.target === e.currentTarget &&
          mouseDownTarget.current === e.currentTarget
        ) {
          handleCloseRequest();
        }
      }}
    >
      <div
        className="bg-[#111] w-full max-w-xl rounded-lg shadow-2xl flex flex-col h-fit my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex gap-8 items-center">
            <button
              onClick={() => handleTabSwitch("movie")}
              className={`transition-all pb-3 font-bold text-[20px] tracking-tight relative ${
                activeMediaType === "movie"
                  ? "text-white cursor-default"
                  : "text-white/40 hover:text-white cursor-pointer"
              }`}
            >
              {t("createListModal.movieTab")}
              {activeMediaType === "movie" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
              )}
            </button>
            <button
              onClick={() => handleTabSwitch("series")}
              className={`transition-all pb-3 font-bold text-[20px] tracking-tight relative ${
                activeMediaType === "series"
                  ? "text-white cursor-default"
                  : "text-white/40 hover:text-white cursor-pointer"
              }`}
            >
              {t("createListModal.seriesTab")}
              {activeMediaType === "series" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
              )}
            </button>
          </div>
          <button
            onClick={handleCloseRequest}
            className="p-1 text-white hover:text-zinc-500 transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              {t("createListModal.titleLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (showTitleError) setShowTitleError(false);
                }}
                maxLength={100}
                className={`w-full bg-[#1a1a1a] border rounded px-4 py-3 text-white focus:border-white/50 outline-none transition-all placeholder:text-white/20 ${
                  showTitleError ? "border-red-500" : "border-white/20"
                }`}
                placeholder={t("createListModal.titlePlaceholder")}
              />
              <div className="flex justify-between items-center mt-1">
                <div>
                  {showTitleError && (
                    <span className="text-[10px] text-red-500 font-bold">
                      {t("createListModal.titleError")}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/30 font-medium">
                  {title.length}/100
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              {t("createListModal.descLabel")}
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                className="w-full bg-[#1a1a1a] border border-white/20 rounded px-4 py-3 text-white focus:border-white/50 outline-none resize-y min-h-[100px] max-h-[550px] placeholder:text-white/20"
                placeholder={t("createListModal.descPlaceholder")}
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-white/30 font-medium">
                  {description.length}/1000
                </span>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-sm font-semibold text-white/90">
                {t("createListModal.privacyLabel")}
              </span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      privacy === "public"
                        ? "border-white"
                        : "border-white/20 group-hover:border-white/40"
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        privacy === "public"
                          ? "bg-white scale-100"
                          : "bg-white/10 scale-0 group-hover:scale-100"
                      }`}
                    />
                  </div>
                  <input
                    type="radio"
                    className="hidden"
                    checked={privacy === "public"}
                    onChange={() => setPrivacy("public")}
                  />
                  <span className="text-sm text-white font-medium">
                    {t("createListModal.public")}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      privacy === "private"
                        ? "border-white"
                        : "border-white/20 group-hover:border-white/40"
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        privacy === "private"
                          ? "bg-white scale-100"
                          : "bg-white/10 scale-0 group-hover:scale-100"
                      }`}
                    />
                  </div>
                  <input
                    type="radio"
                    className="hidden"
                    checked={privacy === "private"}
                    onChange={() => setPrivacy("private")}
                  />
                  <span className="text-sm text-white font-medium">
                    {t("createListModal.private")}
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-white text-black px-8 py-2.5 rounded font-bold hover:bg-zinc-200 disabled:opacity-50 disabled:bg-zinc-500 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              {isSaving
                ? t("createListModal.saving")
                : t("createListModal.saveBtn")}
            </button>
          </div>

          {/* Added Items (Conditional) */}
          {addedItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/90">
                  {activeMediaType === "movie"
                    ? t("createListModal.addedMovies", {
                        count: addedItems.length,
                      })
                    : t("createListModal.addedSeries", {
                        count: addedItems.length,
                      })}
                </span>
                <button
                  onClick={() => setAddedItems([])}
                  className="text-xs text-white/60 hover:text-white transition-colors font-medium cursor-pointer"
                >
                  {t("createListModal.clearAll")}
                </button>
              </div>
              <div className="space-y-2">
                {addedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 bg-white/10 rounded border border-white/10 group"
                  >
                    <div className="w-8 h-10 bg-white/20 rounded overflow-hidden flex-shrink-0">
                      {item.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlaceholderImage
                            type={activeMediaType}
                            iconSize={12}
                          />
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-sm text-white font-medium truncate">
                      {item.title}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <label className="block text-sm font-semibold text-white/90">
              {activeMediaType === "movie"
                ? t("createListModal.addMovie")
                : t("createListModal.addSeries")}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeMediaType === "movie"
                    ? t("createListModal.searchMovie")
                    : t("createListModal.searchSeries")
                }
                className="w-full bg-[#1a1a1a] border border-white/20 rounded pl-10 pr-4 py-3 text-white focus:border-white/50 outline-none transition-all placeholder:text-white/20"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 size={18} className="animate-spin text-white/60" />
                </div>
              )}

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/20 rounded shadow-2xl z-[101] overflow-hidden">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-white/10 transition-all text-left group border-b border-white/5 last:border-0 cursor-pointer"
                    >
                      <div className="w-8 h-12 bg-white/10 rounded overflow-hidden flex-shrink-0">
                        {item.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlaceholderImage
                              type={activeMediaType}
                              iconSize={12}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-white/60">
                          {item.release_date?.split("-")[0]}
                        </p>
                      </div>
                      <Plus
                        size={20}
                        className="text-white/40 group-hover:text-white mr-2 transition-colors"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmations */}
        {showConfirm.show && (
          <ConfirmationDialog
            t={t}
            onCancel={() =>
              setShowConfirm({ show: false, action: null, pendingType: null })
            }
            onConfirm={confirmAction}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
