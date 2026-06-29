import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { followsApi } from "../../api";
import { useLibrary } from "../../context/LibraryContext";
import { useUI } from "../../context/UIContext";
import { Settings, Loader2, Plus, Pencil } from "lucide-react";

export default function FollowButton({
    isSelf,
    onToggle,
    username,
    personId,
    type, // 'user' or 'person'
    extraData, // name, profile_path etc. for sidebar
    isFollowing: propFollowing, // To be used if Context is not ready yet during page load
    size = "md" // 'sm' or 'md'
}) {
    const { t } = useLanguage();
    const { user, isFollowingUser, isFollowingPerson, updateLocalStatus, loading: libraryLoading } = useLibrary();
    const { requireAuth } = useUI();
    const [loading, setLoading] = useState(false);

    // If Context is still loading or empty, use the prop from page data
    const followingFromContext = type === 'user' ? isFollowingUser(username) : isFollowingPerson(personId);
    const following = (propFollowing !== undefined && !followingFromContext && libraryLoading)
        ? propFollowing
        : followingFromContext;

    if (isSelf) {
        return (
            <Link
                to="/settings"
                className={`${size === 'sm' ? 'px-3 py-1.5 text-[10px] rounded-lg' : 'px-4 py-2 text-xs rounded-xl'} bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5 flex items-center gap-2`}
            >
                <Pencil size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />
                {t("profile.editProfile")}
            </Link>
        );
    }

    const handleFollow = async (e) => {
        if (e) e.stopPropagation();
        if (!requireAuth() || loading) return;

        setLoading(true);
        const contextType = type === 'user' ? 'follow-user' : 'follow-person';
        const id = type === 'user' ? username : personId;

        updateLocalStatus(contextType, id, !following, !following ? extraData : {});
        onToggle?.(!following);

        try {
            if (following) {
                if (type === 'user') await followsApi.unfollowUser(username);
                else await followsApi.unfollowPerson(personId);
            } else {
                if (type === 'user') await followsApi.followUser(username);
                else await followsApi.followPerson(personId);
            }
        } catch (err) {
            console.error("Takip hatası:", err);
            updateLocalStatus(contextType, id, following);
            onToggle?.(following);
        } finally {
            setLoading(false);
        }
    };

    const sizeClasses = size === 'sm' 
        ? "px-4 py-1.5 rounded-lg text-[10px] min-w-[80px]" 
        : "px-8 py-3 rounded-2xl text-sm min-w-[140px]";

    return (
        <button
            onClick={handleFollow}
            onMouseDown={(e) => e.stopPropagation()}
            onAuxClick={(e) => e.stopPropagation()}
            className={`${sizeClasses} font-bold transition-all flex items-center justify-center gap-1.5 ${following
                ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                : "bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20"
                } active:scale-95 cursor-pointer ${loading ? "opacity-70" : "opacity-100"}`}
        >
            {!following && <Plus size={size === 'sm' ? 14 : 18} strokeWidth={2.5} />}

            <span>
                {following ? t("follows.unfollow") : t("follows.follow")}
            </span>
        </button>
    );
}
