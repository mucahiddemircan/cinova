import { useState, useEffect } from "react";
import { useOutletContext, Link, useParams } from "react-router-dom";
import {
    Folder
} from "lucide-react";
import { interactionsApi, customListApi, userApi, libraryApi } from "../api";
import OverlappingCarousel from "../components/common/OverlappingCarousel";
import MovieList from "../components/content/MovieList";
import Skeleton from "../components/layout/Skeleton";
import { MovieListSkeleton } from "../components/content/CardSkeleton";
import { useLanguage } from "../context/LanguageContext";

export default function Profile({ user: currentUser }) {
    const { username } = useParams();
    const { profileData } = useOutletContext();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        likedMovies: [],
        likedSeries: [],
        completedMovies: [],
        completedSeries: [],
        customLists: []
    });

    useEffect(() => {
        const loadProfileSummary = async () => {
            if (!profileData) return;
            setLoading(true);
            try {
                const [
                    likedMovies,
                    likedSeries,
                    watchedMovies,
                    watchedSeries,
                    customLists
                ] = await Promise.all([
                    libraryApi.getUserList(username, "like", "movie"),
                    libraryApi.getUserList(username, "like", "series"),
                    libraryApi.getUserList(username, "watched", "movie"),
                    libraryApi.getUserList(username, "watched", "series"),
                    customListApi.getByUsername(username)
                ]);

                const mapContent = (items, type) => items.map(item => ({ 
                    ...item, 
                    id: item.tmdb_id || item.id,
                    type: item.media_type || item.type || type
                }));

                setData({
                    likedMovies: mapContent(likedMovies, "movie"),
                    likedSeries: mapContent(likedSeries, "series"),
                    completedMovies: mapContent(watchedMovies, "movie"),
                    completedSeries: mapContent(watchedSeries, "series"),
                    customLists
                });
            } catch (err) {
                console.error("Profil özeti yüklenemedi:", err);
            } finally {
                setLoading(false);
            }
        };

        loadProfileSummary();
    }, [username, profileData]);

    useEffect(() => {
        const handleStatusChange = (e) => {
            const { tmdb_id, liked, watched, media_type } = e.detail;
            
            setData(prev => {
                const newData = { ...prev };
                const mType = media_type || (e.detail.watchlistStatus ? (e.detail.watchlistStatus.includes('movie') ? 'movie' : 'series') : null);
                
                // Liked lists
                if (e.detail.hasOwnProperty('liked')) {
                    const likedKey = `liked${mType === 'series' ? 'Series' : 'Movies'}`;
                    if (liked) {
                        // Normally we'd fetch details, but for now we just remove if unliked
                        // If liked, we can't easily add without full details, so we might skip adding for now
                        // or just force refresh
                    } else {
                        newData[likedKey] = prev[likedKey].filter(it => it.tmdb_id !== tmdb_id);
                    }
                }

                // Watched lists
                if (e.detail.hasOwnProperty('watched')) {
                    const watchedKey = `completed${mType === 'series' ? 'Series' : 'Movies'}`;
                    if (watched) {
                        // Skip adding for now (needs details)
                    } else {
                        newData[watchedKey] = prev[watchedKey].filter(it => it.tmdb_id !== tmdb_id);
                    }
                }
                
                return newData;
            });

            // If it's a "Liked" or "Watched" event and we don't have details, better to just refresh after a delay
            if (e.detail.liked || e.detail.watched) {
                // setTimeout(() => loadProfileSummary(), 500); 
                // For simplicity, we can just let it be until refresh if adding, 
                // but removals will be instant.
            }
        };

        window.addEventListener('contentStatusChanged', handleStatusChange);
        return () => window.removeEventListener('contentStatusChanged', handleStatusChange);
    }, [username]);

    if (loading) {
        return (
            <div className="space-y-10 animate-fade-in">
                {/* Sliders Skeleton */}
                {[1, 2, 3, 4].map((i) => (
                    <MovieListSkeleton key={i} isSmall={true} count={8} />
                ))}

                {/* Custom Lists Skeleton */}
                <div className="mt-16 space-y-8">
                    <Skeleton className="h-8 w-48 rounded-lg" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col items-start w-full gap-4">
                                <Skeleton className="w-full h-[100px] md:h-[140px] rounded-2xl" variant="shimmer" />
                                <div className="flex flex-col gap-2 w-full px-1">
                                    <Skeleton className="h-6 w-3/4" variant="shimmer" />
                                    <Skeleton className="h-4 w-1/2" variant="shimmer" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const hasAnyContent =
        data.customLists.length > 0 ||
        data.likedMovies.length > 0 ||
        data.likedSeries.length > 0 ||
        data.completedMovies.length > 0 ||
        data.completedSeries.length > 0;

    if (!hasAnyContent) {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-bg-surface/20 rounded-[3rem] border-2 border-dashed border-white/5">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 text-text-secondary/20">
                    <Folder size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-text-secondary">{t("profile.noContent")}</h3>
                <p className="text-text-secondary/50 mt-2">{t("profile.noContentSub")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {data.likedMovies.length > 0 && (
                <MovieList
                    title={t("profile.likedMovies")}
                    contents={data.likedMovies.slice(0, 20).map(m => ({ ...m, hideDetails: true }))}
                    to={`/${username}/likes/movies`}
                    user={currentUser}
                    variant="small"
                />
            )}

            {data.likedSeries.length > 0 && (
                <MovieList
                    title={t("profile.likedSeries")}
                    contents={data.likedSeries.slice(0, 20).map(m => ({ ...m, hideDetails: true }))}
                    to={`/${username}/likes/series`}
                    user={currentUser}
                    variant="small"
                />
            )}

            {data.completedMovies.length > 0 && (
                <MovieList
                    title={t("profile.watchedMovies")}
                    contents={data.completedMovies.slice(0, 20).map(m => ({ ...m, hideDetails: true }))}
                    to={`/${username}/watched/movies`}
                    user={currentUser}
                    variant="small"
                />
            )}

            {data.completedSeries.length > 0 && (
                <MovieList
                    title={t("profile.watchedSeries")}
                    contents={data.completedSeries.slice(0, 20).map(m => ({ ...m, hideDetails: true }))}
                    to={`/${username}/watched/series`}
                    user={currentUser}
                    variant="small"
                />
            )}

            {data.customLists.length > 0 && (
                <section className="mb-10">
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-xl md:text-2xl font-bold text-text-primary">
                            <Link to={`/${username}/lists`} className="hover:underline decoration-white cursor-pointer transition-all">
                                {t("profile.lists")}
                            </Link>
                        </h2>
                        <Link to={`/${username}/lists`} className="text-sm text-text-secondary hover:text-text-primary hover:underline cursor-pointer font-medium tracking-wide transition-colors decoration-white mb-1">
                            {t("profile.showAllLists")}
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {data.customLists.map((list) => {
                            return (
                                <div key={list.id} className="flex flex-col items-start w-full">
                                    <Link
                                        to={`/${username}/lists/${list.slug}`}
                                        className="w-full mb-4 cursor-pointer flex justify-start relative group"
                                    >
                                        <OverlappingCarousel posters={list.posters} className="justify-start" />
                                    </Link>

                                    <div className="flex flex-col items-start text-left w-full min-w-0 px-1">
                                        <Link
                                            to={`/${username}/lists/${list.slug}`}
                                            className="text-lg font-black text-text-primary hover:underline truncate w-full"
                                        >
                                            {list.title}
                                        </Link>
                                        <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium opacity-60">
                                            <Link to={`/${username}`} className="hover:underline transition-all">@{username}</Link>
                                            <span>•</span>
                                            <span>
                                                {list.is_private ? t("common.private") : t("common.public")} {list.media_type === 'movie' ? t("common.movieList") : t("common.seriesList")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
