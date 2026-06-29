import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { libraryApi, userApi } from "../api";
import { URL_TO_STATUS } from "../constants";
import MovieList from "../components/content/MovieList";
import { MovieListSkeleton } from "../components/content/CardSkeleton";

export default function MixedListView({ user: currentUser, status: propStatus }) {
    const { t } = useLanguage();
    const { username, status: urlStatus } = useParams();
    const { profileData } = useOutletContext();
    
    const effectiveStatus = propStatus || urlStatus;
    const status = URL_TO_STATUS[effectiveStatus] || effectiveStatus;
    const isInteraction = status === "like" || status === "dislike";

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        movies: [],
        series: []
    });

    useEffect(() => {
        const loadData = async () => {
            if (!profileData) return;
            setLoading(true);
            try {
                let movieData = [];
                let seriesData = [];

                [movieData, seriesData] = await Promise.all([
                    libraryApi.getUserList(username, status, "movie"),
                    libraryApi.getUserList(username, status, "series")
                ]);

                const mapContent = (items) => items.map(item => ({ ...item, id: item.tmdb_id || item.id }));

                setData({
                    movies: mapContent(movieData),
                    series: mapContent(seriesData)
                });
            } catch (err) {
                console.error("Mixed view loading error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [username, status, profileData, isInteraction]);

    if (loading) {
        return (
            <div className="space-y-12 animate-fade-in">
                <MovieListSkeleton isSmall={true} />
                <MovieListSkeleton isSmall={true} />
            </div>
        );
    }

    const hasContent = data.movies.length > 0 || data.series.length > 0;

    if (!hasContent) {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-bg-surface/20 rounded-[3rem] border-2 border-dashed border-white/5">
                <h3 className="text-xl font-bold text-text-secondary">{t("mixedListView.emptyTitle")}</h3>
                <p className="text-text-secondary/50 mt-2">{t("mixedListView.emptySub")}</p>
            </div>
        );
    }

    const getTitle = (mediaType) => {
        const keyMap = {
            "like": mediaType === "movie" ? "likedMovies" : "likedSeries",
            "dislike": mediaType === "movie" ? "dislikedMovies" : "dislikedSeries",
            "watchlist": mediaType === "movie" ? "watchlistMovies" : "watchlistSeries",
            "watched": mediaType === "movie" ? "completedMovies" : "completedSeries"
        };
        return t(`mixedListView.${keyMap[status]}`) || status;
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {data.movies.length > 0 && (
                <MovieList
                    title={getTitle("movie")}
                    contents={data.movies.slice(0, 20).map(m => ({ ...m, hideDetails: true }))}
                    to={`/${username}/${effectiveStatus}/movies`}
                    user={currentUser}
                    variant="small"
                />
            )}
            
            {data.series.length > 0 && (
                <MovieList
                    title={getTitle("series")}
                    contents={data.series.slice(0, 20).map(m => ({ ...m, hideDetails: true }))}
                    to={`/${username}/${effectiveStatus}/series`}
                    user={currentUser}
                    variant="small"
                />
            )}
        </div>
    );
}
