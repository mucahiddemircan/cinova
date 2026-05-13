import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link, useOutletContext } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { STATUS_SLUGS } from "../constants";
import { useLibrary } from "../context/LibraryContext";
import {
    Clock,
    Check,
    ThumbsUp,
    ThumbsDown,
    List,
    Lock,
    Plus
} from "lucide-react";
import OverlappingCarousel from "../components/common/OverlappingCarousel";
import { libraryApi, customListApi } from "../api";
import Skeleton from "../components/layout/Skeleton";
import CreateListModal from "../components/layout/CreateListModal";

export default function MyLists({ user: currentUser }) {
    const { username } = useParams();
    const location = useLocation();
    const { libraryData } = useLibrary();
    const { profileData } = useOutletContext();
    const { t } = useLanguage();

    const [summary, setSummary] = useState({ watchlist: null, interaction: null });
    const [customLists, setCustomLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [createModalType, setCreateModalType] = useState(null);

    // URL'den hangi sekmede olduğumuzu belirle
    const isSeries = location.pathname.includes("/series");
    const isLists = location.pathname.includes("/lists");

    const activeTab = isSeries ? "series" : "movie";

    useEffect(() => {
        const loadData = async () => {
            if (!profileData) return;
            setLoading(true);
            setError(null);
            try {
                const [libSummary, customListData] = await Promise.all([
                    libraryApi.getSummary(username),
                    customListApi.getByUsername(username)
                ]);
                // libSummary is either {stats, status_map} (for 'me') or just stats (for username)
                const stats = libSummary.stats || libSummary;
                setSummary(stats);
                setCustomLists(customListData);
            } catch (err) {
                console.error("Veri çekme hatası:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [username, profileData]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 animate-fade-in">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="flex flex-col items-start w-full gap-4">
                        {/* Simplified Carousel Skeleton */}
                        <Skeleton className="w-full h-[100px] md:h-[140px] rounded-2xl" variant="shimmer" />

                        <div className="flex flex-col gap-2 w-full px-1">
                            <Skeleton className="h-6 w-3/4" variant="shimmer" />
                            <Skeleton className="h-4 w-1/2" variant="shimmer" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const categories = [
        {
            id: "watchlist",
            title: t("myLists.watchlist"),
            type: "watchlist",
            color: "indigo",
            icon: <Clock size={32} strokeWidth={2.5} />,
        },
        {
            id: "watched",
            title: t("myLists.completed"),
            type: "watchlist",
            color: "emerald",
            icon: <Check size={32} strokeWidth={2.5} />,
        },
        {
            id: "like",
            title: t("myLists.liked"),
            type: "interaction",
            color: "pink",
            icon: <ThumbsUp size={32} strokeWidth={2.5} />,
        },
        {
            id: "dislike",
            title: t("myLists.disliked"),
            type: "interaction",
            color: "red",
            icon: <ThumbsDown size={32} strokeWidth={2.5} />,
        }
    ];

    const getColorStyles = (color) => {
        const styles = {
            indigo: "bg-indigo-950/20 text-indigo-400 group-hover:border-indigo-500/30",
            orange: "bg-orange-950/20 text-orange-400 group-hover:border-orange-500/30",
            emerald: "bg-emerald-950/20 text-emerald-400 group-hover:border-emerald-500/30",
            gray: "bg-slate-900 text-slate-400 group-hover:border-slate-500/30",
            pink: "bg-pink-950/20 text-pink-400 group-hover:border-pink-500/30",
            red: "bg-red-950/20 text-red-400"
        };
        return styles[color] || "bg-white/5 text-text-secondary";
    };

    return (
        <div className="animate-fade-in pb-12">
            {!isLists ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {categories.map((cat) => {
                        const dataKey = activeTab === "series" ? "series" : "movie";
                        const catData = summary[cat.id]?.[dataKey] || { count: 0, posters: [] };
                        const count = catData.count;
                        const posters = catData.posters;
                        const statusSlug = STATUS_SLUGS[cat.id] || cat.id;

                        return (
                            <div
                                key={cat.id}
                                className="flex flex-col items-start w-full"
                            >
                                <Link
                                    to={`/${username}/${activeTab === 'series' ? 'series' : 'movies'}/${statusSlug}`}
                                    className="w-full mb-4 cursor-pointer flex justify-start"
                                >
                                    <OverlappingCarousel posters={posters} className="justify-start" />
                                </Link>

                                <div className="flex flex-col items-start text-left w-full min-w-0 px-1">
                                    <Link
                                        to={`/${username}/${activeTab === 'series' ? 'series' : 'movies'}/${statusSlug}`}
                                        className="text-lg md:text-xl font-black text-text-primary w-full pb-0.5 truncate hover:underline transition-all"
                                    >
                                        {cat.title}
                                    </Link>
                                    <Link
                                        to={`/${username}`}
                                        className="text-xs md:text-sm text-text-secondary font-medium hover:underline opacity-80 hover:opacity-100 transition-all"
                                    >
                                        @{username}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {currentUser?.username === username && (
                        <div className="flex flex-row items-center justify-between gap-4 md:gap-6 pb-4 px-1">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg md:text-2xl font-bold text-white mb-0.5 tracking-tight">{t("myLists.manageTitle")}</h2>
                                <p className="text-text-secondary text-[11px] md:text-sm font-medium opacity-85 leading-tight">
                                    {t("myLists.manageSub")}
                                </p>
                            </div>
                            <button
                                onClick={() => setCreateModalType("movie")}
                                className="flex-shrink-0 w-fit px-4 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer text-[11px] md:text-sm whitespace-nowrap flex items-center gap-2"
                            >
                                <Plus size={16} strokeWidth={2.5} />
                                {t("myLists.newListBtn")}
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {customLists?.map((list) => {
                            const typePath = list.media_type === "movie" ? "movies" : "series";
                            return (
                                <div
                                    key={list.id}
                                    className="flex flex-col items-start"
                                >
                                    <Link
                                        to={`/${username}/lists/${list.slug}`}
                                        className="w-full mb-4 cursor-pointer flex justify-start relative group"
                                    >
                                        <OverlappingCarousel posters={list.posters} className="justify-start" />
                                    </Link>

                                    <div className="flex flex-col items-start text-left w-full min-w-0 px-1">
                                        <Link
                                            to={`/${username}/lists/${list.slug}`}
                                            className="text-lg md:text-xl font-black text-white mb-0.5 truncate hover:underline transition-all w-full"
                                        >
                                            {list.title}
                                        </Link>
                                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-text-secondary font-medium opacity-80">
                                            <Link to={`/${username}`} className="hover:underline transition-all">@{username}</Link>
                                            <span>•</span>
                                            <span>
                                                {t("myLists.listInfo", {
                                                    privacy: list.is_private ? t("common.private") : t("common.public"),
                                                    type: list.media_type === 'movie' ? t("common.movieList") : t("common.seriesList")
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {customLists?.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                                <p className="text-text-secondary font-bold">{t("myLists.noLists")}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {createModalType && (
                <CreateListModal
                    mediaType={createModalType}
                    onClose={() => setCreateModalType(null)}
                    onSuccess={() => {
                        // Veriyi yenile
                        customListApi.getByUsername(username).then(setCustomLists);
                        // Sidebar'ı da haberdar et
                        window.dispatchEvent(new CustomEvent("library-updated"));
                    }}
                />
            )}
        </div>
    );
}
