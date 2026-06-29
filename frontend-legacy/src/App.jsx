import { useState, useEffect, useRef, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { authApi, contentApi, setAccessToken } from "./api";
import { supabase } from "./utils/supabaseClient";
import { BRAND_NAME } from "./constants";
import Logo from "./components/common/Logo";

import Navbar from "./components/layout/Navbar";
import { CertificationProvider } from "./context/CertificationContext";
import { LibraryProvider } from "./context/LibraryContext";
import { NotificationProvider } from "./context/NotificationContext";
import { UIProvider } from "./context/UIContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { MetadataProvider } from "./context/MetadataContext";
import ScrollToTop from "./components/common/ScrollToTop";
import RobotsManager from "./components/common/RobotsManager";
import LocalizedLink from "./components/common/LocalizedLink";

import Footer from "./components/layout/Footer";
import BottomStickyCTA from "./components/layout/BottomStickyCTA";
import BottomNavigation from "./components/layout/BottomNavigation";
import HomeView from "./pages/HomeView";
import MovieDetails from "./pages/MovieDetails";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import Profile from "./pages/Profile";
import CategoryView from "./pages/CategoryView";
import SearchView from "./pages/SearchView";
import PersonDetails from "./pages/PersonDetails";
import MyLists from "./pages/MyLists";
import ListView from "./pages/ListView";
import CastView from "./pages/CastView";
import WatchView from "./pages/WatchView";
import CustomListView from "./pages/CustomListView";
import Settings from "./pages/Settings";
import FollowsView from "./pages/FollowsView";
import CommentsView from "./pages/CommentsView";
import SeasonView from "./pages/SeasonView";
import CompleteProfile from "./pages/CompleteProfile";
import MixedListView from "./pages/MixedListView";
import ProfileLayout from "./components/profile/ProfileLayout";

import AboutPage from "./pages/static/AboutPage";
import HelpPage from "./pages/static/HelpPage";
import TermsPage from "./pages/static/TermsPage";
import PrivacyPage from "./pages/static/PrivacyPage";
import ContactPage from "./pages/static/ContactPage";
import NotFound from "./pages/NotFound";

/**
 * Language-based redirection manager.
 * Redirects those who are in the root directory (without prefix) and prefer Turkish to /tr.
 */
function LanguageRedirectHandler() {
    const { language } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect if language is Turkish and URL does not start with /tr
        // We only perform this check on root paths without prefix
        if (language === 'tr' && !location.pathname.startsWith('/tr')) {
            const newPath = `/tr${location.pathname === '/' ? '' : location.pathname}${location.search}`;
            navigate(newPath, { replace: true, state: location.state });
        }
    }, [language, location.pathname, navigate]);

    return null;
}

/**
 * Application Routes.
 * The same structure works under both root and /tr/.
 */
