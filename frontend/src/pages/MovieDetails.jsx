/**
 * İçerik detay sayfası bileşeni.
 *
 * Film veya dizi detayları, oyuncular, yönetmenler, sezon/bölüm listesi,
 * beğeni/beğenmeme etkileşimleri, yorumlar ve benzer içerik önerileri.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useMetadata } from "../context/MetadataContext";
import { contentApi, libraryApi } from "../api";
import useScrollRestoration from "../hooks/useScrollRestoration";
import MovieCard from "../components/content/MovieCard";
import MovieList from "../components/content/MovieList";
import PersonCard from "../components/content/PersonCard";
import CardActions from "../components/content/CardActions";
import { resolveGenreNames, parseGenreIds } from "../utils";
import TrailerModal from "../components/common/TrailerModal";
import ActionMenu from "../components/content/ActionMenu";
import CommentSystem from "../components/comments/CommentSystem";
import {
    ChevronLeft,
    ChevronRight,
    Star,
    Play,
    Video,
    ThumbsUp,
    ThumbsDown,
    MessageSquare
} from "lucide-react";
import { useCertification } from "../context/CertificationContext";
import { useLibrary } from "../context/LibraryContext";
import { useUI } from "../context/UIContext";
import Skeleton from "../components/layout/Skeleton";
import { MovieListSkeleton } from "../components/content/CardSkeleton";
import Button from "../components/common/Button";
import PlaceholderImage from "../components/common/PlaceholderImage";
import Avatar from "../components/common/Avatar";
import ErrorState from "../components/common/ErrorState";

export default function MovieDetails({ user }) {
    const { t } = useLanguage();
    const { id } = useParams();
    const { getInteractionStatus, updateLocalStatus } = useLibrary();
    const { requireAuth } = useUI();
    const location = useLocation();
    const type = location.pathname.includes("/series/") ? "series" : "movie";
    const { getCertInfo } = useCertification();
    const { getGenreName, translateLocal } = useMetadata();
    const navigate = useNavigate();
    const [movie, setMovie] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [movieLoading, setMovieLoading] = useState(true);
    const [recsLoading, setRecsLoading] = useState(true);
    const [showTrailer, setShowTrailer] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);

    const scrollToComments = () => {
        const element = document.getElementById("comments-section");
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    useScrollRestoration(`movie_details_scroll_${type}_${id}`, !movieLoading && !recsLoading);

    useEffect(() => {
        setMovieLoading(true);
        setRecsLoading(true);

        contentApi
            .getById(type, id)
            .then((data) => setMovie(data))
            .catch((err) => console.error("Detay çekme hatası:", err))
            .finally(() => setMovieLoading(false));

        contentApi
            .getRecommendations(type, id)
            .then((data) => setRecommendations(data))
            .catch((err) => console.error("Öneri çekme hatası:", err))
            .finally(() => setRecsLoading(false));
    }, [type, id]);



    const handleInteraction = async (actionType) => {
        if (!requireAuth()) return;

        const currentInteraction = getInteractionStatus(id);
        const newInteraction = currentInteraction === actionType ? null : actionType;

        updateLocalStatus('interaction', id, newInteraction);

        window.dispatchEvent(new CustomEvent("contentStatusChanged", {
            detail: { tmdb_id: id, interactionStatus: newInteraction }
        }));

        try {
            const isRemoving = currentInteraction === actionType;
            await libraryApi.toggle({
                tmdb_id: movie.id || parseInt(id),
                media_type: type,
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date,
                action: actionType,
                value: !isRemoving,
                genre_ids: movie.genre_ids
            });
        } catch (err) {
            console.error(err);
            updateLocalStatus('interaction', id, currentInteraction);
        }
    };

    if (movieLoading) {
        return (
            <div className="animate-fade-in">
                <div className="mb-8"><Skeleton className="h-4 w-24" /></div>
                <header className="mb-14 flex flex-col lg:flex-row gap-12 border-b border-white/5 pb-14">
                    <Skeleton className="w-64 h-96 rounded-2xl shrink-0" variant="shimmer" />
                    <div className="flex-1 flex flex-col gap-6 pt-4">
                        <Skeleton className="h-16 w-1/2" />
                        <Skeleton className="h-6 w-48" />
                        <div className="flex gap-4">
                            <Skeleton className="h-12 w-32 rounded-full" />
                        </div>
                    </div>
                </header>
                <MovieListSkeleton />
            </div>
        );
    }

    if (!movie || movie.detail) {
        return (
            <ErrorState
                title={t("errors.notFound.title")}
                subtitle={t("errors.notFound.subtitle")}
                buttonText={t("errors.notFound.homeBtn")}
                buttonLink="/"
                errorCode="404"
            />
        );
    }

    const trProviders = movie.watch_providers?.TR || {};
    const allTR = [
        ...(trProviders.flatrate || []),
        ...(trProviders.ads || []),
        ...(trProviders.free || [])
    ];

    // Unique providers by provider_id
    const featuredProviders = Array.from(new Map(allTR.map(p => [p.provider_id, p])).values()).slice(0, 3);

    return (
        <div className="animate-fade-in">
            {/* Unified Hero Section */}
            <div
                className="relative mb-14 breakout -mt-3 bg-bg-base min-h-0 lg:min-h-[650px] lg:h-[calc(100vh-100px)] lg:max-h-[900px]"
            >
                {movie.backdrop_path && (
                    <div className="absolute top-0 left-0 right-0 h-[220px] lg:h-full z-0">
                        <div
                            className="absolute inset-0 bg-cover bg-center immersive-mask"
                            style={{
                                backgroundImage: `url(${movie.backdrop_path})`,
                                backgroundPosition: 'center 20%'
                            }}
                        />
                        {/* Immersive overlay for depth and readability - Letterboxd style */}
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-transparent lg:via-bg-base/20" />
                        <div className="absolute inset-0 lg:bg-gradient-to-r lg:from-bg-base/60 lg:via-transparent lg:to-bg-base/60" />
                        <div className="absolute inset-0 lg:bg-black/40" />
                    </div>
                )}

                <div className="relative z-10 container mx-auto px-4 lg:px-6 pt-32 pb-6 lg:py-14 xl:py-16 grid grid-cols-[128px_1fr] lg:flex lg:flex-row gap-x-6 gap-y-2 lg:gap-12 items-start h-full">
                    <div className="col-start-1 col-end-2 flex flex-col items-start lg:items-start gap-6 shrink-0">
                        <div
                            className="w-32 lg:w-60 xl:w-72 aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] lg:shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 shrink-0 group transition-all duration-700"
                        >
                            {movie.poster_path ? (
                                <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover transition-all duration-1000" />
                            ) : (
                                <PlaceholderImage type={type} />
                            )}
                        </div>



                    </div>

                    {/* Mobile Title & Metadata (Right of Poster) */}
                    <div className="col-start-2 col-end-3 lg:hidden pt-2 flex flex-col justify-center min-h-[192px]">
                        <h1 className="text-xl sm:text-2xl font-black mb-2 text-white tracking-tight leading-[1.2] drop-shadow-sm line-clamp-3">
                            {movie.title}
                        </h1>

                        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1.5 text-[12px] sm:text-[13px] text-white/50 font-medium">
                            {movie.release_date && <span className="text-white/80">{new Date(movie.release_date).getFullYear()}</span>}

                            {movie.vote_average > 0 && (
                                <>
                                    <span className="flex items-center gap-1 text-yellow-500 font-bold">
                                        <Star size={14} fill="#eab308" color="#eab308" />
                                        {movie.vote_average.toFixed(1)}
                                    </span>
                                </>
                            )}

                            {movie.certification && (() => {
                                const certInfo = getCertInfo(movie.certification);
                                if (!certInfo) return null;
                                return (
                                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold leading-none ${certInfo.colorClass}`}>
                                        {certInfo.label}
                                    </span>
                                );
                            })()}

                            <span className="text-white/70">
                                {movie.type === "series" ? (
                                    t("details.seasonsCount", { count: movie.number_of_seasons })
                                ) : (
                                    movie.runtime && (
                                        <>
                                            {Math.floor(movie.runtime / 60) > 0
                                                ? t("details.runtime", { hours: Math.floor(movie.runtime / 60), minutes: movie.runtime % 60 })
                                                : t("details.runtimeMinutes", { minutes: movie.runtime % 60 })}
                                        </>
                                    )
                                )}
                            </span>
                        </div>

                        {/* Mobile Genres (Optional, but helps fill the space) */}
                        {(movie.genres?.length > 0 || movie.genre_ids?.length > 0) && (
                            <div className="mt-3 text-[11px] sm:text-[12px] text-white/40 line-clamp-2">
                                {movie.genres?.length > 0 && Array.isArray(movie.genres)
                                    ? movie.genres.slice(0, 2).join(", ")
                                    : resolveGenreNames(movie.genre_ids?.slice(0, 2), getGenreName, type, "")}
                            </div>
                        )}
                    </div>

                    <div className="col-start-1 col-end-3 lg:col-auto lg:flex-1 text-left lg:text-left pt-2 lg:pt-4">
                        <div className="hidden lg:block">
                            <h1 className="text-2xl lg:text-5xl xl:text-6xl font-black mb-3 lg:mb-4 text-white tracking-tight leading-[1.2] lg:leading-[1.1] drop-shadow-sm">
                                {movie.title}
                            </h1>

                            <div className="flex flex-wrap items-center justify-start lg:justify-start gap-x-4 gap-y-2 mb-6 text-[13px] lg:text-sm xl:text-base text-white/50 font-medium">
                                {movie.release_date && <span className="text-white/80">{new Date(movie.release_date).getFullYear()}</span>}

                                {movie.vote_average > 0 && (
                                    <>
                                        {movie.release_date && <span className="w-1 h-1 rounded-full bg-white/20" />}
                                        <span className="flex items-center gap-1.5 text-yellow-500 font-bold">
                                            <Star size={16} fill="#eab308" color="#eab308" />
                                            {movie.vote_average.toFixed(1)}
                                        </span>
                                    </>
                                )}

                                {movie.certification && (() => {
                                    const certInfo = getCertInfo(movie.certification);
                                    if (!certInfo) return null;
                                    return (
                                        <>
                                            {(movie.release_date || movie.vote_average > 0) && <span className="w-1 h-1 rounded-full bg-white/20" />}
                                            <span className={`px-2 py-0.5 rounded border-2 text-xs font-bold leading-none ${certInfo.colorClass}`}>
                                                {certInfo.label}
                                            </span>
                                        </>
                                    );
                                })()}

                                {(movie.release_date || movie.vote_average > 0 || movie.certification) && <span className="w-1 h-1 rounded-full bg-white/20" />}
                                <span className="text-white/70 tracking-tight">
                                    {movie.type === "series" ? (
                                        t("details.seasonsCount", { count: movie.number_of_seasons })
                                    ) : (
                                        movie.runtime && (
                                            <>
                                                {Math.floor(movie.runtime / 60) > 0
                                                    ? t("details.runtime", { hours: Math.floor(movie.runtime / 60), minutes: movie.runtime % 60 })
                                                    : t("details.runtimeMinutes", { minutes: movie.runtime % 60 })}
                                            </>
                                        )
                                    )}
                                </span>

                                {/* Türler */}
                                {(movie.genres?.length > 0 || movie.genre_ids?.length > 0) && (
                                    <>
                                        {(movie.release_date || movie.vote_average > 0 || movie.certification || movie.runtime || movie.number_of_seasons) && <span className="w-1 h-1 rounded-full bg-white/20" />}
                                        <span className="text-white/70">
                                            {movie.genres?.length > 0 && Array.isArray(movie.genres)
                                                ? movie.genres.slice(0, 3).join(", ")
                                                : resolveGenreNames(movie.genre_ids, getGenreName, type, t("common.genreNotSpecified"))}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {movie.crew?.length > 0 && (
                            <div className="flex flex-wrap items-center justify-start lg:justify-start gap-x-6 gap-y-4 mb-6">
                                <h2 className="text-white text-sm md:text-base font-bold opacity-90 whitespace-nowrap">{t("details.directors")}:</h2>
                                <div className="flex flex-wrap items-center justify-start lg:justify-start gap-x-6 gap-y-3">
                                    {movie.crew.slice(0, 3).map((person, index) => (
                                        <div key={`${person.id}-${index}`} className="flex items-center gap-3 group/crew">
                                            <Link to={`/people/${person.id}`} className="shrink-0">
                                                <Avatar
                                                    src={person.profile_path}
                                                    alt={person.name}
                                                    size="sm"
                                                    type="person"
                                                />
                                            </Link>
                                            <Link to={`/people/${person.id}`} className="text-xs md:text-sm text-white font-bold hover:underline transition-all whitespace-nowrap">
                                                {person.name}
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}


                        <div className="max-w-3xl">
                            {movie.tagline && (
                                <p className="text-sm md:text-base lg:text-lg italic text-white/80 mb-3 font-medium leading-tight">
                                    {movie.tagline}
                                </p>
                            )}
                            <h2 className="text-white text-sm font-bold mb-2 opacity-90">{t("details.summary")}</h2>
                            <p className="text-[13px] md:text-sm text-white leading-relaxed opacity-90 break-words">
                                {movie.description}
                            </p>
                        </div>

                        {/* Unified Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-y-6 gap-x-4 pt-8 mt-10 border-t border-white/5">
                            {/* Left: 5 Interaction Icons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleInteraction("like")}
                                    className={`p-2 transition-all cursor-pointer hover:scale-105 ${getInteractionStatus(id) === "like" ? "text-white" : "text-[#b3b3b3] hover:text-white"}`}
                                    title={t("lists.liked")}
                                >
                                    <ThumbsUp size={26} fill={getInteractionStatus(id) === "like" ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={() => handleInteraction("dislike")}
                                    className={`p-2 transition-all cursor-pointer hover:scale-105 ${getInteractionStatus(id) === "dislike" ? "text-white" : "text-[#b3b3b3] hover:text-white"}`}
                                    title={t("lists.disliked")}
                                >
                                    <ThumbsDown size={26} fill={getInteractionStatus(id) === "dislike" ? "currentColor" : "none"} />
                                </button>

                                <CardActions
                                    movie={movie}
                                    user={user}
                                    variant="ghost"
                                />

                                <button
                                    onClick={scrollToComments}
                                    className="p-2 transition-all cursor-pointer hover:scale-105 text-[#b3b3b3] hover:text-white flex items-center gap-1 group/comm"
                                    title={t("comments.title")}
                                >
                                    <MessageSquare size={26} className={commentsCount > 0 ? "text-brand/60 group-hover/comm:text-brand" : ""} />
                                    {commentsCount > 0 && <span className="text-xs font-bold -ml-0.5">({commentsCount})</span>}
                                </button>
                            </div>

                            {/* Right: 2 Primary Action Buttons */}
                            <div className="flex items-center gap-3">
                                <Link
                                    to={`/${type === "series" ? "series" : "movies"}/${id}/watch`}
                                    className="shrink-0"
                                >
                                    <Button
                                        variant="primary"
                                        size="md"
                                        className="!px-4 md:!px-6 !text-xs md:!text-sm"
                                        icon={<Play size={18} fill="currentColor" />}
                                    >
                                        {t("details.watchOptions")}
                                        {featuredProviders?.length > 0 && (
                                            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10">
                                                <div className="flex -space-x-1.5">
                                                    {featuredProviders.map((p) => (
                                                        <img
                                                            key={p.provider_id}
                                                            src={p.logo_path}
                                                            alt={p.provider_name}
                                                            className="w-4 h-4 md:w-5 md:h-5 rounded shadow-sm border border-white/5"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Button>
                                </Link>

                                {movie.trailer_key && (
                                    <Button
                                        variant="surface"
                                        size="md"
                                        className="shrink-0 !px-4 md:!px-6 !text-xs md:!text-sm"
                                        icon={<Video size={18} />}
                                        onClick={() => setShowTrailer(true)}
                                    >
                                        {t("details.watchTrailer")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TrailerModal
                isOpen={showTrailer}
                onClose={() => setShowTrailer(false)}
                trailerKey={movie.trailer_key}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
                <div className="lg:col-span-2 space-y-10">
                    {movie.cast?.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <Link
                                    to={`/${type === "series" ? "series" : "movies"}/${id}/cast`}
                                    className="text-2xl font-bold flex items-center gap-3 group"
                                >
                                    <span className="group-hover:underline decoration-white transition-all">{t("details.cast")}</span>
                                </Link>
                                <Link
                                    to={`/${type === "series" ? "series" : "movies"}/${id}/cast`}
                                    className="text-sm text-text-secondary hover:text-text-primary hover:underline cursor-pointer font-medium tracking-wide transition-colors decoration-white"
                                >
                                    {t("common.showAll")}
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl overflow-hidden border border-white/5">
                                {movie.cast.slice(0, 8).map((person) => (
                                    <PersonCard key={person.id} person={person} variant="small" user={user} />
                                ))}
                            </div>
                        </div>
                    )}

                    {movie.type === "series" && movie.seasons?.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <Link
                                    to={`/series/${id}/seasons`}
                                    className="text-2xl font-bold flex items-center gap-3 group"
                                >
                                    <span className="group-hover:underline decoration-white transition-all">{t("details.seasonsAndEpisodes")}</span>
                                </Link>
                                <Link
                                    to={`/series/${id}/seasons`}
                                    className="text-sm text-text-secondary hover:text-text-primary hover:underline cursor-pointer font-medium tracking-wide transition-colors decoration-white"
                                >
                                    {t("common.showAll")}
                                </Link>
                            </div>

                            <div className="bg-bg-surface rounded-2xl border border-bg-surface-hover overflow-hidden">
                                <div className="divide-y divide-white/5">
                                    {movie.seasons?.slice(0, 3).map((season) => (
                                        <div
                                            key={season.id}
                                            onClick={() => navigate(`/series/${id}/seasons/${season.season_number}`)}
                                            className="p-4 flex gap-4 md:gap-6 bg-transparent hover:bg-white/[0.08] transition-all border-b border-white/[0.05] last:border-0 pb-6 cursor-pointer group/item"
                                        >
                                            <div className="w-20 sm:w-24 md:w-28 aspect-[2/3] rounded-md overflow-hidden border border-white/5 shrink-0 self-start shadow-sm">
                                                {season.poster_path ? (
                                                    <img src={season.poster_path} alt={season.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <PlaceholderImage type="series" iconSize={20} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-start">
                                                <h4 className="font-bold text-white text-sm md:text-base mb-1 tracking-tight">
                                                    <Link
                                                        to={`/series/${id}/seasons/${season.season_number}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="hover:underline decoration-white"
                                                    >
                                                        {season.name}
                                                    </Link>
                                                    <span className="ml-1.5 opacity-40 font-medium no-underline inline-block">({season.season_number === 0 ? t("details.specials") : `${t("details.season")} ${season.season_number}`})</span>
                                                </h4>
                                                <div className="flex items-center gap-2 mb-2 text-[11px] font-medium text-white/30">
                                                    <span>{season.episode_count} {t("details.episodes")}</span>
                                                    {season.air_date && (
                                                        <>
                                                            <span className="text-white/5">•</span>
                                                            <span>{new Date(season.air_date).getFullYear()}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-[12px] text-white/70 leading-relaxed font-normal whitespace-pre-wrap break-words max-w-4xl opacity-90">{season.overview || t("details.noSeasonOverview")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {movie.seasons?.length > 3 && (
                                    <Link to={`/series/${id}/seasons`} className="block py-4 text-center text-sm font-bold text-text-secondary hover:text-text-primary hover:bg-white/[0.02] transition-all border-t border-white/5 hover:underline decoration-white">
                                        {t("common.showAll")}
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-white/5">
                        <CommentSystem type={type} id={id} user={user} onCountChange={setCommentsCount} />
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-bg-surface p-6 rounded-2xl border border-bg-surface-hover">
                        <h3 className="text-sm font-bold text-text-secondary mb-6">{t("details.details")}</h3>
                        <div className="space-y-4">
                            {movie.production_companies?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-text-secondary/40 mb-1">{t("details.productionCompanies")}</p>
                                    <p className="text-sm font-bold text-white leading-snug">{movie.production_companies.join(", ")}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-bold text-text-secondary/40 mb-1">{t("details.status")}</p>
                                <p className="text-sm font-bold text-white">{translateLocal("status", movie.status)}</p>
                            </div>
                            {movie.original_title && (
                                <div>
                                    <p className="text-[10px] font-bold text-text-secondary/40 mb-1">{t("details.originalName")}</p>
                                    <p className="text-sm font-bold text-white">{movie.original_title}</p>
                                </div>
                            )}
                            {movie.original_language && (
                                <div>
                                    <p className="text-[10px] font-bold text-text-secondary/40 mb-1">{t("details.originalLanguage")}</p>
                                    <p className="text-sm font-bold text-white">{movie.original_language}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12">
                <MovieList
                    title={t("details.similarContent")}
                    contents={recommendations}
                    user={user}
                    hideShowAll={true}
                    noUnderline={true}
                    restoreKey={`recs_${type}_${id}`}
                />
                {!recsLoading && recommendations.length === 0 && (
                    <p className="text-text-secondary text-sm italic ml-3">{t("details.noSimilarContent")}</p>
                )}
            </div>

        </div>
    );
}
