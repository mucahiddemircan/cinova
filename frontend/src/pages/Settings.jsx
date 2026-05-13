import { useState, useEffect, useCallback, useRef } from "react";
import { accountApi, authApi } from "../api";
import {
    ShieldAlert, Shield, User as UserIcon, Mail, Key,
    Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff, AlertCircle, Info, Camera,
    Globe, ChevronDown, Check
} from "lucide-react";
import AvatarUpload from "../components/profile/AvatarUpload";
import { useLanguage } from "../context/LanguageContext";
import LoadingDots from "../components/common/LoadingDots";
import ErrorState from "../components/common/ErrorState";

export default function Settings({ user, onUserUpdate }) {
    const { language, setLanguage, t } = useLanguage();
    const [accountStatus, setAccountStatus] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langDropdownRef = useRef(null);

    // Scoped feedback (Yönerge 6 Fix)
    const [feedbacks, setFeedbacks] = useState({
        username: { message: null, error: null },
        email: { message: null, error: null },
        password: { message: null, error: null }
    });

    const setSectionFeedback = (section, message, error) => {
        setFeedbacks(prev => ({
            ...prev,
            [section]: { message, error }
        }));
    };

    const InlineFeedback = ({ section }) => {
        const { message, error } = feedbacks[section] || {};
        if (!message && !error) return null;
        return (
            <div className="space-y-4 mb-6">
                {message && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-xl flex items-start gap-3 animate-slide-down">
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-bold leading-relaxed">{message}</p>
                    </div>
                )}
                {error && (
                    <div className="bg-brand/10 border border-brand/30 text-white p-3 rounded-xl flex items-start gap-3 animate-slide-down">
                        <AlertTriangle size={16} className="text-brand shrink-0 mt-0.5" />
                        <p className="text-xs font-bold leading-relaxed">{error}</p>
                    </div>
                )}
            </div>
        );
    };

    // Form Validasyonu
    const [fieldErrors, setFieldErrors] = useState({});

    // Username
    const [newUsername, setNewUsername] = useState("");
    const [usernamePassword, setUsernamePassword] = useState("");
    const [usernameEditing, setUsernameEditing] = useState(false);

    // Email
    const [newEmail, setNewEmail] = useState("");
    const [emailPassword, setEmailPassword] = useState(""); // Mevcut şifre
    const [emailNewPassword, setEmailNewPassword] = useState(""); // Google kullanıcıları için ilk şifre
    const [emailEditing, setEmailEditing] = useState(false);

    // Password
    const [passwordMode, setPasswordMode] = useState(null); // "set" | "change" | null
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    const [loading, setLoading] = useState(false);

    // Hesap durumunu çek
    useEffect(() => {
        if (!user) return;
        accountApi.getStatus()
            .then(setAccountStatus)
            .catch(() => { })
            .finally(() => setStatusLoading(false));
    }, [user]);

    // Handle language dropdown click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
                setIsLangOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Validasyon Fonksiyonu (Register.jsx'ten uyarlandı)
    const validateField = async (name, value) => {
        let err = "";
        if (name === "email") {
            const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!value) err = t("validation.emailRequired");
            else if (!pattern.test(value)) err = t("validation.emailInvalid");
            else if (value === user?.email) err = "";
            else {
                try {
                    const res = await authApi.checkEmail(value);
                    if (!res.available) err = t("validation.emailInUse");
                } catch (e) { }
            }
        } else if (name === "password" || name === "newPassword" || name === "emailNewPassword") {
            if (!value) err = t("validation.passwordRequired");
            else {
                const requirements = [];
                if (value.length < 8) requirements.push(t("validation.passwordMinLength"));
                if (!/[A-Z]/.test(value)) requirements.push(t("validation.passwordUppercase"));
                if (!/[a-z]/.test(value)) requirements.push(t("validation.passwordLowercase"));
                if (!/[0-9]/.test(value)) requirements.push(t("validation.passwordNumber"));
                if (requirements.length > 0) {
                    err = t("validation.passwordRequirements", { requirements: requirements.join(", ") });
                }
            }
        } else if (name === "username") {
            if (!value) err = t("validation.usernameRequired");
            else if (value.length < 3) err = t("validation.usernameMinLength");
            else if (value === user?.username) err = "";
            else {
                try {
                    const res = await authApi.checkUsername(value);
                    if (!res.available) err = t("validation.usernameInUse");
                } catch (e) { }
            }
        }
        setFieldErrors(prev => ({ ...prev, [name]: err }));
        return !err;
    };

    const clearFeedback = (section = null) => {
        if (section) {
            setSectionFeedback(section, null, null);
        } else {
            setFeedbacks({
                username: { message: null, error: null },
                email: { message: null, error: null },
                password: { message: null, error: null }
            });
        }
        setFieldErrors({});
    };

    const getRemainingDays = useCallback(() => {
        if (!accountStatus?.username_changed_at) return 0;
        const last = new Date(accountStatus.username_changed_at);
        const cooldownEnd = new Date(last.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        if (now >= cooldownEnd) return 0;
        return Math.ceil((cooldownEnd - now) / (1000 * 60 * 60 * 24));
    }, [accountStatus]);

    // --- Handlers ---

    const handleChangeUsername = async () => {
        clearFeedback("username");
        const isValid = await validateField("username", newUsername);
        if (!isValid) return;

        setLoading(true);
        try {
            const pw = accountStatus?.has_password ? usernamePassword : null;
            const res = await accountApi.changeUsername(newUsername, pw);
            setSectionFeedback("username", res.message, null);
            setUsernameEditing(false);
            setNewUsername("");
            setUsernamePassword("");
            // Refresh account status & user
            const status = await accountApi.getStatus();
            setAccountStatus(status);
            if (onUserUpdate) {
                const me = await authApi.getMe();
                onUserUpdate(me);
            }
        } catch (err) { setSectionFeedback("username", null, err.message || t("errors.usernameChange")); }
        finally { setLoading(false); }
    };

    const handleChangeEmail = async () => {
        clearFeedback("email");
        const isEmailValid = await validateField("email", newEmail);
        if (!isEmailValid) return;

        // Google-only kullanıcı şifre belirlemeli
        if (!accountStatus?.has_password) {
            const isPwValid = await validateField("emailNewPassword", emailNewPassword);
            if (!isPwValid) return;
        }

        setLoading(true);
        try {
            const currentPw = accountStatus?.has_password ? emailPassword : null;
            const firstPw = !accountStatus?.has_password ? emailNewPassword : null;

            // Backend doğrulaması ve şifre belirleme (gerekirse)
            await accountApi.changeEmail(newEmail, currentPw, firstPw);

            // Supabase üzerinden doğrulama linki gönder
            const { error: supError } = await authApi.updateEmail(newEmail);
            if (supError) throw supError;

            setSectionFeedback("email", t("settings.emailVerificationSent"), null);
            setEmailEditing(false);
            setNewEmail("");
            setEmailPassword("");
            setEmailNewPassword("");
        } catch (err) { setSectionFeedback("email", null, err.message || t("errors.emailChange")); }
        finally { setLoading(false); }
    };

    const handleSetPassword = async () => {
        clearFeedback("password");
        const isPwValid = await validateField("newPassword", newPassword);
        if (!isPwValid) return;
        if (newPassword !== confirmPassword) { setSectionFeedback("password", null, t("validation.passwordsNotMatch")); return; }

        setLoading(true);
        try {
            const res = await accountApi.setPassword(newPassword);
            setSectionFeedback("password", res.message, null);
            setPasswordMode(null);
            setNewPassword(""); setConfirmPassword("");
            const status = await accountApi.getStatus();
            setAccountStatus(status);
            // Hybrid'e yükseldiğimiz için user verisini de tazeleyelim
            if (onUserUpdate) {
                const me = await authApi.getMe();
                onUserUpdate(me);
            }
        } catch (err) { setSectionFeedback("password", null, err.message || t("errors.passwordSet")); }
        finally { setLoading(false); }
    };

    const handleChangePassword = async () => {
        clearFeedback("password");
        const isPwValid = await validateField("newPassword", newPassword);
        if (!isPwValid) return;
        if (newPassword !== confirmPassword) { setSectionFeedback("password", null, t("validation.passwordsNotMatch")); return; }

        setLoading(true);
        try {
            const res = await accountApi.changePassword(currentPassword, newPassword);
            setSectionFeedback("password", res.message, null);
            setPasswordMode(null);
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch (err) { setSectionFeedback("password", null, err.message || t("errors.passwordChange")); }
        finally { setLoading(false); }
    };


    if (!user) {
        return (
            <ErrorState 
                title={t("errors.loginRequired")}
                subtitle={t("settings.subtitle")}
                icon={ShieldAlert}
                buttonText={t("auth.loginBtn")}
                buttonLink="/login"
            />
        );
    }

    const remainingDays = getRemainingDays();
    const canChangeUsername = remainingDays === 0;

    const inputBase = "w-full bg-bg-base text-text-primary border border-bg-surface focus:border-brand rounded-lg px-4 py-3 outline-none transition-all placeholder:text-text-secondary/30";
    const inputErrorClass = "border-brand shadow-[0_0_0_1px_rgba(229,0,0,0.5)]";

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">{t("settings.title")}</h1>
                <p className="text-text-secondary text-sm">{t("settings.subtitle")}</p>
            </header>

            {/* Global Feedback kaldırıldı, inline eklenecek */}

            {statusLoading ? (
                <div className="flex justify-center py-24"><LoadingDots size="lg" className="text-white/20" /></div>
            ) : (
                <div className="space-y-8">
                    {/* ═══ HESAP BÖLÜMÜ ═══ */}
                    <section className="bg-bg-surface/30 border border-bg-surface/50 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
                        <div className="p-6 border-b border-bg-surface/30 flex items-center gap-4 bg-white/[0.02]">
                            <div className="p-2.5 bg-brand/10 rounded-xl">
                                <UserIcon className="text-brand" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{t("settings.userInfo")}</h2>
                                <p className="text-text-secondary text-xs">{t("settings.userInfoSub")}</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-8">
                            {/* Profil Fotoğrafı Yükleme Alanı */}
                            <div className="mb-8 pb-8 border-b border-white/5">
                                <AvatarUpload user={user} onUserUpdate={onUserUpdate} />
                            </div>

                            {/* Kullanıcı Adı */}
                            <div className="group">
                                <label className="block text-text-secondary text-xs font-semibold mb-3 opacity-70">{t("settings.username")}</label>
                                <InlineFeedback section="username" />
                                {!usernameEditing ? (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <input type="text" value={user.username} disabled className={`${inputBase} !bg-bg-base/30 !text-text-secondary/50 cursor-not-allowed`} />
                                            <CheckCircle2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500/50" />
                                        </div>
                                        <button
                                            onClick={() => { setUsernameEditing(true); setNewUsername(user.username); clearFeedback(); }}
                                            disabled={!canChangeUsername}
                                            className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer border border-white/10"
                                        >
                                            {t("settings.change")}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 p-4 bg-bg-base/30 rounded-2xl border border-white/5">
                                        <div>
                                            <input
                                                type="text"
                                                value={newUsername}
                                                onChange={e => { setNewUsername(e.target.value); validateField("username", e.target.value); }}
                                                className={`${inputBase} ${fieldErrors.username ? inputErrorClass : ""}`}
                                                placeholder={t("settings.newUsernameP")}
                                            />
                                            {fieldErrors.username && (
                                                <p className="text-brand text-[11px] mt-2 ml-1 flex items-center gap-1.5 font-bold">
                                                    <AlertCircle size={12} strokeWidth={3} /> {fieldErrors.username}
                                                </p>
                                            )}
                                        </div>
                                        {accountStatus?.has_password && (
                                            <input type="password" value={usernamePassword} onChange={e => setUsernamePassword(e.target.value)} className={inputBase} placeholder={t("settings.currentPasswordSecurity")} />
                                        )}
                                        <div className="flex gap-3 pt-2">
                                            <button onClick={handleChangeUsername} disabled={loading || fieldErrors.username || !newUsername || newUsername === user.username}
                                                className="bg-brand hover:bg-brand-hover disabled:bg-bg-surface-hover disabled:text-text-secondary text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer">
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : t("common.update")}
                                            </button>
                                            <button onClick={() => { setUsernameEditing(false); setNewUsername(""); setUsernamePassword(""); clearFeedback(); }}
                                                className="text-text-secondary hover:text-white px-4 py-3 text-sm font-semibold transition-colors cursor-pointer">{t("common.cancel")}</button>
                                        </div>
                                    </div>
                                )}
                                {!canChangeUsername && !usernameEditing && (
                                    <p className="text-[10px] text-text-secondary mt-2.5 ml-1 flex items-center gap-1.5 opacity-50">
                                        <Info size={10} /> {t("settings.changeUsername", { days: remainingDays })}
                                    </p>
                                )}
                            </div>

                            {/* E-posta */}
                            <div>
                                <label className="block text-text-secondary text-xs font-semibold mb-4 opacity-70">{t("settings.email")}</label>
                                <InlineFeedback section="email" />
                                {!emailEditing ? (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <input type="email" value={user.email} disabled className={`${inputBase} !bg-bg-base/30 !text-text-secondary/50 cursor-not-allowed`} />
                                            <Mail size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10" />
                                        </div>
                                        <button onClick={() => { setEmailEditing(true); setNewEmail(""); clearFeedback(); }}
                                            className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer border border-white/10">
                                            {t("settings.change")}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 p-5 bg-bg-base/30 rounded-2xl border border-white/5">
                                        {/* Google veya Hybrid ise bağlantı kopma uyarısı göster */}
                                        {accountStatus?.auth_provider !== "email" && (
                                            <div className="bg-brand/10 border border-brand/20 p-4 rounded-xl flex gap-3 mb-2">
                                                <AlertTriangle size={18} className="text-brand shrink-0" />
                                                <p className="text-[11px] text-text-primary leading-relaxed">
                                                    <span className="font-bold text-brand mr-1">{t("settings.warning")}</span>
                                                    {t("settings.googleWarning")}
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <input
                                                type="email"
                                                value={newEmail}
                                                onChange={e => { setNewEmail(e.target.value); validateField("email", e.target.value); }}
                                                className={`${inputBase} ${fieldErrors.email ? inputErrorClass : ""}`}
                                                placeholder={t("settings.newEmailP")}
                                            />
                                            {fieldErrors.email && (
                                                <p className="text-brand text-[11px] mt-2 ml-1 flex items-center gap-1.5 font-bold">
                                                    <AlertCircle size={12} strokeWidth={3} /> {fieldErrors.email}
                                                </p>
                                            )}
                                        </div>

                                        {/* Classic veya Hybrid (şifresi olanlar) için mevcut şifre sor */}
                                        {accountStatus?.has_password ? (
                                            <input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} className={inputBase} placeholder={t("settings.currentPasswordSecurity")} />
                                        ) : (
                                            /* Sadece Google-only kullanıcıları için yeni şifre belirlet */
                                            <div>
                                                <input
                                                    type="password"
                                                    value={emailNewPassword}
                                                    onChange={e => { setEmailNewPassword(e.target.value); validateField("emailNewPassword", e.target.value); }}
                                                    className={`${inputBase} ${fieldErrors.emailNewPassword ? inputErrorClass : ""}`}
                                                    placeholder={t("settings.setFirstPassword")}
                                                />
                                                {fieldErrors.emailNewPassword && (
                                                    <p className="text-brand text-[11px] mt-2 ml-1 flex items-center gap-1.5 font-bold">
                                                        <AlertCircle size={12} strokeWidth={3} /> {fieldErrors.emailNewPassword}
                                                    </p>
                                                )}
                                                <p className="text-[11px] text-text-secondary mt-2 ml-1 opacity-60">{t("settings.googleLinkWarning")}</p>
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            <button onClick={handleChangeEmail} disabled={loading || fieldErrors.email || fieldErrors.emailNewPassword || !newEmail || newEmail === user.email}
                                                className="bg-brand hover:bg-brand-hover disabled:bg-bg-surface-hover disabled:text-text-secondary text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer">
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : t("settings.sendVerification")}
                                            </button>
                                            <button onClick={() => { setEmailEditing(false); setNewEmail(""); setEmailPassword(""); setEmailNewPassword(""); clearFeedback(); }}
                                                className="text-text-secondary hover:text-white px-4 py-3 text-sm font-semibold transition-colors cursor-pointer">{t("common.cancel")}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ═══ GÜVENLİK BÖLÜMÜ ═══ */}
                    <section className="bg-bg-surface/30 border border-bg-surface/50 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
                        <div className="p-6 border-b border-bg-surface/30 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-brand/10 rounded-xl">
                                    <Shield className="text-brand" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{t("settings.security")}</h2>
                                    <p className="text-text-secondary text-xs">{t("settings.securitySub")}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-8">
                            {/* Şifre Yönetimi */}
                            <div>
                                <label className="block text-text-secondary text-xs font-semibold mb-3 opacity-70">
                                    <Key size={10} className="inline mr-1.5 -mt-0.5" /> {t("settings.passwordOps")}
                                </label>
                                <InlineFeedback section="password" />
                                {passwordMode === null ? (
                                    <button
                                        onClick={() => {
                                            if (statusLoading) return;
                                            setPasswordMode(accountStatus?.has_password ? "change" : "set");
                                            clearFeedback();
                                        }}
                                        disabled={statusLoading}
                                        className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer border border-white/10 disabled:opacity-50"
                                    >
                                        {statusLoading ? <LoadingDots size="xs" /> : (accountStatus?.has_password ? t("settings.changePassword") : t("settings.setPassword"))}
                                    </button>
                                ) : (
                                    <div className="space-y-4 max-w-md p-5 bg-bg-base/30 rounded-2xl border border-white/5">
                                        <h3 className="text-sm font-bold text-white mb-2">
                                            {passwordMode === "set" ? t("settings.newPasswordTitle") : t("settings.updatePasswordTitle")}
                                        </h3>

                                        {passwordMode === "change" && (
                                            <div className="relative">
                                                <input type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                                                    className={`${inputBase} pr-12`} placeholder={t("settings.currentPassword")} />
                                                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-secondary hover:text-white transition-colors cursor-pointer">
                                                    {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div className="relative">
                                                <input
                                                    type={showNewPw ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={e => { setNewPassword(e.target.value); validateField("newPassword", e.target.value); }}
                                                    className={`${inputBase} pr-12 ${fieldErrors.newPassword ? inputErrorClass : ""}`}
                                                    placeholder={passwordMode === "set" ? t("settings.setPassword") : t("settings.newPassword")}
                                                />
                                                <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-secondary hover:text-white transition-colors cursor-pointer">
                                                    {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {fieldErrors.newPassword && (
                                                <p className="text-brand text-[11px] mt-2 ml-1 flex items-center gap-1.5 font-bold leading-tight">
                                                    <AlertCircle size={12} strokeWidth={3} className="shrink-0" /> {fieldErrors.newPassword}
                                                </p>
                                            )}

                                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                                className={inputBase} placeholder={t("settings.confirmPassword")} />

                                            {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                                <p className="text-brand text-[11px] mt-2 ml-1 flex items-center gap-1.5 font-bold">
                                                    <AlertCircle size={12} strokeWidth={3} /> {t("validation.passwordsNotMatch")}
                                                </p>
                                            )}

                                            <div className="flex gap-3 pt-2">
                                                <button onClick={passwordMode === "set" ? handleSetPassword : handleChangePassword}
                                                    disabled={loading || fieldErrors.newPassword || !newPassword || newPassword !== confirmPassword || (passwordMode === "change" && !currentPassword)}
                                                    className="bg-brand hover:bg-brand-hover disabled:bg-bg-surface-hover disabled:text-text-secondary text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer">
                                                    {loading ? <Loader2 size={16} className="animate-spin" /> : (passwordMode === "set" ? t("settings.savePassword") : t("settings.updatePasswordBtn"))}
                                                </button>
                                                <button onClick={() => { setPasswordMode(null); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); clearFeedback(); }}
                                                    className="text-text-secondary hover:text-white px-4 py-3 text-sm font-semibold transition-colors cursor-pointer">{t("common.cancel")}</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </section>

                    {/* ═══ DİL BÖLÜMÜ ═══ */}
                    <section className="bg-bg-surface/30 border border-bg-surface/50 rounded-2xl backdrop-blur-md shadow-2xl">
                        <div className="p-6 border-b border-bg-surface/30 flex items-center justify-between bg-white/[0.02] rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-brand/10 rounded-xl">
                                    <Globe className="text-brand" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{t("settings.languageSection")}</h2>
                                    <p className="text-text-secondary text-xs">{t("settings.languageSectionSub")}</p>
                                </div>
                            </div>

                            {/* Dil Seçimi Dropdown */}
                            <div className="relative" ref={langDropdownRef}>
                                <button
                                    onClick={() => setIsLangOpen(!isLangOpen)}
                                    className="flex items-center gap-3 bg-bg-base/50 hover:bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl transition-all cursor-pointer group"
                                >
                                    <span className="text-sm font-semibold text-white">
                                        {language === "tr" ? "Türkçe" : "English"}
                                    </span>
                                    <ChevronDown size={16} className={`text-white transition-transform duration-300 ${isLangOpen ? "rotate-180" : ""}`} />
                                </button>

                                {isLangOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-down py-1.5 backdrop-blur-xl">
                                        {[
                                            { value: "en", label: "English" },
                                            { value: "tr", label: "Türkçe" },
                                        ].map((lang) => (
                                            <button
                                                key={lang.value}
                                                onClick={() => {
                                                    setLanguage(lang.value);
                                                    setIsLangOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors text-left group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-white">
                                                        {lang.label}
                                                    </span>
                                                </div>
                                                {language === lang.value && (
                                                    <Check size={16} className="text-white" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                </div>
            )}
        </div>
    );
}
