import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { authApi } from "../../api";
import { Eye, EyeOff } from "lucide-react";
import { GoogleIcon } from "../common/BrandIcons";
import LocalizedLink from "../common/LocalizedLink";

export default function Login({ onLogin }) {
    const { t } = useLanguage();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        const { data, error: authError } = await authApi.login(email, password);

        if (authError) {
            let msg = authError.message;

            if (msg === "Invalid login credentials") {
                msg = t("auth.invalidCredentials");
            } else if (msg === "Email not confirmed") {
                msg = (
                    <span>
                        {t("auth.emailNotConfirmed")}{" "}
                        <button
                            onClick={() => handleResendConfirmation(email)}
                            className="underline font-bold cursor-pointer hover:text-white transition-colors"
                        >
                            {t("auth.resendBtn")}
                        </button>
                    </span>
                );
            }
            setError(msg);
        } else {
            if (data.user) {
                onLogin(data.user);
            }
        }
    };

    const handleResendConfirmation = async (emailToResend) => {
        const { error: resendError } = await authApi.resendConfirmation(emailToResend);
        if (resendError) {
            let msg = resendError.message;
            if (msg.toLowerCase().includes("rate limit exceeded")) {
                msg = t("auth.rateLimit");
            }
            setError(msg);
        } else {
            setSuccessMessage(t("auth.resendEmail"));
            setError(null);
        }
    };

    const handleGoogleLogin = async () => {
        const { error: googleError } = await authApi.loginWithGoogle();
        if (googleError) setError(googleError.message);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError(t("auth.forgotPasswordReq"));
            return;
        }
        const { error: resetError } = await authApi.resetPassword(email);
        if (resetError) {
            setError(resetError.message);
        } else {
            setSuccessMessage(t("auth.resetPasswordSent"));
        }
    };

    return (
        <div className="w-full px-4 sm:px-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-text-primary mb-2">{t("auth.loginTitle")}</h2>
                <p className="text-text-secondary">{t("auth.loginSub")}</p>
            </div>

            {error && (
                <div className="bg-brand/20 border border-brand/50 text-white p-3 rounded mb-6 text-sm text-center font-medium">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-500 p-3 rounded mb-6 text-sm text-center">
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                    <label className="block text-white text-sm font-medium mb-2">{t("auth.email")}</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-bg-base text-text-primary border border-auth-muted placeholder:text-auth-muted rounded-md px-4 py-3 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all hover:border-auth-muted-hover"
                        placeholder={t("auth.emailPlaceholder")}
                        required
                    />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-white text-sm font-medium">{t("auth.password")}</label>
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-xs text-white hover:underline cursor-pointer"
                        >
                            {t("auth.forgotPassword")}
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-bg-base text-text-primary border border-auth-muted placeholder:text-auth-muted rounded-md px-4 py-3 pr-12 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all hover:border-auth-muted-hover"
                            placeholder={t("auth.passwordPlaceholder")}
                            required
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-auth-muted hover:text-white transition-colors cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                        >
                            {showPassword ? (
                                <EyeOff size={20} strokeWidth={2} />
                            ) : (
                                <Eye size={20} strokeWidth={2} />
                            )}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 px-4 rounded-md transition-colors mt-2 cursor-pointer"
                >
                    {t("auth.loginBtn")}
                </button>
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
                {t("auth.loginWithGoogle")}
            </button>

            <p className="mt-8 text-center text-auth-muted text-sm">
                {t("auth.noAccount")}{" "}
                <LocalizedLink to="/register" className="text-white hover:underline ml-1 font-medium cursor-pointer">
                    {t("auth.registerLink")}
                </LocalizedLink>
            </p>
        </div>
    );
}
