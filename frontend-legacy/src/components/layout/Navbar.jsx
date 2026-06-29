/**
 * Main navigation bar component.
 *
 * Desktop: Logo, category dropdowns, search area, profile menu.
 * Mobile: Hamburger menu button and MobileMenu overlay component.
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useMetadata } from "../../context/MetadataContext";
import useDebounce from "../../hooks/useDebounce";
import LocalizedLink from "../common/LocalizedLink";
import Logo from "../common/Logo";
import MobileMenu from "./MobileMenu";
import CardActions from "../content/CardActions";
import FollowButton from "../profile/FollowButton";
import { MOVIE_CATEGORIES, SERIES_CATEGORIES } from "../../constants";
import { resolveGenreNames } from "../../utils";
import { contentApi } from "../../api";
import {
    NotificationBell,
    DesktopNotificationPanel,
    MobileNotificationScreen,
} from "./NotificationPanel";
import {
    Search,
    X,
    ChevronDown,
    MoreVertical,
    Languages,
    HelpCircle,
    ArrowLeft,
    ChevronRight,
    Check,
    User,
    List,
    Settings,
    LogOut,
    LogIn,
    UserPlus
} from "lucide-react";
import PlaceholderImage from "../common/PlaceholderImage";
import Avatar from "../common/Avatar";

export default function Navbar({ user, onLogout }) {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [profileMenuView, setProfileMenuView] = useState("main"); // "main" or "language"
    const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
    const [isMobileNotifOpen, setIsMobileNotifOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 100);
    const inputRef = useRef(null);
    const searchRef = useRef(null);
    const profileMenuRef = useRef(null);
    const notifRef = useRef(null);
    const { t, language, setLanguage, getLocalizedPath } = useLanguage();
    const location = useLocation();

    const handleSearch = () => {
        if (searchTerm.trim()) {
            setShowDropdown(false);
            inputRef.current?.blur(); // Blur focus after search
            const path = "/search?q=" + encodeURIComponent(searchTerm.trim());
            navigate(getLocalizedPath(path));
        } else {
            inputRef.current?.focus();
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            if (selectedIndex >= 0 && searchResults[selectedIndex]) {
                const item = searchResults[selectedIndex];
                const path = item.type === "movie"
                    ? `/movies/${item.id}`
                    : item.type === "series"
                        ? `/series/${item.id}`
                        : item.type === "person"
                            ? `/people/${item.id}`
                            : `/${item.title}`;
                navigate(getLocalizedPath(path));
                setShowDropdown(false);
            } else {
                handleSearch();
            }
        } else if (e.key === "ArrowDown") {
            if (showDropdown && searchResults.length > 0) {
                e.preventDefault();
                setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
            }
        } else if (e.key === "ArrowUp") {
            if (showDropdown && searchResults.length > 0) {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
            }
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        }
    };

    useEffect(() => {
        setIsMobileMenuOpen(false);
        setShowDropdown(false);

        // Read 'q' parameter from URL and update local state
        const params = new URLSearchParams(location.search);
        const query = params.get("q") || "";
        setSearchTerm(query);
    }, [location.pathname, location.search]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
                setProfileMenuView("main");
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedSearchTerm.trim().length < 2) {
                setSearchResults([]);
                setSelectedIndex(-1);
                setShowDropdown(false);
                return;
            }

            setIsSearching(true);
            try {
                const data = await contentApi.search(debouncedSearchTerm, "all");
                // "all" search returns object {movies: [], series: [], people: [], profiles: [], relevant: []}
                // Let's flatten these into a single list or show the most relevant ones
                const combined = [
                    ...(data.relevant || []),
                    ...(data.movies || []),
                    ...(data.series || []),
                    ...(data.people || []),
                    ...(data.profiles || [])
                ].filter((v, i, a) => a.findIndex(t => t.id === v.id && t.type === v.type) === i); // Prevent duplicates

                setSearchResults(combined.slice(0, 10)); // Show first 10 results
                setSelectedIndex(-1);

                // Show dropdown only when input is focused. 
                // Prevents opening during URL synchronization (when not focused).
                if (document.activeElement === inputRef.current) {
                    setShowDropdown(true);
                }
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        if (debouncedSearchTerm) {
            fetchResults();
        } else {
            setSearchResults([]);
            setSelectedIndex(-1);
            setShowDropdown(false);
        }
    }, [debouncedSearchTerm]);



    const handleMenuAction = (action) => {
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
        document.body.style.removeProperty("overflow-y");
        document.body.style.removeProperty("overflow-x");
        if (action === "logout") onLogout();
    };

    const handleDesktopBellClick = () => {
        setIsNotifPanelOpen((prev) => !prev);
        setIsProfileMenuOpen(false);
        setProfileMenuView("main");
    };

    const handleMobileBellClick = () => {
        setIsMobileNotifOpen(true);
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-bg-base/90 backdrop-blur-sm border-b border-bg-surface w-full">
                <nav className="container mx-auto px-6 py-3 md:py-4 flex items-center justify-between gap-4">



                    <div className="flex-1 flex items-center gap-8">
                        <LocalizedLink to="/" className="text-brand text-xl md:text-2xl font-black tracking-wider flex items-center gap-2 hover:scale-105 transition-transform">
                            <Logo className="w-7 h-7" />
                            <span>{t("common.brand")}</span>
                        </LocalizedLink>

                        <div className="hidden lg:flex items-center space-x-6">
                            <CategoryDropdown label={t("nav.movies")} items={MOVIE_CATEGORIES} type="movie" />
                            <CategoryDropdown label={t("nav.series")} items={SERIES_CATEGORIES} type="series" />
                        </div>
                    </div>

                    <div className="hidden md:flex flex-shrink-0 w-full max-w-md relative" ref={searchRef}>
                        <div
                            className="flex items-center bg-bg-surface hover:bg-bg-surface-hover group rounded-full overflow-hidden h-11 w-full border border-transparent focus-within:border-brand focus-within:bg-bg-base/80 transition-all"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
                                onKeyDown={handleKeyDown}
                                placeholder={t("nav.searchPlaceholder")}
                                className="bg-transparent border-none outline-none text-white w-full h-full placeholder-text-secondary font-medium text-sm focus:ring-0 pl-6 pr-2 pt-0.5"
                            />
                            <div className="flex items-center h-full">
                                {searchTerm && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm("");
                                            inputRef.current?.focus();
                                        }}
                                        className="flex items-center justify-center px-2 h-full cursor-pointer text-text-secondary hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
                                        aria-label="Clear search"
                                    >
                                        <X size={20} strokeWidth={2.5} />
                                    </button>
                                )}
                                <div className="w-[1px] h-5 bg-white/20" />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="flex items-center justify-center pr-4 pl-2.5 h-full cursor-pointer text-text-secondary hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
                            >
                                <Search size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <SearchResultsDropdown
                            results={searchResults}
                            isOpen={showDropdown && (searchResults.length > 0 || isSearching)}
                            isLoading={isSearching}
                            onClose={() => setShowDropdown(false)}
                            user={user}
                            selectedIndex={selectedIndex}
                        />
                    </div>

                    <div className="flex-1 flex items-center justify-end">
                        <div className="hidden lg:flex items-center">
                            {!user && <OptionsDropdown />}
                        </div>


                        {user ? (
                            <div className="hidden lg:flex items-center gap-3 relative" ref={profileMenuRef}>
                                {/* Notification (Desktop) */}
                                <div className="relative" ref={notifRef}>
                                    <NotificationBell
                                        onClick={handleDesktopBellClick}
                                        className="w-10 h-10"
                                    />
                                    <DesktopNotificationPanel
                                        isOpen={isNotifPanelOpen}
                                        onClose={() => setIsNotifPanelOpen(false)}
                                        toggleRef={notifRef}
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(!isProfileMenuOpen);
                                        setProfileMenuView("main");
                                    }}
                                    className="transition-all cursor-pointer"
                                >
                                    <Avatar
                                        src={user?.avatar_url}
                                        alt={user?.username}
                                        size="md"
                                        type="profile"
                                    />
                                </button>

                                {isProfileMenuOpen && (
                                    <div className="absolute top-full right-0 mt-3 w-64 bg-black border border-white/20 rounded-md shadow-2xl z-[110] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {profileMenuView === "main" ? (
                                            <>
                                                <div className="px-5 py-3 border-b border-white/5 mb-1">
                                                    <p className="text-sm font-bold text-text-primary truncate">{user.username}</p>
                                                </div>

                                                <LocalizedLink to={`/${user.username}`} onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-sm text-text-primary hover:bg-white/20 transition-colors group">
                                                    <User size={18} className="text-white" />
                                                    <span className="font-medium">{t("nav.profile")}</span>
                                                </LocalizedLink>

                                                <LocalizedLink to={`/${user.username}/lists`} onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-sm text-text-primary hover:bg-white/20 transition-colors group">
                                                    <List size={18} className="text-white" />
                                                    <span className="font-medium">{t("nav.myLists")}</span>
                                                </LocalizedLink>

                                                <button
                                                    onClick={() => setProfileMenuView("language")}
                                                    className="w-full flex items-center justify-between px-5 py-2.5 text-sm text-text-primary hover:bg-white/20 transition-colors group cursor-pointer text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Languages size={18} className="text-white" />
                                                        <span className="font-medium">{t("nav.language")}: {language === "tr" ? "Türkçe" : "English"}</span>
                                                    </div>
                                                    <ChevronRight size={16} className="text-text-secondary" />
                                                </button>

                                                <LocalizedLink to="/help" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-sm text-text-primary hover:bg-white/20 transition-colors group">
                                                    <HelpCircle size={18} className="text-white" />
                                                    <span className="font-medium">{t("nav.help")}</span>
                                                </LocalizedLink>

                                                <LocalizedLink to="/settings" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-sm text-text-primary hover:bg-white/20 transition-colors group">
                                                    <Settings size={18} className="text-white" />
                                                    <span className="font-medium">{t("nav.settings")}</span>
                                                </LocalizedLink>

                                                <button onClick={() => handleMenuAction("logout")} className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-text-primary hover:bg-white/20 transition-colors group cursor-pointer text-left">
                                                    <LogOut size={18} className="text-white" />
                                                    <span className="font-medium">{t("nav.logout")}</span>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 mb-1">
                                                    <button
                                                        onClick={() => setProfileMenuView("main")}
                                                        className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                                    >
                                                        <ArrowLeft size={18} />
                                                    </button>
                                                    <span className="text-sm font-bold">{t("nav.language")}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setLanguage("tr");
                                                        setIsProfileMenuOpen(false);
                                                        setProfileMenuView("main");
                                                    }}
                                                    className={`w-full flex items-center justify-between px-5 py-2.5 text-sm transition-colors cursor-pointer ${language === "tr" ? "bg-white/10 text-white" : "text-text-primary hover:bg-white/20"}`}
                                                >
                                                    <span className="font-medium">Türkçe</span>
                                                    {language === "tr" && <Check size={16} className="text-white" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setLanguage("en");
                                                        setIsProfileMenuOpen(false);
                                                        setProfileMenuView("main");
                                                    }}
                                                    className={`w-full flex items-center justify-between px-5 py-2.5 text-sm transition-colors cursor-pointer ${language === "en" ? "bg-white/10 text-white" : "text-text-primary hover:bg-white/20"}`}
                                                >
                                                    <span className="font-medium">English</span>
                                                    {language === "en" && <Check size={16} className="text-white" />}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="hidden lg:flex items-center space-x-6">
                                <LocalizedLink to="/register" className="text-sm font-bold text-text-secondary hover:text-white transition-colors">
                                    {t("nav.register")}
                                </LocalizedLink>
                                <LocalizedLink to="/login" className="bg-brand hover:bg-brand-hover text-white px-7 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95">
                                    {t("nav.login")}
                                </LocalizedLink>
                            </div>
                        )}

                        <div className="lg:hidden flex items-center gap-3">


                            {user ? (
                                <div className="flex items-center gap-2">
                                    {/* Notification (Mobile/Tablet) */}
                                    <NotificationBell
                                        onClick={handleMobileBellClick}
                                        className="w-9 h-9"
                                    />
                                    <LocalizedLink to={`/${user.username}`}>
                                        <Avatar
                                            src={user?.avatar_url}
                                            alt={user?.username}
                                            size="sm"
                                            type="profile"
                                        />
                                    </LocalizedLink>
                                </div>
                            ) : (
                                <LocalizedLink to="/login" className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95">
                                    {t("nav.login")}
                                </LocalizedLink>
                            )}

                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="flex flex-col items-center justify-center gap-1.5 w-10 h-10 text-text-secondary hover:text-white transition-all cursor-pointer"
                                aria-label={t("nav.menuOpen")}
                            >
                                <div className="w-5 h-0.5 bg-current transition-all"></div>
                                <div className="w-5 h-0.5 bg-current transition-all"></div>
                                <div className="w-5 h-0.5 bg-current transition-all"></div>
                            </button>
                        </div>
                    </div>
                </nav>
            </header>

            <MobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                user={user}
                onLogout={onLogout}
            />

            {/* Mobile/Tablet notification full screen */}
            {user && (
                <MobileNotificationScreen
                    isOpen={isMobileNotifOpen}
                    onClose={() => setIsMobileNotifOpen(false)}
                />
            )}
        </>
    );
}

