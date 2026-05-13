/**
 * Yorum giriş alanı bileşeni.
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

export default function CommentInput({ onSubmit, user, placeholder, initialValue = "", onCancel, autoFocus = false }) {
    const { t } = useLanguage();
    const finalPlaceholder = placeholder || t("comments.placeholder");
    const [content, setContent] = useState(initialValue);
    const [isSpoiler, setIsSpoiler] = useState(false);
    const [isFocused, setIsFocused] = useState(autoFocus || initialValue.length > 0);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
        }
    }, [autoFocus]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (content.trim()) {
            onSubmit(content, isSpoiler);
            setContent("");
            setIsSpoiler(false);
            if (!autoFocus) setIsFocused(false);
        }
    };

    const handleCancel = () => {
        setContent("");
        setIsSpoiler(false);
        setIsFocused(false);
        if (onCancel) onCancel();
    };

    const handleFocus = () => {
        setIsFocused(true);
        // Ensure cursor is at the end even on manual focus if it's an edit
        if (initialValue && textareaRef.current) {
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
        }
    };

    if (!user) {
        return (
            <div className="flex gap-4 items-start mb-8">
                <div className="w-10 h-10 rounded-full bg-bg-surface-hover shrink-0" />
                <div className="flex-1">
                    <div className="text-sm text-text-secondary py-2 border-b border-white/10 flex items-center gap-2">
                        {t("comments.loginRequired")}
                        <Link to="/login" className="text-white font-bold hover:underline transition-all">
                            {t("nav.login")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-4 items-start mb-8 group">
            <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-lg shrink-0 border border-white/5 overflow-hidden">
                {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                    user.username[0].toUpperCase()
                )}
            </div>

            <div className="flex-1">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={handleFocus}
                    placeholder={finalPlaceholder}
                    className="w-full bg-transparent border-b border-white/10 focus:border-white transition-all py-2 text-sm outline-none resize-none min-h-[40px] appearance-none"
                    rows={isFocused ? 4 : 1}
                />

                {isFocused && (
                    <div className="flex flex-col gap-3 mt-3 animate-fade-in">
                        <div className="flex items-center gap-2 px-1">
                            <input
                                type="checkbox"
                                id="spoiler-check"
                                checked={isSpoiler}
                                onChange={(e) => setIsSpoiler(e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-transparent text-white focus:ring-0 cursor-pointer accent-white"
                            />
                            <label htmlFor="spoiler-check" className="text-[12px] font-medium text-white/60 cursor-pointer hover:text-white transition-colors">
                                {t("comments.isSpoiler")}
                            </label>
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                type="submit"
                                disabled={!content.trim()}
                                className={`px-4 py-2 text-sm font-bold rounded-full transition-all cursor-pointer ${content.trim()
                                    ? "bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/10"
                                    : "bg-white/5 text-white/20 pointer-events-none"
                                    }`}
                            >
                                {initialValue ? t("common.save") : t("comments.writeComment")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </form>
    );
}
