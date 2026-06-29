import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { libraryApi, followsApi, customListApi } from "../../api";
import { useLibrary } from "../../context/LibraryContext";
import { useUI } from "../../context/UIContext";
import { useLanguage } from "../../context/LanguageContext";
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
    List
} from "lucide-react";
import CreateListModal from "../layout/CreateListModal";

export default function ActionMenu({
    movie,
    position, // { top, left, isUp, bottom } OR { x, y } for context menu
    onClose,
    onInteractionToggle: propOnInteractionToggle,
    onListSelect: propOnListSelect,
    interactionStatus: propInteractionStatus,
    watchlistStatus: propWatchlistStatus,
    user,
    initialView = 'default' // 'default' or 'lists'
}) {
    const { t } = useLanguage();
    const {
        getWatchlistStatus,
        getInteractionStatus,
        getItemStatus,
        isFollowingUser,
        isFollowingPerson,
        updateLocalStatus
    } = useLibrary();
    const { requireAuth } = useUI();

    const [activeSubmenu, setActiveSubmenu] = useState(initialView === 'lists' ? 'lists' : null);
    const [submenuTop, setSubmenuTop] = useState(0);

    const itemStatus = getItemStatus(movie.id);
    const currentWatchlist = propWatchlistStatus !== undefined ? propWatchlistStatus : getWatchlistStatus(movie.id);
    const currentInteraction = propInteractionStatus !== undefined ? propInteractionStatus : getInteractionStatus(movie.id);
    const currentIsFollowing = movie.type === "profile" ? isFollowingUser(movie.title) : isFollowingPerson(movie.id);

    const [loading, setLoading] = useState(false);
    const menuRef = useRef(null);
    const submenuRef = useRef(null);
    const timeoutRef = useRef(null);
    const navigate = useNavigate();

    // Custom lists state
    const [customLists, setCustomLists] = useState([]);
    const [customListLoading, setCustomListLoading] = useState(false);
    const [tempCustomLists, setTempCustomLists] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchLists = async () => {
        if (!user) return;
        setCustomListLoading(true);
        try {
            const lists = await customListApi.list();
            const filteredLists = lists.filter(l => l.media_type === (movie.type === "series" ? "series" : "movie"));
            setCustomLists(filteredLists);

            const initial = {};
            filteredLists.forEach(l => {
                initial[l.id] = l.items?.some(i => i.tmdb_id === movie.id);
            });
            setTempCustomLists(initial);
        } catch (err) {
            console.error("Error fetching custom lists:", err);
        } finally {
            setCustomListLoading(false);
        }
    };

    useEffect(() => {
        fetchLists();
    }, [user, movie.type, movie.id]);

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
        dislike: itemStatus.disliked
    });
    const [pendingChanges, setPendingChanges] = useState(new Set());

    useEffect(() => {
        if (pendingChanges.size === 0) {
            setTempStatus({
                watchlist: itemStatus.watchlist,
                watched: itemStatus.watched,
                like: itemStatus.liked,
                dislike: itemStatus.disliked
            });
        }
    }, [itemStatus.watchlist, itemStatus.watched, itemStatus.liked, itemStatus.disliked, pendingChanges.size]);

    const isListsOnly = initialView === 'lists';

    const handleInteractionToggle = async (type) => {
        if (isListsOnly) {
            setTempStatus(prev => {
                const isDisliked = type === 'dislike';
                const isLiked = type === 'like';
                const newState = { ...prev, [type]: !prev[type] };

                // Mutual exclusivity for like/dislike in temp status
                if (!prev[type]) { // If turning ON
                    if (isLiked) newState.dislike = false;
                    if (isDisliked) newState.like = false;
                }
                return newState;
            });
            setPendingChanges(prev => {
                const next = new Set(prev);
                next.add('like');
                next.add('dislike');
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

        const isRemoving = itemStatus[type === 'like' ? 'liked' : 'disliked'];
        const newInteraction = isRemoving ? null : type;
        updateLocalStatus(type, movie.id, !isRemoving);

        const interactionLabel = t(`status.${type}s`);
        const msg = isRemoving ? t("common.removedFromList", { label: interactionLabel }) : t("common.addedToList", { label: interactionLabel });
        window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));

        window.dispatchEvent(new CustomEvent("contentStatusChanged", {
            detail: { tmdb_id: movie.id, interactionStatus: newInteraction, watchlistStatus: currentWatchlist }
        }));

        // Do NOT auto close context menu when clicking Top Icons to allow multiple list edits
        // onClose();

        try {
            await libraryApi.toggle({
                tmdb_id: movie.id,
                media_type: movie.type === "series" ? "series" : "movie",
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date,
                genre_ids: Array.isArray(movie.genre_ids) ? movie.genre_ids.join(",") : movie.genre_ids,
                action: type,
                value: !isRemoving
            });
        } catch (err) {
            console.error(err);
            updateLocalStatus('interaction', movie.id, currentInteraction);
        }
    };

    const handleListSelect = async (newStatus) => {
        if (isListsOnly) {
            setTempStatus(prev => {
                const newState = { ...prev, [newStatus]: !prev[newStatus] };
                // Mutual exclusivity
                if (newStatus === 'watchlist' && newState.watchlist) {
                    // newState.watched = false; // ASYMMETRIC: Don't clear watched
                }
                if (newStatus === 'watched' && newState.watched) {
                    newState.watchlist = false; // SYMMETRIC: Clear watchlist
                }
                return newState;
            });
            setPendingChanges(prev => {
                const next = new Set(prev);
                next.add('watchlist');
                next.add('watched');
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

        const isRemoving = itemStatus[newStatus === 'watchlist' ? 'watchlist' : 'watched'];
        const finalStatusStr = isRemoving ? null : newStatus;

        updateLocalStatus(newStatus, movie.id, !isRemoving);

        const listLabel = t(`status.${newStatus}`);
        const msg = isRemoving ? t("common.removedFromList", { label: listLabel }) : t("common.addedToList", { label: listLabel });
        window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));

        const currentStatus = getItemStatus(movie.id);
        const finalStatus = {
            ...currentStatus,
            watchlist: newStatus === 'watchlist' ? !isRemoving : (newStatus === 'watched' ? false : currentStatus.watchlist),
            watched: newStatus === 'watched' ? !isRemoving : currentStatus.watched
        };

        window.dispatchEvent(new CustomEvent("contentStatusChanged", {
            detail: {
                tmdb_id: movie.id,
                media_type: movie.type === "series" ? "series" : "movie",
                watchlistStatus: finalStatusStr,
                interactionStatus: currentInteraction,
                ...finalStatus
            }
        }));

        // Do NOT auto close context menu when clicking Top Icons to allow multiple list edits
        // onClose();

        try {
            await libraryApi.toggle({
                tmdb_id: movie.id,
                media_type: movie.type === "series" ? "series" : "movie",
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date,
                genre_ids: Array.isArray(movie.genre_ids) ? movie.genre_ids.join(",") : movie.genre_ids,
                action: newStatus,
                value: !isRemoving
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

            const keys = ['watchlist', 'watched', 'like', 'dislike'];

            // Collect all changes first
            const changes = [];
            keys.forEach(key => {
                const newValue = tempStatus[key];
                const statusKey = key === 'like' ? 'liked' : (key === 'dislike' ? 'disliked' : key);
                const oldValue = itemStatus[statusKey];

                if (newValue !== oldValue) {
                    changes.push({ key, value: newValue });
                }
            });

            // Process sequentially to avoid race conditions on the same DB row
            for (const change of changes) {
                await libraryApi.toggle({
                    tmdb_id: movie.id,
                    media_type: mediaType,
                    title: movie.title || movie.name,
                    poster_path: movie.poster_path,
                    vote_average: movie.vote_average,
                    release_date: movie.release_date,
                    genre_ids: movie.genre_ids, // Send as is, backend handles list/string
                    action: change.key,
                    value: change.value
                });
                updateLocalStatus(change.key, movie.id, change.value);
            }

            // Process Custom Lists
            for (const list of customLists) {
                const wasInList = list.items?.some(i => i.tmdb_id === movie.id);
                const isNowInList = tempCustomLists[list.id];
                if (wasInList !== isNowInList) {
                    if (isNowInList) {
                        await customListApi.addItems(list.id, [{ tmdb_id: movie.id }]);
                    } else {
                        await customListApi.removeItem(list.id, movie.id);
                    }
                }
            }

            window.dispatchEvent(new CustomEvent("show-toast", { detail: t("common.saved") }));

            // Normalize for event
            const watchlistStatus = tempStatus.watchlist ? 'watchlist' : (tempStatus.watched ? 'watched' : null);
            const interactionStatus = tempStatus.like ? 'like' : (tempStatus.dislike ? 'dislike' : null);

            window.dispatchEvent(new CustomEvent("contentStatusChanged", {
                detail: {
                    tmdb_id: movie.id,
                    media_type: movie.type === "series" ? "series" : "movie",
                    watchlistStatus: watchlistStatus,
                    interactionStatus: interactionStatus,
                    watchlist: tempStatus.watchlist,
                    watched: tempStatus.watched,
                    liked: tempStatus.like,
                    disliked: tempStatus.dislike
                }
            }));

            onClose();
        } catch (err) {
            console.error("Kaydetme hatası:", err);
            window.dispatchEvent(new CustomEvent("show-toast", { detail: t("common.error") }));
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
        const type = movie.type === "profile" ? 'follow-user' : 'follow-person';
        const extraData = !isFollowing ? {
            name: movie.title,
            username: movie.title,
            profile_path: movie.poster_path,
            avatar_url: movie.poster_path,
            tmdb_id: movie.id
        } : {};

        updateLocalStatus(type, movie.type === "profile" ? movie.title : movie.id, !isFollowing, extraData);

        const msg = !isFollowing ? t("social.userFollowed", { user: movie.title }) : t("social.userUnfollowed", { user: movie.title });
        window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));

        try {
            if (movie.type === "profile") {
                isFollowing
                    ? await followsApi.unfollowUser(movie.title)
                    : await followsApi.followUser(movie.title);
            } else {
                isFollowing
                    ? await followsApi.unfollowPerson(movie.id)
                    : await followsApi.followPerson(movie.id);
            }
            window.dispatchEvent(new CustomEvent("contentStatusChanged", {
                detail: { tmdb_id: movie.id, isFollowing: !isFollowing }
            }));
            onClose();
        } catch (err) {
            console.error(err);
            updateLocalStatus(type, movie.type === "profile" ? movie.title : movie.id, isFollowing);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showCreateModal) return;
            if (menuRef.current && !menuRef.current.contains(e.target) &&
                !e.target.closest(`button[title="${t("common.options")}"]`) &&
                !e.target.closest(`button[title="${t("common.addToList")}"]`)) {
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
        window.dispatchEvent(new CustomEvent("show-toast", { detail: t("social.linkCopied") }));
        onClose();
    };

    const getNavPath = () => {
        if (movie.type === "profile") return `/${movie.title}`;
        if (movie.type === "person") return `/people/${movie.id}`;
        return `/${movie.type === "series" ? "series" : "movies"}/${movie.id}`;
    };

    const MenuItem = ({ icon: Icon, label, onClick, onMouseEnter, hasSubmenu, rightIcon: RightIcon, active, interactionType }) => {
        const handleMouseEnter = (e) => {
            cancelCloseSubmenu();
            if (hasSubmenu) {
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
                className={`w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-all flex items-center justify-between group/item rounded-sm text-text-primary/90 hover:text-white ${hasSubmenu ? 'cursor-default' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon size={17} strokeWidth={1.5} className={active ? 'text-white' : ''} />}
                    <span className="text-[13px] font-medium">{label}</span>
                </div>
                {hasSubmenu && <ChevronRight size={14} strokeWidth={2} className="text-text-secondary/50 group-hover/item:text-white transition-colors" />}
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
                            className={active ? 'icon-active-check' : 'text-white/30 group-hover/item:text-white'}
                        />
                    </div>
                )}
            </button>
        );
    };

    const TopIcon = ({ status, icon: Icon, label }) => {
        const isInteraction = status === 'like' || status === 'dislike';

        let isActive = false;
        if (isListsOnly) {
            isActive = tempStatus[status];
        } else {
            isActive = isInteraction ? itemStatus[status === 'like' ? 'liked' : 'disliked'] : itemStatus[status];
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
                    className={`transition-all ${isActive ? "text-white" : "text-[#555] group-hover:text-white group-hover:scale-110 active:scale-95"}`}
                    fill={isActive ? "currentColor" : "none"}
                />
            </button>
        );
    };

    const CustomListRow = ({ list }) => {
        const wasInList = list.items?.some(i => i.tmdb_id === movie.id);
        const [instantSaved, setInstantSaved] = useState(wasInList);
        const displaySaved = isListsOnly ? (tempCustomLists[list.id] ?? wasInList) : instantSaved;
        const [isListLoading, setIsListLoading] = useState(false);

        const toggleList = async (e) => {
            e.stopPropagation();
            if (!requireAuth()) {
                if (isListsOnly) onClose();
                return;
            }

            if (isListsOnly) {
                setTempCustomLists(prev => ({
                    ...prev,
                    [list.id]: !prev[list.id]
                }));
                setPendingChanges(prev => new Set(prev).add(`custom_${list.id}`));
            } else {
                setIsListLoading(true);
                try {
                    if (displaySaved) {
                        await customListApi.removeItem(list.id, movie.id);
                        setInstantSaved(false);
                        window.dispatchEvent(new CustomEvent("show-toast", { detail: t("common.removedFromList", { label: list.title }) }));
                    } else {
                        await customListApi.addItems(list.id, [{ tmdb_id: movie.id }]);
                        setInstantSaved(true);
                        window.dispatchEvent(new CustomEvent("show-toast", { detail: t("common.addedToList", { label: list.title }) }));
                    }
                } catch (err) {
                    console.error(err);
                    window.dispatchEvent(new CustomEvent("show-toast", { detail: t("errors.generic") }));
                } finally {
                    setIsListLoading(false);
                }
            }
        };

        return (
            <div onClick={toggleList} className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] transition-all cursor-pointer group rounded-sm">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                    <List size={16} strokeWidth={1.5} className={`flex-shrink-0 ${displaySaved ? "text-brand" : "text-[#666] group-hover:text-white"}`} />
                    <span className="font-medium text-[13px] text-white/90 transition-colors group-hover:text-white truncate">{list.title}</span>
                </div>
                {isListLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                ) : displaySaved ? (
                    <SquareCheck size={18} strokeWidth={1.5} className="icon-active-check flex-shrink-0" />
                ) : (
                    <SquarePlus size={18} strokeWidth={1.5} className="text-[#555] group-hover:text-white flex-shrink-0" />
                )}
            </div>
        );
    };

    const CreateNewListRow = () => (
        <div onClick={(e) => { e.stopPropagation(); setShowCreateModal(true); }} className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] transition-all cursor-pointer group rounded-sm border-b border-white/[0.05] mb-1">
            <div className="flex items-center gap-3 min-w-0 pr-2">
                <Plus size={16} strokeWidth={1.5} className="flex-shrink-0 text-[#666] group-hover:text-white" />
                <span className="font-medium text-[13px] text-white/90 transition-colors group-hover:text-white truncate">{t("myLists.newListBtn") || "Yeni Liste Oluştur"}</span>
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

    const menuStyle = {};

    if (position.x !== undefined) {
        const menuWidth = 210;
        const estimatedHeight = isListsOnly ? 450 : (movie.type === "person" || movie.type === "profile") ? 120 : 260;

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

    return createPortal(
        <div
            ref={menuRef}
            style={menuStyle}
            className={`fixed z-[9999] bg-bg-surface border border-white/[0.08] rounded shadow-2xl p-1.5 min-w-[210px] animate-in fade-in zoom-in duration-150 ${isListsOnly ? 'w-[230px]' : ''}`}
            onClick={(e) => e.stopPropagation()}
        >
            {isListsOnly ? (
                <>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
                        <span className="text-[14px] font-semibold text-white/60">{t("common.addToList")}</span>
                        <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors cursor-pointer">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex items-center justify-around py-3 px-2 border-b border-white/[0.05]">
                        <TopIcon status="like" icon={ThumbsUp} label={t("status.likes")} />
                        <TopIcon status="dislike" icon={ThumbsDown} label={t("status.dislikes")} />
                        <TopIcon status="watchlist" icon={Clock} label={t("status.watchlist")} />
                        <TopIcon status="watched" icon={Eye} label={t("status.watched")} />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar mt-1">
                        <div className="py-1">
                            <CreateNewListRow />
                            {customListLoading ? (
                                <div className="px-3 py-4 text-center text-xs text-white/50">{t("common.loading")}</div>
                            ) : customLists.length > 0 ? (
                                customLists.map(list => (
                                    <CustomListRow key={list.id} list={list} />
                                ))
                            ) : (
                                <div className="px-3 py-4 text-center text-xs text-white/50">{t("myLists.noLists") || "No lists found"}</div>
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
                    {(movie.type === "person" || movie.type === "profile") ? (
                        <>
                            <MenuItem
                                label={currentIsFollowing ? t("social.unfollow") : t("social.follow")}
                                icon={currentIsFollowing ? UserCheck : UserPlus}
                                active={currentIsFollowing}
                                onMouseEnter={closeSubmenuWithDelay}
                                onClick={() => { handleFollowToggle(); }}
                            />
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-around py-2 px-1 border-b border-white/[0.05] mb-1">
                                <TopIcon status="like" icon={ThumbsUp} label={t("status.likes")} />
                                <TopIcon status="dislike" icon={ThumbsDown} label={t("status.dislikes")} />
                                <TopIcon status="watchlist" icon={Clock} label={t("status.watchlist")} />
                                <TopIcon status="watched" icon={Eye} label={t("status.watched")} />
                            </div>

                            <MenuItem
                                label={t("common.addToList")}
                                icon={Plus}
                                hasSubmenu
                                onMouseEnter={() => setActiveSubmenu('lists')}
                            />

                            <MenuItem
                                label={t("details.watchOptions")}
                                icon={Play}
                                onMouseEnter={closeSubmenuWithDelay}
                                onClick={() => { navigate(`${getNavPath()}/watch`); onClose(); }}
                            />
                            <MenuItem
                                label={t("details.cast")}
                                icon={Users}
                                onMouseEnter={closeSubmenuWithDelay}
                                onClick={() => { navigate(`${getNavPath()}/cast`); onClose(); }}
                            />
                        </>
                    )}

                    <MenuItem
                        label={t("social.share")}
                        icon={Share}
                        hasSubmenu
                        onMouseEnter={() => setActiveSubmenu('share')}
                    />

                    {activeSubmenu && (
                        <div
                            ref={submenuRef}
                            className={`absolute bg-bg-surface border border-white/[0.08] rounded shadow-2xl p-1.5 min-w-[180px] animate-in fade-in slide-in-from-left-2 duration-150 ${getSubmenuClass()}`}
                            style={{ top: submenuTop }}
                            onMouseEnter={cancelCloseSubmenu}
                        >
                            {activeSubmenu === 'share' ? (
                                <MenuItem
                                    label={t("social.copyLink")}
                                    icon={Copy}
                                    onClick={handleShare}
                                />
                            ) : (
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <CreateNewListRow />
                                    {customListLoading ? (
                                        <div className="px-3 py-4 text-center text-xs text-white/50">{t("common.loading")}</div>
                                    ) : customLists.length > 0 ? (
                                        customLists.map(list => (
                                            <CustomListRow key={list.id} list={list} />
                                        ))
                                    ) : (
                                        <div className="px-3 py-4 text-center text-xs text-white/50">{t("myLists.noLists") || "No lists found"}</div>
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
                    initialItems={[{ id: movie.id, title: movie.title || movie.name, poster_path: movie.poster_path }]}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        fetchLists();
                    }}
                />
            )}
        </div>,
        document.body
    );
}