/**
 * Desktop clickable dropdown menu component.
 */
function CategoryDropdown({ label, items, type }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { t } = useLanguage();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative py-2" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`text-sm font-bold transition-colors cursor-pointer flex items-center gap-1 ${isOpen ? 'text-white' : 'text-text-secondary hover:text-white'}`}
            >
                {label}
                <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-black border border-white/20 rounded-md shadow-2xl z-[100] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {items.map(cat => (
                        <LocalizedLink
                            key={cat.path}
                            to={cat.path}
                            onClick={() => setIsOpen(false)}
                            className="block px-5 py-2.5 text-sm text-text-primary hover:bg-white/20 transition-colors"
                        >
                            {t(`${type === 'movie' ? 'movieCategories' : 'seriesCategories'}.${cat.key}`)}
                        </LocalizedLink>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * YouTube-style options menu (Language and Help).
 */
function OptionsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState("main"); // "main" or "language"
    const dropdownRef = useRef(null);
    const { t, language, setLanguage } = useLanguage();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            setView("main"); // Return to main menu when closed
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative mr-2 md:mr-4 flex items-center" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-all cursor-pointer hover:bg-white/20 ${isOpen ? 'text-white bg-white/10' : 'text-text-secondary hover:text-white'}`}
                title="Seçenekler"
            >
                <MoreVertical size={22} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-black border border-white/20 rounded-md shadow-2xl z-[120] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {view === "main" ? (
                        <>
                            <button
                                onClick={() => setView("language")}
                                className="w-full flex items-center justify-between px-4 py-3 text-sm text-text-primary hover:bg-white/20 transition-colors group cursor-pointer text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <Languages size={20} className="text-white" />
                                    <span className="font-medium">{t("nav.language")}: {language === "tr" ? "Türkçe" : "English"}</span>
                                </div>
                                <ChevronRight size={18} className="text-text-secondary" />
                            </button>
                            <LocalizedLink
                                to="/help"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-white/20 transition-colors group"
                            >
                                <HelpCircle size={20} className="text-white" />
                                <span className="font-medium">{t("nav.help")}</span>
                            </LocalizedLink>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 mb-1">
                                <button
                                    onClick={() => setView("main")}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <span className="text-sm font-bold">{t("nav.language")}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setLanguage("tr");
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${language === "tr" ? "bg-white/10 text-white" : "text-text-primary hover:bg-white/20"}`}
                            >
                                <span className="font-medium">Türkçe</span>
                                {language === "tr" && <Check size={16} className="text-white" />}
                            </button>
                            <button
                                onClick={() => {
                                    setLanguage("en");
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${language === "en" ? "bg-white/10 text-white" : "text-text-primary hover:bg-white/20"}`}
                            >
                                <span className="font-medium">English</span>
                                {language === "en" && <Check size={16} className="text-white" />}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Quick search results dropdown component.
 */
function SearchResultsDropdown({ results, isOpen, isLoading, onClose, user, selectedIndex }) {
    const { t } = useLanguage();
    const { getGenreName } = useMetadata();
    const selectedRef = useRef(null);

    useEffect(() => {
        if (selectedIndex >= 0 && selectedRef.current) {
            selectedRef.current.scrollIntoView({
                behavior: "auto",
                block: "nearest"
            });
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-white/20 rounded-md shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-[450px] overflow-y-auto py-2 custom-scrollbar">
                {isLoading && results.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                        <div className="inline-block w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin"></div>
                    </div>
                ) : results.length > 0 ? (
                    <>
                        {results.map((item, index) => {
                            const isPerson = ["person", "profile"].includes(item.type);
                            const path = item.type === "movie"
                                ? `/movies/${item.id}`
                                : item.type === "series"
                                    ? `/series/${item.id}`
                                    : item.type === "person"
                                        ? `/people/${item.id}`
                                        : `/${item.title}`;

                            const typeLabels = {
                                movie: t("search.typeMovie"),
                                series: t("search.typeSeries"),
                                person: item.role || t("search.typePerson"),
                                profile: t("search.typeProfile")
                            };

                            return (
                                <div
                                    key={`${item.type}-${item.id}`}
                                    ref={index === selectedIndex ? selectedRef : null}
                                    className={`relative group/item flex items-center ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/20'}`}
                                >
                                    <LocalizedLink
                                        to={path}
                                        onClick={onClose}
                                        className="flex-grow flex items-center gap-3 px-4 py-2.5 min-w-0"
                                    >
                                        <div className="flex-shrink-0">
                                            {isPerson ? (
                                                <Avatar
                                                    src={item.poster_path}
                                                    alt={item.title}
                                                    size="md"
                                                    type={item.type}
                                                    showBorder={false}
                                                />
                                            ) : (
                                                <div className="w-9 h-13 rounded bg-bg-surface-hover border border-white/5 overflow-hidden flex items-center justify-center">
                                                    {item.poster_path ? (
                                                        <img
                                                            src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <PlaceholderImage type={item.type} iconSize={18} />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white truncate hover:underline decoration-white">
                                                    {item.title}
                                                </p>
                                                <span className="text-[10px] font-medium text-white/40 whitespace-nowrap">
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
                                    </LocalizedLink>

                                    <div className="flex-shrink-0 absolute right-4 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 flex items-center gap-2">
                                        {(item.type === "movie" || item.type === "series") ? (
                                            <CardActions
                                                movie={item}
                                                user={user}
                                                variant="list"
                                            />
                                        ) : (
                                            <>
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
                                                <CardActions
                                                    movie={item}
                                                    user={user}
                                                    variant="list"
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                ) : (
                    <div className="px-5 py-8 text-center text-sm text-text-secondary">
                        {t("search.noResults")}
                    </div>
                )}
            </div>
        </div>
    );
}
