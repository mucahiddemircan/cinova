import { useState, useEffect, useRef } from "react";
import { useParams, NavLink, Outlet, useLocation } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { userApi } from "../../api";
import FollowButton from "./FollowButton";
import FollowStats from "./FollowStats";
import FollowMenu from "./FollowMenu";
import Skeleton from "../layout/Skeleton";
import { useLibrary } from "../../context/LibraryContext";
import Avatar from "../common/Avatar";
import NotFound from "../../pages/NotFound";
import ErrorState from "../common/ErrorState";

/**
 * Common layout component for user profile.
 * Contains user info at top and tabbed navigation.
 */
export default function ProfileLayout({ user: currentUser }) {
    const { t, getLocalizedPath } = useLanguage();
    const { username } = useParams();
    const location = useLocation();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isSelf = currentUser && currentUser.username === username;

    useEffect(() => {
        setLoading(true);
        setError(null);
        setProfileData(null);
        initialFollowStatusRef.current = null;

        userApi
            .getByUsername(username)
            .then((data) => setProfileData(data))
            .catch((err) => setError(err))
            .finally(() => setLoading(false));
    }, [username]);

    // Monitor global follow status
    const { isFollowingUser } = useLibrary();
    const isCurrentlyFollowing = isFollowingUser(username);

    // Store initial follow status (to calculate count difference)
    const initialFollowStatusRef = useRef(null);
    useEffect(() => {
        if (profileData && initialFollowStatusRef.current === null) {
            initialFollowStatusRef.current = profileData.is_following;
        }
    }, [profileData]);

    // Calculate follower count to display
    const getDisplayedFollowersCount = () => {
        if (!profileData) return 0;
        if (initialFollowStatusRef.current === null) return profileData.followers_count || 0;

        const diff = (isCurrentlyFollowing ? 1 : 0) - (initialFollowStatusRef.current ? 1 : 0);
        return Math.max(0, (profileData.followers_count || 0) + diff);
    };

    if (loading) {
        return (
            <div className="w-full animate-fade-in">
                {/* Profile Top Section Skeleton */}
                <header className="mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 text-center md:text-left">
                    <div className="shrink-0">
                        <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full" variant="shimmer" />
                    </div>

                    <div className="flex flex-col gap-5 items-center md:items-start w-full min-w-0">
                        <Skeleton className="h-12 md:h-20 w-3/4 max-w-md" variant="shimmer" />
                        
                        <div className="flex gap-6">
                            <Skeleton className="h-6 w-24" variant="shimmer" />
                            <Skeleton className="h-6 w-24" variant="shimmer" />
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full mt-2">
                            <Skeleton className="h-11 w-32 rounded-xl" variant="shimmer" />
                            <Skeleton className="h-11 w-11 rounded-xl" variant="shimmer" />
                        </div>
                    </div>
                </header>

                {/* Tab Navigation Skeleton */}
                <div className="flex items-center gap-6 md:gap-8 mb-10 border-b border-white/5 pb-[1px]">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="pb-4">
                            <Skeleton className="h-5 w-24 md:w-32" variant="shimmer" />
                        </div>
                    ))}
                </div>
                
                {/* Sub Content Skeleton (Grid view simulation) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col gap-4">
                            <Skeleton className="aspect-[2/3] w-full rounded-2xl" variant="shimmer" />
                            <Skeleton className="h-6 w-3/4" variant="shimmer" />
                            <Skeleton className="h-4 w-1/2" variant="shimmer" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error?.status === 404) {
        return <NotFound />;
    }

    if (error || !profileData) {
        return (
            <ErrorState 
                title={error?.message || t("errors.notFound.user")}
                subtitle={t("errors.notFound.subtitle")}
                buttonText={t("common.backToHome")}
                buttonLink="/"
                errorCode={error?.status === 404 ? "404" : null}
            />
        );
    }

    const tabs = [
        { name: t("profileLayout.overview"), path: getLocalizedPath(`/${username}`), end: true },
        { name: t("profileLayout.likes"), path: getLocalizedPath(`/${username}/likes`), end: false },
        { name: t("profileLayout.dislikes"), path: getLocalizedPath(`/${username}/dislikes`), end: false },
        { name: t("profileLayout.watchlist"), path: getLocalizedPath(`/${username}/watchlist`), end: false },
        { name: t("profileLayout.watched"), path: getLocalizedPath(`/${username}/watched`), end: false },
        { name: t("profileLayout.lists"), path: getLocalizedPath(`/${username}/lists`), end: true },
    ];

    return (
        <div className="w-full animate-fade-in">
            {/* Profile Top Section */}
            <header className="mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 text-center md:text-left">
                <div className="shrink-0">
                    <Avatar 
                        src={profileData.avatar_url} 
                        alt={profileData.username} 
                        size="xl" 
                        type="profile"
                        className="w-32 h-32 md:w-40 md:h-40 shadow-2xl"
                    />
                </div>

                <div className="flex flex-col gap-5 items-center md:items-start w-full min-w-0">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-text-primary tracking-tighter leading-tight break-all">
                        {profileData.username}
                    </h1>

                    <FollowStats
                        followersCount={getDisplayedFollowersCount()}
                        followingCount={profileData.following_count}
                        username={username}
                    />

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full">
                        <FollowButton
                            isSelf={isSelf}
                            isFollowing={profileData.is_following}
                            username={username}
                            type="user"
                            extraData={{
                                username: username,
                                name: username,
                                avatar_url: profileData.avatar_url
                            }}
                        />
                        {!isSelf && (
                            <FollowMenu
                                isFollowing={profileData.is_following}
                                username={username}
                                type="user"
                                extraData={{
                                    username: username,
                                    name: username,
                                    avatar_url: profileData.avatar_url
                                }}
                            />
                        )}
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="flex items-center gap-6 md:gap-8 mb-10 border-b border-white/5 relative overflow-x-auto scrollbar-none pb-[1px]">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end={tab.end}
                        className={({ isActive }) =>
                            `pb-4 text-[13px] md:text-sm font-bold tracking-wide transition-all relative whitespace-nowrap shrink-0 ${
                                isActive ? "text-white" : "text-text-secondary hover:text-text-primary"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {tab.name}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full z-10" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Sub Content */}
            <div className="min-h-[400px]">
                <Outlet context={{ profileData, isSelf }} />
            </div>
        </div>
    );
}
