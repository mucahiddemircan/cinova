
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageContext";

const UIContext = createContext(null);

/**
 * Uygulama genelinde arayüz (UI) bildirimlerini ve 
 * oturum kontrolü gibi global işlemleri yöneten context.
 */
export function UIProvider({ children, user }) {
    const [toasts, setToasts] = useState([]);
    const navigate = useNavigate();
    const { t } = useLanguage();

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((payload) => {
        const id = Date.now() + Math.random();
        const data = typeof payload === 'string' ? { message: payload } : payload;

        setToasts(prev => [{ id, ...data }, ...prev]);

        const duration = data.action ? 5000 : 3000;
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, [removeToast]);

    // Global "show-toast" olayını dinle (ESKİ bileşenler için uyumluluk)
    useEffect(() => {
        const handleEvent = (e) => showToast(e.detail);
        window.addEventListener("show-toast", handleEvent);
        return () => window.removeEventListener("show-toast", handleEvent);
    }, [showToast]);

    const requireAuth = useCallback(() => {
        if (!user) {
            showToast({
                message: t("toast.requireAuth"),
                action: {
                    label: t("toast.loginAction"),
                    onClick: () => navigate("/login")
                }
            });
            return false;
        }
        return true;
    }, [user, navigate, showToast]);

    return (
        <UIContext.Provider value={{ toasts, showToast, requireAuth, removeToast }}>
            {children}

            {/* Global Toasts Container */}
            <div className="fixed bottom-18 md:bottom-5 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center pointer-events-none px-6">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className="w-auto max-w-max bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-[12px] font-bold shadow-2xl border border-white/5 flex items-center justify-between gap-6 pointer-events-auto animate-in fade-in slide-in-from-bottom-8 duration-500 transition-all"
                    >
                        <span className="whitespace-nowrap">{t.message}</span>
                        {t.action && (
                            <button
                                onClick={() => {
                                    t.action.onClick();
                                    removeToast(t.id);
                                }}
                                className="bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap shadow-sm"
                            >
                                {t.action.label}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </UIContext.Provider>
    );
}

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within UIProvider");
    return context;
};