function AppRoutes({ user, contents, people, homeDataLoading, handleLogin, setUser }) {
    const location = useLocation();

    return (
        <Routes>
            <Route index element={<HomeView contents={contents} people={people} loading={homeDataLoading} user={user} />} />

            {/* Auth & System Routes */}
            <Route path="login" element={<Login onLogin={handleLogin} />} />
            <Route path="register" element={<Register onLogin={handleLogin} />} />
            <Route path="settings" element={<Settings user={user} onUserUpdate={(u) => setUser(u)} />} />
            <Route path="search" element={<SearchView user={user} />} />
            <Route path="following" element={user ? <Navigate to={`/${user.username}/following`} replace /> : <Navigate to="login" replace />} />

            {/* Redirects for base paths */}
            <Route path="movies" element={<Navigate to="popular" replace />} />
            <Route path="series" element={<Navigate to="popular" replace />} />
            <Route path="people" element={<Navigate to="popular" replace />} />

            {/* Category Routes */}
            <Route path="movies/popular" element={<CategoryView user={user} />} />
            <Route path="movies/now-playing" element={<CategoryView user={user} />} />
            <Route path="movies/upcoming" element={<CategoryView user={user} />} />
            <Route path="movies/top-rated" element={<CategoryView user={user} />} />
            <Route path="movies/trending" element={<CategoryView user={user} />} />
            <Route path="movies/recommendations" element={<CategoryView user={user} />} />

            <Route path="series/popular" element={<CategoryView user={user} />} />
            <Route path="series/on-the-air" element={<CategoryView user={user} />} />
            <Route path="series/top-rated" element={<CategoryView user={user} />} />
            <Route path="series/trending" element={<CategoryView user={user} />} />
            <Route path="series/recommendations" element={<CategoryView user={user} />} />

            <Route path="people/popular" element={<CategoryView user={user} />} />

            {/* Detail Routes */}
            <Route path="movies/:id" element={<MovieDetails key={location.pathname} user={user} />} />
            <Route path="series/:id" element={<MovieDetails key={location.pathname} user={user} />} />
            <Route path="people/:id" element={<PersonDetails key={location.pathname} />} />

            <Route path="movies/:id/cast" element={<CastView key={location.pathname} />} />
            <Route path="series/:id/cast" element={<CastView key={location.pathname} />} />

            <Route path="movies/:id/watch" element={<WatchView key={location.pathname} />} />
            <Route path="series/:id/watch" element={<WatchView key={location.pathname} />} />

            <Route path="movies/:id/comments" element={<CommentsView key={location.pathname} user={user} />} />
            <Route path="series/:id/comments" element={<CommentsView key={location.pathname} user={user} />} />

            <Route path="series/:id/seasons" element={<SeasonView key={location.pathname} />} />
            <Route path="series/:id/seasons/:seasonNumber" element={<SeasonView key={location.pathname} />} />

            {/* Static Pages */}
            <Route path="about" element={<AboutPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="contact" element={<ContactPage />} />

            {/* User Profile & Lists (Nested) */}
            <Route path=":username" element={<ProfileLayout user={user} />}>
                <Route index element={<Profile key={location.pathname} user={user} />} />
                <Route path="likes" element={<MixedListView user={user} status="likes" />} />
                <Route path="dislikes" element={<MixedListView user={user} status="dislikes" />} />
                <Route path="watchlist" element={<MixedListView user={user} status="watchlist" />} />
                <Route path="watched" element={<MixedListView user={user} status="watched" />} />
                <Route path="lists" element={<MyLists user={user} />} />
            </Route>

            {/* Specific views (List/Grid) - Outside ProfileLayout */}
            <Route path=":username/:status/movies" element={<ListView key={location.pathname} user={user} type="movie" />} />
            <Route path=":username/:status/series" element={<ListView key={location.pathname} user={user} type="series" />} />
            <Route path=":username/lists/:slug" element={<CustomListView user={user} />} />

            {/* Follows (following, followers) */}
            <Route path=":username/:type" element={<FollowsView key={location.pathname} user={user} />} />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default function App() {
    const [user, setUser] = useState(null);
    const [contents, setContents] = useState([]);
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [homeDataLoading, setHomeDataLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const currentUserRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        async function initializeAuth() {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user && isMounted) {
                    setAccessToken(session.access_token);
                    currentUserRef.current = session.user.id;
                    try {
                        const userData = await authApi.getMe();
                        if (isMounted) setUser(userData);
                    } catch (err) {
                        console.error("Kullanıcı verisi alınamadı:", err);
                        if (isMounted) setUser(null);
                    }
                }
            } catch (err) {
                console.error("Oturum kontrolü hatası:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setAccessToken(session.access_token);
                if (session.user.id !== currentUserRef.current) {
                    currentUserRef.current = session.user.id;
                    try {
                        const userData = await authApi.getMe();
                        if (isMounted) setUser(userData);
                    } catch (err) {
                        console.error("Kullanıcı verisi alınamadı:", err);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setAccessToken(null);
                currentUserRef.current = null;
                if (isMounted) setUser(null);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        contentApi
            .getHomeData()
            .then((data) => {
                setContents([...data.movies, ...data.series]);
                setPeople(data.people);
            })
            .catch((err) => console.error("Veri çekme hatası:", err))
            .finally(() => setHomeDataLoading(false));
    }, []);

    const handleLogin = async (supabaseUser) => {
        setLoading(true);
        try {
            const userData = await authApi.getMe();
            setUser(userData);
            navigate("/");
        } catch (err) {
            console.error("Giriş sonrası profil çekme hatası:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authApi.logout();
        setUser(null);
        navigate("/");
    };

    useEffect(() => {
        const normalizedPath = location.pathname.startsWith('/tr')
            ? location.pathname.replace(/^\/tr/, '') || '/'
            : location.pathname;

        if (user && (normalizedPath === "/login" || normalizedPath === "/register")) {
            window.dispatchEvent(new CustomEvent("show-toast", { detail: "Zaten oturum açtınız" }));
            navigate("/", { replace: true });
        }
    }, [user, location.pathname, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-base flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <Logo className="w-16 h-16 text-brand animate-pulse" />
                    <div className="text-brand text-3xl font-black tracking-wider animate-pulse">
                        {BRAND_NAME}
                    </div>
                    <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce"></div>
                    </div>
                </div>
            </div>
        );
    }

    const normalizedPath = location.pathname.startsWith('/tr')
        ? location.pathname.replace(/^\/tr/, '') || '/'
        : location.pathname;
    const isAuthPage = (normalizedPath === "/login" || normalizedPath === "/register") && !user;

    const commonProps = { user, contents, people, homeDataLoading, handleLogin, setUser, handleLogout };

    return (
        <LanguageProvider>
            <ScrollToTop />
            <RobotsManager />
            <LanguageRedirectHandler />
            {isAuthPage ? (
                <div className="min-h-screen flex flex-col bg-bg-base relative">
                    <header className="w-full z-50 p-6 md:px-12 flex justify-between items-center mb-8">
                        <LocalizedLink
                            to="/"
                            className="text-brand text-2xl font-black tracking-wider flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                            <Logo className="w-8 h-8" />
                            <span>{BRAND_NAME}</span>
                        </LocalizedLink>
                    </header>
                    <main className="flex-grow flex items-center justify-center px-4 w-full mb-12">
                        <div className="w-full max-w-lg lg:max-w-xl">
                            <Routes>
                                <Route path="/tr/*" element={<AppRoutes {...commonProps} />} />
                                <Route path="/*" element={<AppRoutes {...commonProps} />} />
                            </Routes>
                        </div>
                    </main>
                    <div className="mt-auto w-full text-center">
                        <div className="container mx-auto px-4">
                            <Footer user={user} />
                        </div>
                    </div>
                </div>
            ) : (
                <UIProvider user={user}>
                    <CertificationProvider>
                        <MetadataProvider>
                            <LibraryProvider user={user}>
                                <NotificationProvider user={user}>
                                    <div className={`min-h-screen flex flex-col ${!user ? "md:pb-28" : ""} pb-20 md:pb-0 transition-all pt-16 md:pt-20`}>
                                        <Navbar user={user} onLogout={handleLogout} />
                                        <div className="flex-grow container mx-auto px-6 pt-3 pb-8">
                                            <main className="flex-1 min-w-0 flex flex-col min-h-full">
                                                <div className="flex-grow">
                                                    <Routes>
                                                        <Route path="/tr/*" element={<AppRoutes {...commonProps} />} />
                                                        <Route path="/*" element={<AppRoutes {...commonProps} />} />
                                                    </Routes>
                                                </div>
                                                <Footer user={user} />
                                            </main>
                                            {!user && <BottomStickyCTA />}
                                            <BottomNavigation user={user} />
                                        </div>
                                    </div>
                                </NotificationProvider>
                            </LibraryProvider>
                        </MetadataProvider>
                    </CertificationProvider>
                </UIProvider>
            )}
            {user && !user.is_complete && (
                <CompleteProfile
                    user={user}
                    onComplete={(updatedUser) => setUser(updatedUser)}
                />
            )}
        </LanguageProvider>
    );
}
