import { supabase } from "../utils/supabaseClient";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// In-memory token (to prevent deadlock)
let _accessToken = null;

/**
 * Called by App.jsx when session is opened or token is renewed.
 */
export const setAccessToken = (token) => {
    _accessToken = token;
};

export const getAccessToken = () => _accessToken;

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // We no longer query Supabase on every request, we use the in-memory token
    const token = _accessToken;

    // Forward user's selected language to backend (for TMDB language parameter)
    const appLanguage = localStorage.getItem("app_language") || "en";

    const config = {
        headers: { 
            "Content-Type": "application/json",
            "Accept-Language": appLanguage,
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            window.dispatchEvent(new CustomEvent("auth-unauthorized"));
        }
        const error = new Error(data.detail || "Bir hata oluştu");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

// Authentication & User
export const authApi = {
    login: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    register: (email, password, metadata) => supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: metadata } 
    }),
    loginWithGoogle: () => supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    }),
    logout: () => supabase.auth.signOut(),
    getMe: () => request("/me"),
    checkUsername: (username) => request(`/auth/check-username?username=${encodeURIComponent(username)}`),
    checkEmail: (email) => request(`/auth/check-email?email=${encodeURIComponent(email)}`),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
    }),
    updatePassword: (newPassword) => supabase.auth.updateUser({ password: newPassword }),
    updateEmail: (newEmail) => supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/settings` }
    ),
    completeProfile: (data) => request("/me/complete-profile", { method: "POST", body: JSON.stringify(data) }),
    resendConfirmation: (email) => supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
            emailRedirectTo: window.location.origin
        }
    }),
    refreshSession: () => supabase.auth.refreshSession(),
};

// Content (Movie / Series)
export const contentApi = {
    getHomeData: () => request("/movies/home-data"),
    search: (query, type = "all") => request(`/movies/search?q=${encodeURIComponent(query)}&type=${type}`),
    
    getById: (type, id) => {
        const path = type === "series" ? "series" : "movies";
        return request(`/${path}/${id}`);
    },
    
    getCategory: (type, category, page = 1) => {
        if (type === "person") {
            return request(`/people/popular?page=${page}`);
        }
        const path = type === "series" ? "series" : (type === "movies" ? "movies" : type);
        const catMap = {
            "movies-popular": "popular", "movies-now-playing": "now-playing", "movies-upcoming": "upcoming", "movies-top-rated": "top-rated",
            "series-popular": "popular", "series-on-the-air": "on-the-air", "series-top-rated": "top-rated"
        };
        const mappedCat = catMap[`${type}-${category}`] || category;
        return request(`/${path}/${mappedCat}?page=${page}`);
    },

    discover: (type, params) => {
        const path = type === "series" ? "series" : "movies";
        const queryParams = new URLSearchParams(params).toString();
        return request(`/${path}/discover?${queryParams}`);
    },
    
    getRecommendations: (type, id) => {
        const path = type === "series" ? "series" : "movies";
        return request(`/${path}/${id}/recommendations`);
    },
    
    getSeason: (seriesId, seasonNumber) => request(`/series/${seriesId}/seasons/${seasonNumber}`),
    
    getCast: (type, id) => {
        const path = type === "series" ? "series" : "movies";
        return request(`/${path}/${id}/cast`);
    },
};

// People
export const peopleApi = {
    getPersonDetails: (id) => request(`/people/${id}`),
};

// Library (Standardized Library)
export const libraryApi = {
    toggle: (body) => request("/library/", { method: "POST", body: JSON.stringify(body) }),
    getStatus: (mediaType, tmdbId) => request(`/library/status/${mediaType}/${tmdbId}`),
    getSummary: (username = "me") => request(`/library/summary${username === "me" ? "-me" : `/${username}`}`),
    getUserList: (username, action, mediaType = null) => {
        const query = mediaType ? `?media_type=${mediaType}` : "";
        return request(`/library/list/${username || "me"}/${action}${query}`);
    },
};

// Backward Compatibility Wrappers (to be refactored)
export const interactionsApi = {
    toggle: (body) => {
        const libraryBody = {
            ...body,
            action: body.interaction_type,
            value: true
        };
        return libraryApi.toggle(libraryBody);
    },
    getStatus: (tmdbId, mediaType) => libraryApi.getStatus(mediaType, tmdbId),
    getByType: (userId, mediaType, type) => {
        return libraryApi.getUserList(userId || "me", type, mediaType);
    }
};

export const watchlistApi = {
    getSummary: async (username) => {
        const data = await libraryApi.getSummary(username || "me");
        const stats = data.stats || data;
        return stats;
    }
};

export const userApi = {
    getByUsername: (username) => request(`/profiles/${username}`),
    getUserList: (username, type, status) => {
        const action = status === 'Plan to Watch' ? 'watchlist' : 'watched';
        return libraryApi.getUserList(username, action, type);
    },
};

// Following System
export const followsApi = {
    followUser: (username) => request(`/follows/profile/${username}`, { method: "POST" }),
    unfollowUser: (username) => request(`/follows/profile/${username}`, { method: "DELETE" }),
    followPerson: (personId) => request(`/follows/person/${personId}`, { method: "POST" }),
    unfollowPerson: (personId) => request(`/follows/person/${personId}`, { method: "DELETE" }),
    getStats: (username) => request(`/follows/profile/${username}/stats`),
    getPersonStats: (personId) => request(`/follows/person/${personId}/stats`),
    getFollowers: (username) => request(`/follows/profile/${username}/followers`),
    getFollowing: (username) => request(`/follows/profile/${username}/following`),
    getFollowedUsers: () => request("/follows/following/profiles"),
    getFollowedPeople: () => request("/follows/following/people"),
};

// Comments
export const commentApi = {
    getByContent: (type, id, sort = "newest") => request(`/comments/${type}/${id}?sort=${sort}`),
    getReplies: (commentId) => request(`/comments/${commentId}/replies`),
    create: (body) => request("/comments/", { method: "POST", body: JSON.stringify(body) }),
    interact: (commentId, type) => request(`/comments/${commentId}/interact?interaction_type=${type}`, { method: "POST" }),
    delete: (commentId) => request(`/comments/${commentId}`, { method: "DELETE" }),
    update: (commentId, body) => request(`/comments/${commentId}`, { method: "PATCH", body: JSON.stringify(body) }),
};

// Recommendations
export const recommendationsApi = {
    getPersonalized: () => request("/recommendations/personalized"),
};

// Certifications (Age Limits)
export const certificationsApi = {
    getGlobal: () => request("/certifications"),
};

// Notifications
export const notificationsApi = {
    getAll: (limit = 20, offset = 0) => request(`/notifications/?limit=${limit}&offset=${offset}`),
    markAllRead: () => request("/notifications/read", { method: "POST" }),
    markOneRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
    deleteOne: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
    getUnreadCount: () => request("/notifications/unread-count"),
};

// Account Management
export const accountApi = {
    getStatus: () => request("/account/status"),
    setPassword: (newPassword) => request("/account/set-password", {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword })
    }),
    changePassword: (currentPassword, newPassword) => request("/account/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    }),
    changeEmail: (newEmail, currentPassword = null, newPassword = null) => request("/account/change-email", {
        method: "POST",
        body: JSON.stringify({ 
            new_email: newEmail, 
            current_password: currentPassword,
            new_password: newPassword 
        })
    }),
    changeUsername: (newUsername, currentPassword = null) => request("/account/change-username", {
        method: "POST",
        body: JSON.stringify({ new_username: newUsername, current_password: currentPassword })
    }),
    unlinkGoogle: () => request("/account/unlink-google", { method: "POST" }),
    updateAvatar: (avatarUrl) => request("/account/avatar", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url: avatarUrl })
    }),
};

// Custom Lists
export const customListApi = {
    create: (data) => request("/custom-lists/", { method: "POST", body: JSON.stringify(data) }),
    list: () => request("/custom-lists/"),
    getByUsername: (username) => request(`/custom-lists/user/${username}`),
    getBySlug: (username, slug) => request(`/custom-lists/${username}/${slug}`),
    getById: (id) => request(`/custom-lists/id/${id}`),
    delete: (id) => request(`/custom-lists/${id}`, { method: "DELETE" }),
    addItems: (id, items) => request(`/custom-lists/${id}/items`, { method: "POST", body: JSON.stringify(items) }),
    removeItem: (id, tmdbId) => request(`/custom-lists/${id}/items/${tmdbId}`, { method: "DELETE" }),
};

// Dynamic Metadata (Dynamic Genres, Countries, etc.)
export const metadataApi = {
    getConfig: () => request("/metadata/config"),
    getProviders: (region = "TR", type = "movie") => request(`/metadata/providers?region=${region}&type=${type}`),
};

// Support Chatbot
export const supportApi = {
    getChatResponse: (message, history = []) => request("/support/chat", {
        method: "POST",
        body: JSON.stringify({ message, history }),
    }),
};
