/**
 * Homepage component.
 *
 * Trending content, popular actors/directors and
 * personalized recommendations for logged-in users.
 */

import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import useScrollRestoration from "../hooks/useScrollRestoration";
import MovieList from "../components/content/MovieList";
import PersonList from "../components/content/PersonList";
import { MovieListSkeleton, PersonListSkeleton } from "../components/content/CardSkeleton";
import { recommendationsApi } from "../api";

const EMPTY_RECS = {
    followed_works_movies: [],
    followed_works_series: [],
    genre_recommendations_movies: [],
    genre_recommendations_series: [],
    list_recommendations_movies: [],
    list_recommendations_series: [],
};

export default function HomeView({ contents, people, loading, user }) {
    const location = useLocation();
    const { t } = useLanguage();

    const [personalRecs, setPersonalRecs] = useState(() => {
        if (!user) return EMPTY_RECS;
        const cached = sessionStorage.getItem(`personal_recs_${user.id}`);
        try {
            const parsed = cached ? JSON.parse(cached) : null;
            // Detect and clean old cache format
            if (parsed && ("followed_works" in parsed || !("followed_works_movies" in parsed))) {
                sessionStorage.removeItem(`personal_recs_${user.id}`);
                return EMPTY_RECS;
            }
            return parsed || EMPTY_RECS;
        } catch (e) {
            return EMPTY_RECS;
        }
    });
    const hasInitialData = personalRecs.list_recommendations_movies.length > 0 ||
        personalRecs.list_recommendations_series.length > 0 ||
        personalRecs.genre_recommendations_movies.length > 0 ||
        personalRecs.genre_recommendations_series.length > 0 ||
        personalRecs.followed_works_movies.length > 0 ||
        personalRecs.followed_works_series.length > 0;

    const [recsLoading, setRecsLoading] = useState(false);

    const isReady = !loading && !recsLoading && location.pathname === "/";
    useScrollRestoration("homeScrollPos", isReady);

    useEffect(() => {
        if (user) {
            // User-based cache check
            const cacheKey = `personal_recs_${user.id}`;
            const cachedData = sessionStorage.getItem(cacheKey);

            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    // Old format check
                    if (parsed && "followed_works_movies" in parsed) {
                        setPersonalRecs(parsed);
                        setRecsLoading(false);
                        return;
                    }
                    sessionStorage.removeItem(cacheKey);
                } catch (e) {
                    sessionStorage.removeItem(cacheKey);
                }
            }

            // If no data, start loading state
            setRecsLoading(true);

            recommendationsApi.getPersonalized()
                .then(data => {
                    setPersonalRecs(data);
                    // Save data to cache
                    sessionStorage.setItem(cacheKey, JSON.stringify(data));
                })
                .catch(err => console.error("Öneriler alınamadı:", err))
                .finally(() => setRecsLoading(false));
        } else {
            setRecsLoading(false);
        }
    }, [user?.id]); // Only runs when user ID changes (or on initial load)

    if (loading && contents.length === 0) {
        return (
            <div className="flex flex-col gap-2">
                <MovieListSkeleton />
                <MovieListSkeleton />
                <PersonListSkeleton />
            </div>
        );
    }

    const movies = contents.filter((c) => c.type === "movie");
    const series = contents.filter((c) => c.type === "series");

    return (
        <div className="animate-fade-in flex flex-col gap-2">
            {!user && (
                <div className="md:hidden mb-4 p-6 bg-gradient-to-br from-bg-surface to-bg-base border border-white/5 rounded-3xl overflow-hidden relative group">
                    <h4 className="text-white font-bold text-lg mb-2">
                        {t("home.ctaTitle")}
                    </h4>
                    <p className="text-text-secondary text-sm mb-5 leading-relaxed">
                        {t("home.ctaText")}
                    </p>
                    <Link
                        to="/register"
                        className="inline-block bg-brand hover:bg-brand-hover text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/20 transition-all active:scale-95"
                    >
                        {t("home.ctaButton")}
                    </Link>
                </div>
            )}

            {user && (
                <>
                    {personalRecs.list_recommendations_movies.length > 0 && (
                        <MovieList
                            title={t("home.listRecsMovies")}
                            contents={personalRecs.list_recommendations_movies}
                            to="/movies/recommendations"
                            state={{ title: t("home.listRecsMovies") }}
                            user={user}
                        />
                    )}
                    {personalRecs.list_recommendations_series.length > 0 && (
                        <MovieList
                            title={t("home.listRecsSeries")}
                            contents={personalRecs.list_recommendations_series}
                            to="/series/recommendations"
                            state={{ title: t("home.listRecsSeries") }}
                            user={user}
                        />
                    )}
                    {personalRecs.genre_recommendations_movies.length > 0 && (
                        <MovieList
                            title={t("home.genreRecsMovies")}
                            contents={personalRecs.genre_recommendations_movies}
                            to="/movies/recommendations"
                            state={{ title: t("home.genreRecsMovies") }}
                            user={user}
                        />
                    )}
                    {personalRecs.genre_recommendations_series.length > 0 && (
                        <MovieList
                            title={t("home.genreRecsSeries")}
                            contents={personalRecs.genre_recommendations_series}
                            to="/series/recommendations"
                            state={{ title: t("home.genreRecsSeries") }}
                            user={user}
                        />
                    )}
                    {personalRecs.followed_works_movies.length > 0 && (
                        <MovieList
                            title={t("home.followedMovies")}
                            contents={personalRecs.followed_works_movies}
                            to="/movies/recommendations"
                            state={{ title: t("home.followedMovies") }}
                            user={user}
                        />
                    )}
                    {personalRecs.followed_works_series.length > 0 && (
                        <MovieList
                            title={t("home.followedSeries")}
                            contents={personalRecs.followed_works_series}
                            to="/series/recommendations"
                            state={{ title: t("home.followedSeries") }}
                            user={user}
                        />
                    )}

                    {/* Show skeleton while recommendations load - Only when loading is active and no data is present */}
                    {recsLoading && !hasInitialData && (
                        <div className="flex flex-col gap-2">
                            <MovieListSkeleton />
                        </div>
                    )}
                </>
            )}

            <MovieList
                title={t("home.trendMovies")}
                contents={movies}
                to="/movies/trending"
                state={{ title: t("home.trendMovies") }}
                user={user}
            />
            <PersonList
                title={t("home.popularPeople")}
                contents={people}
                to="/people/popular"
                state={{ title: t("home.popularPeople") }}
                user={user}
            />
            <MovieList
                title={t("home.trendSeries")}
                contents={series}
                to="/series/trending"
                state={{ title: t("home.trendSeries") }}
                user={user}
            />
        </div>
    );
}

