import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { authApi } from "../api";
import {
    ChevronDown,
    Info,
    AlertCircle
} from "lucide-react";

export default function CompleteProfile({ user, onComplete }) {
    const { t } = useLanguage();
    const [username, setUsername] = useState("");
    const [day, setDay] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [showInfo, setShowInfo] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const months = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    const infoRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (infoRef.current && !infoRef.current.contains(event.target)) {
                setShowInfo(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const validateField = async (name, value) => {
        let err = "";
        if (name === "username") {
            if (!value) err = "Kullanıcı adı gereklidir.";
            else if (value.length < 3) err = "Kullanıcı adı en az 3 karakter olmalıdır.";
            else {
                try {
                    const res = await authApi.checkUsername(value);
                    if (!res.available && value !== user.username) err = "Bu kullanıcı adı zaten alınmış.";
                } catch (e) { }
            }
        } else if (name === "birthDate") {
            if (!value.day || !value.month || !value.year) err = "Lütfen doğum tarihinizi girin.";
            else {
                const d = parseInt(value.day);
                const m = months.indexOf(value.month);
                const y = parseInt(value.year);
                const currentYear = new Date().getFullYear();

                const dateObj = new Date(y, m, d);
                const isInvalidDate = dateObj.getFullYear() !== y || dateObj.getMonth() !== m || dateObj.getDate() !== d;

                if (isNaN(d) || isNaN(y) || isInvalidDate) err = "Lütfen geçerli bir tarih girin.";
                else if (y < 1920 || y > currentYear) err = "Geçersiz yıl.";
            }
        }
        setFieldErrors(prev => ({ ...prev, [name]: err }));
        return !err;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const isUsernameValid = await validateField("username", username);
        const isBirthDateValid = await validateField("birthDate", { day, month, year });

        if (!isUsernameValid || !isBirthDateValid) {
            setLoading(false);
            return;
        }

        try {
            const birth_date = `${year}-${(months.indexOf(month) + 1).toString().padStart(2, "0")}-${day.padStart(2, "0")}`;
            const userData = await authApi.completeProfile({
                username,
                birth_date
            });

            onComplete(userData);
        } catch (err) {
            setError(err.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (fieldName) => `
        w-full bg-bg-base border rounded-md px-4 py-3 placeholder:text-auth-muted focus:outline-none transition-all duration-200 hover:border-auth-muted-hover
        ${fieldErrors[fieldName]
            ? "border-brand shadow-[0_0_0_1px_rgba(229,0,0,0.5)]"
            : "border-auth-muted focus:border-white focus:ring-1 focus:ring-white"}
    `;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-base/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-bg-surface p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                {/* Background Glow Effect */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/10 blur-3xl rounded-full"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand/5 blur-3xl rounded-full"></div>

                <div className="relative z-10">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl sm:text-4xl font-black text-text-primary mb-3">
                            {t("common.brand")} kullanmaya son bir adım kaldı!
                        </h2>
                        <p className="text-auth-muted">
                            Profilinizi tamamlayarak aramıza katılın.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        {/* DOĞUM TARİHİ */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 ml-1">
                                <label className="text-white text-sm font-semibold">Doğum tarihi</label>
                                <div className="relative" ref={infoRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowInfo(!showInfo)}
                                        className="w-6 h-6 rounded-full text-white hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                                    >
                                        <Info size={18} />
                                    </button>
                                    {showInfo && (
                                        <div className="absolute top-full mt-2 left-0 w-64 p-3 bg-bg-surface border border-auth-muted rounded-lg shadow-xl z-50 animate-scale-up">
                                            <p className="text-xs text-white leading-relaxed">
                                                Doğum tarihini vermen, gördüğün özellikleri ve çocukları güvende tutma amacıyla istenir. Bu bilgi profilinde herkese açık gösterilmez.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div
                                className="grid grid-cols-3 gap-3"
                                onBlur={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                        validateField("birthDate", { day, month, year });
                                    }
                                }}
                            >
                                <input
                                    type="text"
                                    maxLength="2"
                                    value={day}
                                    onChange={(e) => setDay(e.target.value.replace(/\D/g, ""))}
                                    placeholder="Gün"
                                    className={`${inputClass("birthDate")} text-text-primary`}
                                />
                                <div className="relative">
                                    <select
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        className={`${inputClass("birthDate")} appearance-none cursor-pointer pr-10 ${!month ? 'text-auth-muted' : 'text-text-primary'}`}
                                    >
                                        <option value="" disabled className="bg-bg-base text-auth-muted">Ay</option>
                                        {months.map(m => <option key={m} value={m} className="bg-bg-surface text-text-primary">{m}</option>)}
                                    </select>
                                    <ChevronDown size={12} strokeWidth={3} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-auth-muted" />
                                </div>
                                <input
                                    type="text"
                                    maxLength="4"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                                    placeholder="Yıl"
                                    className={`${inputClass("birthDate")} text-text-primary`}
                                />
                            </div>
                            {fieldErrors.birthDate && (
                                <p className="text-brand text-xs mt-2 ml-1 flex items-center gap-1.5 font-medium">
                                    <AlertCircle size={14} strokeWidth={2.5} className="shrink-0" />
                                    {fieldErrors.birthDate}
                                </p>
                            )}
                        </div>

                        {/* KULLANICI ADI */}
                        <div>
                            <label className="block text-white text-sm font-semibold mb-2 ml-1">Kullanıcı adı</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onBlur={() => validateField("username", username)}
                                className={`${inputClass("username")} text-text-primary`}
                                placeholder="Kendinize bir isim seçin"
                                required
                            />
                            {fieldErrors.username && (
                                <p className="text-brand text-xs mt-2 ml-1 flex items-center gap-1.5 font-medium">
                                    <AlertCircle size={14} strokeWidth={2.5} className="shrink-0" />
                                    {fieldErrors.username}
                                </p>
                            )}
                        </div>

                        {/* GENEL HATA */}
                        {error && (
                            <div className="bg-brand/20 border border-brand/50 text-white p-3 rounded-md text-xs text-center font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-white font-bold py-4 px-4 rounded-md transition-all active:scale-[0.98] shadow-lg shadow-brand/20 cursor-pointer flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Tamamla ve Başla"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
