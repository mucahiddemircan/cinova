import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { libraryApi } from "../api";

const LibraryContext = createContext(null);

export function LibraryProvider({ children, user }) {
    const [libraryData, setLibraryData] = useState({
        status_map: {}, // tmdb_id -> { watchlist: bool, watched: bool, liked: bool, disliked: bool }
        follows: { users: [], people: [] },
        custom_lists: []
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const fetchLibraryData = useCallback(async () => {
        if (!user) {
            setLibraryData({
                status_map: {},
                follows: { users: [], people: [] },
                custom_lists: []
            });
            return;
        }
        
        const hasData = Object.keys(libraryData.status_map).length > 0 || libraryData.follows.users.length > 0;
        if (!hasData) {
            setLoading(true);
        }
        try {
            const data = await libraryApi.getSummary();
            setLibraryData(data);
        } catch (err) {
            console.error("Kütüphane verisi yüklenemedi:", err);
        } finally {
            setLoading(false);
        }
    }, [user, libraryData.status_map.length, libraryData.follows.users.length]);

    useEffect(() => {
        fetchLibraryData();
    }, [fetchLibraryData]);

    // Durum sorgulama yardımcıları
    const getItemStatus = useCallback((tmdbId) => {
        const item = libraryData.status_map[tmdbId] || libraryData.status_map[String(tmdbId)];
        return item || { watchlist: false, watched: false, liked: false, disliked: false };
    }, [libraryData.status_map]);

    const getWatchlistStatus = useCallback((tmdbId) => {
        const item = getItemStatus(tmdbId);
        if (item.watchlist) return 'watchlist';
        if (item.watched) return 'watched';
        return null;
    }, [getItemStatus]);

    const getInteractionStatus = useCallback((tmdbId) => {
        const item = getItemStatus(tmdbId);
        if (item.liked) return 'like';
        if (item.disliked) return 'dislike';
        return null;
    }, [getItemStatus]);

    const isFollowingUser = useCallback((username) => {
        return libraryData.follows.users.some(u => u.username === username);
    }, [libraryData.follows.users]);

    const isFollowingPerson = useCallback((tmdbId) => {
        const numId = Number(tmdbId);
        return libraryData.follows.people.some(p => (p.tmdb_id || p.id) === numId);
    }, [libraryData.follows.people]);

    // Yerel durumu güncelleme
    const updateLocalStatus = useCallback((action, id, value, extraData = {}) => {
        setLibraryData(prev => {
            const newData = { ...prev };
            const numId = Number(id);
            
            if (['watchlist', 'watched', 'like', 'dislike', 'interaction'].includes(action)) {
                newData.status_map = { ...prev.status_map };
                if (!newData.status_map[numId]) {
                    newData.status_map[numId] = { watchlist: false, watched: false, liked: false, disliked: false };
                }

                const item = { ...newData.status_map[numId] };
                
                if (action === 'watchlist') {
                    if (typeof value === 'string') {
                        if (value === 'watchlist') {
                            item.watchlist = true;
                        } else if (value === 'watched') {
                            item.watched = true;
                            item.watchlist = false;
                        }
                    } else {
                        item.watchlist = !!value;
                    }
                } else if (action === 'watched') {
                    item.watched = !!value;
                    if (value) item.watchlist = false;
                } else if (action === 'like') {
                    item.liked = !!value;
                    if (value) item.disliked = false;
                } else if (action === 'dislike') {
                    item.disliked = !!value;
                    if (value) item.liked = false;
                } else if (action === 'interaction') {
                    // value is 'like', 'dislike' or null
                    item.liked = value === 'like';
                    item.disliked = value === 'dislike';
                }
                
                newData.status_map[numId] = item;
            } else if (action === 'follow-user') {
                if (value) {
                    if (!prev.follows.users.some(u => u.username === id)) {
                        newData.follows = { 
                            ...prev.follows, 
                            users: [{ username: id, ...extraData }, ...prev.follows.users] 
                        };
                    }
                } else {
                    newData.follows = { 
                        ...prev.follows, 
                        users: prev.follows.users.filter(u => u.username !== id) 
                    };
                }
            } else if (action === 'follow-person') {
                const numId = Number(id);
                if (value) {
                    if (!prev.follows.people.some(p => (p.tmdb_id || p.id) === numId)) {
                        newData.follows = { 
                            ...prev.follows, 
                            people: [{ id: numId, tmdb_id: numId, ...extraData }, ...prev.follows.people] 
                        };
                    }
                } else {
                    newData.follows = { 
                        ...prev.follows, 
                        people: prev.follows.people.filter(p => (p.tmdb_id || p.id) !== numId) 
                    };
                }
            }
            return newData;
        });
    }, []);

    const value = {
        user,
        libraryData,
        loading,
        getWatchlistStatus,
        getInteractionStatus,
        getItemStatus,
        isFollowingUser,
        isFollowingPerson,
        updateLocalStatus,
        refreshLibrary: fetchLibraryData
    };

    return (
        <LibraryContext.Provider value={value}>
            {children}
        </LibraryContext.Provider>
    );
}

export const useLibrary = () => {
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error("useLibrary, LibraryProvider içinde kullanılmalıdır.");
    }
    return context;
};
