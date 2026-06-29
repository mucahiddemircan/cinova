import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthModal from "../auth/AuthModal";
import { useNotifications } from "../../context/NotificationContext";
import { useLanguage } from "../../context/LanguageContext";
import LocalizedLink from "../common/LocalizedLink";
import { Home, Search, Bookmark, Bell } from "lucide-react";

export default function BottomNavigation({ user }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // useNotifications only runs if user exists, otherwise default values
    let unreadCount = 0;
    try {
        const notifCtx = useNotifications();
        unreadCount = notifCtx.unreadCount;
    } catch {
        // If NotificationProvider doesn't exist (no user), pass silently
    }

    const navItems = [
        {
            label: t("bottomNav.home"),
            path: "/",
            icon: <Home size={24} strokeWidth={2} />
        },
        {
            label: t("bottomNav.search"),
            path: "/search",
            icon: <Search size={24} strokeWidth={2} />
        },
        {
            label: t("bottomNav.myLists"),
            path: user ? `/${user.username}/lists` : "/login",
            icon: <Bookmark size={24} strokeWidth={2} />
        }
    ];

    const handleClick = (e, path) => {
        if (path === "/login" && !user) {
            e.preventDefault();
            setIsAuthModalOpen(true);
        }
    };

    // Check current path by removing locale prefix
    const normalizedPathname = location.pathname.startsWith('/tr') 
        ? location.pathname.replace(/^\/tr/, '') || '/' 
        : location.pathname;

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-bg-base/95 backdrop-blur-md border-t border-bg-surface md:hidden flex items-center justify-around px-2 py-1 safe-area-bottom">
                {navItems.map((item) => {
                    const isActive = normalizedPathname === item.path;
                    return (
                        <LocalizedLink
                            key={item.path}
                            to={item.path}
                            onClick={(e) => handleClick(e, item.path)}
                            className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${isActive ? "text-brand" : "text-text-secondary hover:text-white"
                                }`}
                        >
                            <div className={`${isActive ? "scale-110" : ""} transition-transform`}>
                                {item.icon}
                            </div>
                            <span className="text-[10px] font-bold tracking-wider">{item.label}</span>
                        </LocalizedLink>
                    );
                })}
            </nav>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
        </>
    );
}
