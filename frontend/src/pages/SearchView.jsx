/**
 * Arama sayfası bileşeni.
 *
 * TMDB içerikleri ve yerel profiller üzerinde filtrelenebilir arama.
 * Sonuç yoksa kategori keşif alanı gösterilir.
 */

import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useMetadata } from "../context/MetadataContext";
import MovieCard from "../components/content/MovieCard";
import PersonCard from "../components/content/PersonCard";
import { MovieListSkeleton } from "../components/content/CardSkeleton";
import LocalizedLink from "../components/common/LocalizedLink";
import CardActions from "../components/content/CardActions";
import FollowButton from "../components/profile/FollowButton";
import { contentApi } from "../api";
import { resolveGenreNames } from "../utils";
import { Search, X } from "lucide-react";
import useScrollRestoration from "../hooks/useScrollRestoration";
import Avatar from "../components/common/Avatar";

export default function SearchView({ user }) {
    const { t, getLocalizedPath } = useLanguage();
    const { getGenreName } = useMetadata();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const FILTERS = [
        { id: "all", label: t("search.filterAll") },
        { id: "movie", label: t("search.filterMovies") },
        { id: "series", label: t("search.filterSeries") },
        { id: "person", label: t("search.filterPeople") },
        { id: "profile", label: t("search.filterProfiles") },
    ];

    const BROWSE_CATEGORIES = [
        {
            title: t("search.browseMovies"),
            items: [
                { name: t("movieCategories.popular"), path: "/movies/popular", color: "bg-indigo-900/40" },
                { name: t("movieCategories.now-playing"), path: "/movies/now-playing", color: "bg-emerald-900/40" },
                { name: t("movieCategories.upcoming"), path: "/movies/upcoming", color: "bg-rose-900/40" },
                { name: t("movieCategories.top-rated"), path: "/movies/top-rated", color: "bg-slate-800/60" },
            ]
        },
        {
            title: t("search.browseSeries"),
            items: [
                { name: t("seriesCategories.popular"), path: "/series/popular", color: "bg-cyan-900/40" },
                { name: t("seriesCategories.on-the-air"), path: "/series/on-the-air", color: "bg-purple-900/40" },
                { name: t("seriesCategories.top-rated"), path: "/series/top-rated", color: "bg-neutral-800/60" },
            ]
        }
    ];
    const query = searchParams.get("q") || "";
    const activeFilter = searchParams.get("type") || "all";

    const [results, setResults] = useState(activeFilter === "all" ? {} : []);
    const [loading, setLoading] = useState(false);
    const [localQuery, setLocalQuery] = useState(query);
    const handleClearInput = () => setLocalQuery("");
    const [isAdding, setIsAdding] = useState(false);

    // Scroll restorasyonu
    const scrollKey = `search_scroll_${query}_${activeFilter}`;
    useScrollRestoration(scrollKey, !loading);

    const handleSearchTrigger = () => {
        if (localQuery.trim()) {
            setSearchParams({ q: localQuery.trim(), type: activeFilter });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSearchTrigger();
        }
    };

    // URL'deki sorgu değiştiğinde local state'i güncelle
    useEffect(() => {
        setLocalQuery(query);
    }, [query]);

    // Arama işlemini gerçekleştir
    useEffect(() => {
        let isCancelled = false;

        if (!query.trim()) {
            setResults(activeFilter === "all" ? {} : []);
            setLoading(false);
            return;
        }

        setLoading(true);
        contentApi
            .search(query, activeFilter)
            .then((data) => {
                if (!isCancelled) setResults(data);
            })
            .catch((err) => {
                if (!isCancelled) console.error("Arama hatası:", err);
            })
            .finally(() => {
                if (!isCancelled) setLoading(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [query, activeFilter]);

    const handleFilterChange = (filterId) => {
        setSearchParams({ q: query, type: filterId });
    };

    const handleInputChange = (e) => {
        setLocalQuery(e.target.value);
    };

    const RelevantItem = ({ item, user }) => {
        const isPerson = ["person", "profile"].includes(item.type);
        const navigate = useNavigate();

        const handleClick = () => {
            if (item.type === "movie" || item.type === "series") {
                navigate(getLocalizedPath(`/${item.type === 'series' ? 'series' : 'movies'}/${item.id}`));
            } else if (item.type === "person") {
                navigate(getLocalizedPath(`/people/${item.id}`));
            } else if (item.type === "profile") {
                navigate(getLocalizedPath(`/${item.title}`));
            }
        };

        const onContextMenu = (e) => {
            // Context menu removed
        };

        const typeLabels = {
            movie: t("search.typeMovie"),
            series: t("search.typeSeries"),
            person: item.role || t("search.typePerson"),
            profile: t("search.typeProfile")
        };

        return (
            <div className={`relative group/card ${isAdding ? 'opacity-50 pointer-events-none' : ''}`}>
                <div
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-transparent hover:bg-white/10 transition-all cursor-pointer group/card border border-transparent"
                >
                    <div onClick={handleClick} className="flex items-center gap-3 min-w-0 flex-grow">
                        <div className="relative flex-shrink-0">
                            <Avatar
                                src={item.poster_path}
                                alt={item.title}
                                size={isPerson ? "md" : "w-10 h-14 rounded-md"}
                                type={item.type}
                                showBorder={!isPerson}
                                className={isPerson ? "" : "rounded-md"}
                            />
                        </div>

                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white line-clamp-2 hover:underline decoration-white">
                                    {item.title}
                                </h3>
                                <span className="text-[11px] font-medium text-white/50 whitespace-nowrap">
                                    • {typeLabels[item.type]}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-white/60">
                                {item.release_date && <span>{item.release_date.split("-")[0]}</span>}
                                {item.vote_average > 0 && (
                                    <>
                                        <span className="opacity-40">•</span>
                                        <div className="flex items-center gap-0.5 text-yellow-500 font-bold">
                                            <span className="text-[10px]">★</span>
                                            <span>{item.vote_average.toFixed(1)}</span>
                                        </div>
                                    </>
                                )}
                                {!isPerson && (
                                    <>
                                        <span className="opacity-40">•</span>
                                        <span className="truncate italic text-white/40">
                                            {resolveGenreNames(item.genre_ids, getGenreName, item.type, t("common.genreNotSpecified"))}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {user && (
                        <div className="flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity z-20 flex items-center gap-2 pr-2">
                            {isPerson && (
                                <FollowButton 
                                    username={item.title}
                                    personId={item.id}
                                    type={item.type === 'profile' ? 'user' : 'person'}
                                    size="sm"
                                    extraData={{
                                        name: item.title,
                                        profile_path: item.poster_path,
                                        id: item.id
                                    }}
                                />
                            )}
                            <CardActions 
                                movie={item} 
                                user={user} 
                                variant="list" 
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderGroup = (title, items, isPerson = null, variant = "grid") => {
        if (!items || items.length === 0) return null;

        if (variant === "list") {
            return (
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                        {title}
                        <span className="text-xs font-normal text-text-secondary opacity-40">({items.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {items.map((item) => (
                            <RelevantItem key={`${item.type}-${item.id}`} item={item} user={user} />
                        ))}
                    </div>
                </section>
            );
        }

        return (
            <section className="mb-10">
                <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                    {title}
                    <span className="text-sm font-normal text-text-secondary opacity-50">({items.length})</span>
                </h2>
                <div className={isPerson === true ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 rounded-2xl overflow-hidden" : `grid gap-6 grid-cols-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`}>
                    {items.map((item) => {
                        const isPersonType = isPerson === true || ["person", "profile"].includes(item.type);
                        return (
                            <div key={`${item.type}-${item.id}`}>
                                {isPersonType ? (
                                    <PersonCard person={item} />
                                ) : (
                                    <MovieCard movie={item} user={user} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        );
    };

    const hasResults = () => {
        if (activeFilter === "all") {
            return Object.values(results).some(arr => Array.isArray(arr) && arr.length > 0);
        }
        return Array.isArray(results) && results.length > 0;
    };

    return (
        <div className="py-6 animate-fade-in">
            <div className="md:hidden space-y-4 mb-8">
                {!query.trim() && <h1 className="text-3xl font-black text-white tracking-tight">{t("search.title")}</h1>}
                <div className="relative group">
                    <input
                        type="text"
                        value={localQuery}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={query.trim() ? t("search.continuePlaceholder") : t("search.placeholder")}
                        className="w-full bg-bg-surface border border-white/5 rounded-2xl py-4 pl-6 pr-12 text-white font-bold placeholder-text-secondary focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                    />
                    {localQuery && (
                        <button
                            onClick={handleClearInput}
                            className="absolute right-10 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
                            aria-label="Clear search"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    )}
                    <button
                        onClick={handleSearchTrigger}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-brand transition-colors hover:scale-110 active:scale-95"
                    >
                        <Search size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {query.trim() && (
                <h1 className="hidden md:block text-3xl font-bold text-text-primary mb-8">
                    {t("search.searchResults", { query })}
                </h1>
            )}

            {!query.trim() ? (
                <div className="space-y-10">
                    <h2 className="text-2xl font-bold text-white md:text-3xl">{t("search.browse")}</h2>

                    {BROWSE_CATEGORIES.map((section) => (
                        <div key={section.title} className="space-y-4">
                            <h3 className="text-lg font-bold text-text-secondary tracking-widest">{section.title}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {section.items.map((item) => (
                                    <LocalizedLink
                                        key={item.path}
                                        to={item.path}
                                        className={`${item.color} aspect-[3/2] rounded-2xl p-4 relative overflow-hidden group hover:brightness-75 transition-all active:scale-[0.98] cursor-pointer border border-white/5 shadow-lg`}
                                    >
                                        <span className="text-lg font-black text-white leading-tight relative z-10">{item.name}</span>
                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rotate-12 group-hover:brightness-75 transition-all"></div>
                                    </LocalizedLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none">
                        {FILTERS.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => handleFilterChange(f.id)}
                                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 border whitespace-nowrap ${activeFilter === f.id
                                    ? "bg-white text-black border-white shadow-lg shadow-white/10"
                                    : "bg-bg-surface text-text-secondary border-white/5 hover:border-white/20 hover:text-text-primary"
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex flex-col gap-4">
                            <MovieListSkeleton />
                            <MovieListSkeleton />
                        </div>
                    ) : !hasResults() ? (
                        <div className="text-center py-20 bg-bg-surface rounded-xl border border-white/5">
                            <p className="text-text-secondary text-lg">{t("search.noResults")}</p>
                            <p className="text-text-secondary/50 text-sm mt-2">{t("search.noResultsHint")}</p>
                        </div>
                    ) : activeFilter === "all" ? (
                        <div className="space-y-4">
                            {renderGroup(t("search.mostRelevant"), results.relevant, null, "list")}
                            {renderGroup(t("search.movies"), results.movies)}
                            {renderGroup(t("search.series"), results.series)}
                            {renderGroup(t("search.people"), results.people, true)}
                            {renderGroup(t("search.profiles"), results.profiles, true)}
                        </div>
                    ) : (
                        <div className={["person", "profile"].includes(activeFilter) ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 rounded-2xl overflow-hidden" : "grid gap-6 grid-cols-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"}>
                            {results.map((item) => (
                                <div key={`${item.type}-${item.id}`}>
                                    {["person", "profile"].includes(activeFilter) ? (
                                        <PersonCard person={item} />
                                    ) : (
                                        <MovieCard movie={item} user={user} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

        </div>
    );
}
