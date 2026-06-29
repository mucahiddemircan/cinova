import { useState, useEffect, useRef, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { authApi } from "../../api";
import {
    ChevronDown,
    Eye,
    EyeOff,
    Info,
    AlertCircle
} from "lucide-react";
import { GoogleIcon } from "../common/BrandIcons";
import LocalizedLink from "../common/LocalizedLink";

export default function Register({ onLogin }) {
    const { t } = useLanguage();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [day, setDay] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState(null);

    const months = useMemo(() => [
        t("months.0"), t("months.1"), t("months.2"), t("months.3"), t("months.4"), t("months.5"),
        t("months.6"), t("months.7"), t("months.8"), t("months.9"), t("months.10"), t("months.11")
    ], [t]);
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
        if (name === "email") {
            const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!value) err = t("auth.emailReq");
            else if (!pattern.test(value)) err = t("auth.emailInvalid");
            else {
                try {
                    const res = await authApi.checkEmail(value);
                    if (!res.available) err = t("auth.emailTaken");
                } catch (e) { }
            }
        } else if (name === "password") {
            if (!value) err = t("auth.passwordReq");
            else {
                const requirements = [];
                if (value.length < 8) requirements.push(t("auth.passwordMin"));
                if (!/[A-Z]/.test(value)) requirements.push(t("auth.passwordUpper"));
                if (!/[a-z]/.test(value)) requirements.push(t("auth.passwordLower"));
                if (!/[0-9]/.test(value)) requirements.push(t("auth.passwordNumber"));

                if (requirements.length > 0) {
                    err = t("auth.passwordCriteria", { criteria: requirements.join(", ") });
                }
            }
        } else if (name === "username") {
            if (!value) err = t("auth.usernameReq");
            else if (value.length < 3) err = t("auth.usernameMin");
            else {
                try {
                    const res = await authApi.checkUsername(value);
                    if (!res.available) err = t("auth.usernameTaken");
                } catch (e) { }
            }
        } else if (name === "birthDate") {
            if (!value.day || !value.month || !value.year) err = t("auth.birthDateReq");
            else {
                const d = parseInt(value.day);
                const m = months.indexOf(value.month);
                const y = parseInt(value.year);
                const currentYear = new Date().getFullYear();

                const dateObj = new Date(y, m, d);
                const isInvalidDate = dateObj.getFullYear() !== y || dateObj.getMonth() !== m || dateObj.getDate() !== d;

                if (isNaN(d) || isNaN(y) || isInvalidDate) err = t("auth.birthDateInvalid");
                else if (y < 1920 || y > currentYear) err = t("auth.yearInvalid");
            }
        }
        setFieldErrors(prev => ({ ...prev, [name]: err }));
        return !err;
    };

    const handleGoogleLogin = async () => {
        const { error: googleError } = await authApi.loginWithGoogle();
        if (googleError) setError(googleError.message);
    };

    const [showVerifyMessage, setShowVerifyMessage] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const isEmailValid = await validateField("email", email);
        const isPasswordValid = await validateField("password", password);
        const isUsernameValid = await validateField("username", username);
        const isBirthDateValid = await validateField("birthDate", { day, month, year });

        if (!isEmailValid || !isPasswordValid || !isUsernameValid || !isBirthDateValid) return;

        try {
            const birth_date = `${year}-${(months.indexOf(month) + 1).toString().padStart(2, "0")}-${day.padStart(2, "0")}`;
            const { data, error: authError } = await authApi.register(email, password, {
                username,
                birth_date
            });

            if (authError) {
                let msg = authError.message;
                if (msg.toLowerCase().includes("rate limit exceeded")) {
                    msg = t("auth.rateLimit");
                }
                setError(msg);
                return;
            }

            // If email verification is required
            if (data.user && !data.session) {
                setShowVerifyMessage(true);
            } else if (data.session) {
                // If verification is disabled, sign in directly
                onLogin(data.user);
            }
        } catch (err) {
            setError(t("common.error"));
        }
    };

    if (showVerifyMessage) {
        return (
            <div className="w-full px-4 sm:px-8 py-12 text-center animate-fade-in">
                <div className="bg-bg-surface p-8 rounded-2xl border border-bg-surface-hover shadow-2xl">
                    <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Info size={40} className="text-brand" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">{t("auth.checkEmail")}</h2>
                    <p className="text-text-secondary mb-8 leading-relaxed">
                        <span className="font-bold text-text-primary">{email}</span> {t("auth.verifySent")}
                    </p>
                    <LocalizedLink
                        to="/login"
                        className="inline-block bg-brand hover:bg-brand-hover text-white font-bold py-3 px-8 rounded-md transition-all"
                    >
                        {t("auth.backToLogin")}
                    </LocalizedLink>
                </div>
            </div>
        );
    }

    const inputClass = (fieldName) => `
        w-full bg-bg-base border rounded-md px-4 py-3 placeholder:text-auth-muted focus:outline-none transition-all duration-200 hover:border-auth-muted-hover
        ${fieldErrors[fieldName]
            ? "border-brand shadow-[0_0_0_1px_rgba(229,0,0,0.5)]"
            : "border-auth-muted focus:border-white focus:ring-1 focus:ring-white"}
    `;

    return (
        <div className="w-full px-4 sm:px-8 py-4 animate-fade-in">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-text-primary mb-3">{t("auth.registerTitle")}</h2>
                <p className="text-auth-muted">{t("auth.registerSub")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* EMAIL */}
                <div>
                    <label className="block text-white text-sm font-semibold mb-2 ml-1">{t("auth.email")}</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => validateField("email", email)}
                        className={`${inputClass("email")} text-text-primary`}
                        placeholder={t("auth.emailPlaceholder")}
                        required
                    />
                    {fieldErrors.email && (
                        <p className="text-brand text-xs mt-2 ml-1 flex items-center gap-1.5 font-medium">
                            <AlertCircle size={14} strokeWidth={2.5} className="shrink-0" />
                            {fieldErrors.email}
                        </p>
                    )}
                </div>

                {/* PASSWORD */}
                <div>
                    <label className="block text-white text-sm font-semibold mb-2 ml-1">{t("auth.password")}</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => validateField("password", password)}
                            className={`${inputClass("password")} text-text-primary`}
                            placeholder={t("auth.passwordPlaceholder")}
                            required
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-auth-muted hover:text-white transition-colors cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {fieldErrors.password && (
                        <p className="text-brand text-xs mt-2 ml-1 flex items-center gap-1.5 font-medium">
                            <AlertCircle size={14} strokeWidth={2.5} className="shrink-0" />
                            {fieldErrors.password}
                        </p>
                    )}
                </div>

                {/* BIRTH DATE */}
                <div>
                    <div className="flex items-center gap-2 mb-2 ml-1">
                        <label className="text-white text-sm font-semibold">{t("auth.birthDateLabel")}</label>
                        <div className="relative" ref={infoRef}>
                            <button
                                type="button"
                                onClick={() => setShowInfo(!showInfo)}
                                className="w-6 h-6 rounded-full text-white hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                                title={t("auth.birthDateLabel")}
                            >
                                <Info size={18} />
                            </button>
                            {showInfo && (
                                <div className="absolute top-full mt-2 left-0 w-64 p-3 bg-bg-surface border border-auth-muted rounded-lg shadow-xl z-50 animate-scale-up">
                                    <p className="text-xs text-white leading-relaxed">
                                        {t("auth.birthDateInfo")}
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
                            placeholder={t("auth.day")}
                            className={`${inputClass("birthDate")} text-text-primary`}
                        />
                        <div className="relative">
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className={`${inputClass("birthDate")} appearance-none cursor-pointer pr-10 ${!month ? 'text-auth-muted' : 'text-text-primary'}`}
                            >
                                <option value="" disabled className="bg-bg-base text-auth-muted">{t("auth.month")}</option>
                                {months.map(m => <option key={m} value={m} className="bg-bg-surface text-text-primary">{m}</option>)}
                            </select>
                            <ChevronDown size={12} strokeWidth={3} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-auth-muted" />
                        </div>
                        <input
                            type="text"
                            maxLength="4"
                            value={year}
                            onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                            placeholder={t("auth.year")}
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

                {/* USERNAME */}
                <div>
                    <label className="block text-white text-sm font-semibold mb-2 ml-1">{t("settings.username")}</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onBlur={() => validateField("username", username)}
                        className={`${inputClass("username")} text-text-primary`}
                        placeholder={t("auth.usernamePlaceholder")}
                        required
                    />
                    {fieldErrors.username && (
                        <p className="text-brand text-xs mt-2 ml-1 flex items-center gap-1.5 font-medium">
                            <AlertCircle size={14} strokeWidth={2.5} className="shrink-0" />
                            {fieldErrors.username}
                        </p>
                    )}
                </div>

                {/* GENERAL ERROR */}
                {error && (
                    <div className="bg-brand/20 border border-brand/50 text-white p-3 rounded-md text-xs text-center font-medium">
                        {error}
                    </div>
                )}

                {/* PRIVACY TEXT */}
                <div className="space-y-4 pt-4">
                    <p className="text-[11px] text-auth-muted text-left leading-relaxed">
                        {t("auth.termsText", {
                            terms: <LocalizedLink key="terms" to="/terms" className="text-text-primary hover:underline font-medium">{t("auth.termsLink")}</LocalizedLink>,
                            privacy: <LocalizedLink key="privacy" to="/privacy" className="text-text-primary hover:underline font-medium">{t("auth.privacyLink")}</LocalizedLink>
                        })}
                    </p>

                    <button
                        type="submit"
                        className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-4 px-4 rounded-md transition-all active:scale-[0.98] shadow-lg shadow-brand/20 cursor-pointer"
                    >
                        {t("auth.registerBtn")}
                    </button>
                </div>
            </form>

            <div className="relative flex items-center justify-center my-8">
                <div className="border-t border-auth-muted/30 w-full"></div>
                <span className="bg-bg-base px-4 text-auth-muted text-xs absolute">{t("auth.orContinueWith")}</span>
            </div>

            <button
                onClick={handleGoogleLogin}
                className="w-full bg-transparent text-white hover:bg-white/5 border border-auth-muted hover:border-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
                <GoogleIcon size={20} />
                {t("auth.registerWithGoogle")}
            </button>

            <p className="mt-8 text-center text-auth-muted text-sm">
                {t("auth.alreadyAccount")}{" "}
                <LocalizedLink to="/login" className="text-white hover:underline ml-1 font-bold cursor-pointer">
                    {t("auth.loginLink")}
                </LocalizedLink>
            </p>
        </div>
    );
}
