import { useState, useRef } from "react";
import { Ellipsis, Plus, Check, SquarePlus, SquareCheck } from "lucide-react";
import ActionMenu from "./ActionMenu";
import { libraryApi } from "../../api";
import { useLibrary } from "../../context/LibraryContext";
import { useUI } from "../../context/UIContext";
import { useLanguage } from "../../context/LanguageContext";

export default function CardActions({ movie, user, onStatusChange, variant = "card" }) {
    const { t } = useLanguage();
    const { getWatchlistStatus, getInteractionStatus, getItemStatus, updateLocalStatus } = useLibrary();
    const { requireAuth } = useUI();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    const menuTriggerRef = useRef(null);
    const popoverTriggerRef = useRef(null);

    const watchlistStatus = getWatchlistStatus(movie.id);
    const interactionStatus = getInteractionStatus(movie.id);
    const isPersonOrProfile = movie.type === "person" || movie.type === "profile";

    const handleInteractionToggle = async (type) => {
        if (!requireAuth()) return;
        try {
            const mediaType = movie.type === "series" ? "series" : "movie";
            const isRemoving = interactionStatus === type;
            const newStatus = isRemoving ? null : type;

            await libraryApi.toggle({
                tmdb_id: movie.id,
                media_type: mediaType,
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date,
                action: type,
                value: !isRemoving
            });

            updateLocalStatus('interaction', movie.id, newStatus);

            const interactionLabel = t(`status.${type}s`);
            const msg = isRemoving
                ? t("common.removedFromList", { label: interactionLabel })
                : t("common.addedToList", { label: interactionLabel });
            window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));

            const currentStatus = getItemStatus(movie.id);
            const finalStatus = {
                ...currentStatus,
                liked: type === 'like' ? !isRemoving : (type === 'dislike' ? false : currentStatus.liked),
                disliked: type === 'dislike' ? !isRemoving : (type === 'like' ? false : currentStatus.disliked)
            };

            window.dispatchEvent(new CustomEvent("contentStatusChanged", {
                detail: {
                    tmdb_id: movie.id,
                    media_type: movie.type === "series" ? "series" : "movie",
                    interactionStatus: newStatus,
                    watchlistStatus: watchlistStatus,
                    ...finalStatus
                }
            }));
            window.dispatchEvent(new CustomEvent("libraryUpdated"));
        } catch (err) {
            console.error("Etkileşim hatası:", err);
        }
    };

    const handleListSelect = async (newStatus) => {
        if (!requireAuth()) return;

        // Eğer zaten bu listedeyse, kaldır (Toggle mantığı)
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
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date,
                action: newStatus,
                value: true
            });

            updateLocalStatus('watchlist', movie.id, newStatus);

            const listLabel = t(`status.${newStatus}`);
            window.dispatchEvent(new CustomEvent("show-toast", { detail: t("common.addedToList", { label: listLabel }) }));

            const currentStatus = getItemStatus(movie.id);
            const finalStatus = {
                ...currentStatus,
                watchlist: newStatus === 'watchlist' ? true : (newStatus === 'watched' ? false : currentStatus.watchlist),
                watched: newStatus === 'watched' ? true : currentStatus.watched
            };

            window.dispatchEvent(new CustomEvent("contentStatusChanged", {
                detail: {
                    tmdb_id: movie.id,
                    watchlistStatus: newStatus,
                    interactionStatus: interactionStatus,
                    ...finalStatus
                }
            }));
            onStatusChange?.(movie.id, newStatus);
            window.dispatchEvent(new CustomEvent("libraryUpdated"));
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

            await libraryApi.toggle({
                tmdb_id: movie.id,
                media_type: mediaType,
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date,
                action: oldStatus,
                value: false
            });

            updateLocalStatus('watchlist', movie.id, null);

            const listLabel = t(`status.${oldStatus}`);
            window.dispatchEvent(new CustomEvent("show-toast", { detail: t("common.removedFromList", { label: listLabel }) }));

            const currentStatus = getItemStatus(movie.id);
            const finalStatus = {
                ...currentStatus,
                [oldStatus]: false
            };

            window.dispatchEvent(new CustomEvent("contentStatusChanged", {
                detail: {
                    tmdb_id: movie.id,
                    media_type: movie.type === "series" ? "series" : "movie",
                    watchlistStatus: null,
                    interactionStatus: interactionStatus,
                    ...finalStatus
                }
            }));
            onStatusChange?.(movie.id, null);
            window.dispatchEvent(new CustomEvent("libraryUpdated"));
        } catch (err) {
            console.error("Liste silme hatası:", err);
        } finally {
            setLoading(false);
        }
    };

    const calculatePosition = (triggerRef, menuWidth, estimatedHeight = 300) => {
        if (!triggerRef.current) return { top: 0, left: 0 };
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Varsayılan olarak butonun sol kenarıyla hizala (Sağa doğru açılma)
        let left = rect.left;

        // Sağdan taşma kontrolü: Eğer sağa açılınca ekran dışına çıkıyorsa sola aç
        if (left + menuWidth > viewportWidth - 15) {
            left = rect.right - menuWidth;
        }

        // Hala soldan taşıyorsa (ekrana sığmıyorsa), sola daya
        if (left < 10) {
            left = 10;
        }

        // Dikey taşma kontrolü - Aşağı sığmıyorsa yukarı açılacak şekilde ayarla
        if (rect.bottom + 8 + estimatedHeight > viewportHeight - 20) {
            return {
                bottom: viewportHeight - rect.top + 8,
                left: left,
                isUp: true
            };
        }

        return {
            top: rect.bottom + 8,
            left: left,
            isUp: false
        };
    };

    const toggleMenu = (e) => {
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

    const togglePopover = (e) => {
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

    // if (!user) return null; // Artık unauth kullanıcılar da butonları görebilecek ve basınca uyarı alacak.

    const isAnyMenuOpen = isMenuOpen || isPopoverOpen;

    const cardButtonClass = "p-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white hover:text-white hover:bg-black/90 transition-all shadow-lg";
    const detailButtonClass = "bg-bg-surface-hover hover:bg-white/10 px-5 py-3 md:px-6 md:py-3.5 rounded-full border border-white/10 text-white font-bold text-sm md:text-base flex items-center gap-2.5 transition-all active:scale-95";
    const optionsDetailClass = "bg-bg-surface-hover hover:bg-white/10 p-3 md:p-3.5 rounded-full border border-white/10 text-white transition-all active:scale-95";

    // Spotify Style Ghost Icons
    const ghostButtonClass = "p-2 text-[#b3b3b3] hover:text-white hover:scale-105 transition-all active:scale-95 cursor-pointer";

    return (
        <div
            className={`${variant === "card" ? "absolute top-2 right-2 opacity-0 group-hover/card:opacity-100" : "relative opacity-100"} flex items-center gap-2 z-30 transition-opacity duration-200 ${isAnyMenuOpen ? 'opacity-100' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onAuxClick={(e) => e.stopPropagation()}
        >
            {/* Quick List Icon */}
            {!isPersonOrProfile && (
                <button
                    ref={popoverTriggerRef}
                    onClick={togglePopover}
                    className={`${variant === 'detail' ? detailButtonClass : variant === 'ghost' ? ghostButtonClass : cardButtonClass}`}
                    title={t("common.addToList")}
                >
                    {watchlistStatus || interactionStatus ? (
                        variant === 'card' ? (
                            <Check size={18} strokeWidth={2.5} className="text-white" />
                        ) : (
                            <SquareCheck size={variant === 'ghost' ? 26 : 20} strokeWidth={1.5} className="icon-active-check" />
                        )
                    ) : (
                        variant === 'card' ? (
                            <Plus size={18} strokeWidth={2.5} />
                        ) : (
                            <SquarePlus size={variant === 'ghost' ? 26 : 20} strokeWidth={1.5} />
                        )
                    )}
                    {variant === 'detail' && <span>{t("common.addToList")}</span>}
                </button>
            )}

            {/* Options Icon */}
            <button
                ref={menuTriggerRef}
                onClick={toggleMenu}
                className={`transition-all cursor-pointer ${variant === 'detail' ? optionsDetailClass : variant === 'ghost' ? ghostButtonClass : cardButtonClass}`}
                title={t("common.options")}
            >
                {variant === 'card' ? (
                    <Ellipsis size={18} strokeWidth={2.5} fill="none" />
                ) : (
                    <Ellipsis size={variant === 'ghost' ? 26 : 20} strokeWidth={2.5} fill="none" />
                )}
            </button>

            {/* Menus */}
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
