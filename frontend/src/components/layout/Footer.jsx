import { useLanguage } from "../../context/LanguageContext";
import LocalizedLink from "../common/LocalizedLink";

export default function Footer({ user }) {
    const { t } = useLanguage();
    return (
        <footer className="mt-12 py-12 border-t border-white/10 text-text-secondary text-sm">
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-y-10 gap-x-4 lg:gap-12 mb-12">
                {/* Logo & Slogan */}
                <div className="col-span-3 lg:col-span-1">
                    <LocalizedLink to="/" className="text-brand text-2xl font-black tracking-wider uppercase mb-4 inline-block hover:scale-105 transition-transform">
                        {t("common.brand")}
                    </LocalizedLink>
                    <p className="text-text-secondary leading-relaxed">
                        {t("footer.tagline")}
                    </p>
                </div>

                {/* Platform */}
                <div>
                    <h3 className="text-white font-bold mb-4 tracking-wider text-xs">{t("footer.platform")}</h3>
                    <ul className="space-y-3">
                        <li><LocalizedLink to="/movies/popular" className="hover:text-white hover:underline transition-colors">{t("footer.popularMovies")}</LocalizedLink></li>
                        <li><LocalizedLink to="/series/popular" className="hover:text-white hover:underline transition-colors">{t("footer.popularSeries")}</LocalizedLink></li>
                        <li><LocalizedLink to={user ? `/${user.username}/lists` : "/login"} className="hover:text-white hover:underline transition-colors">{t("footer.myLists")}</LocalizedLink></li>
                    </ul>
                </div>

                {/* Destek */}
                <div>
                    <h3 className="text-white font-bold mb-4 tracking-wider text-xs">{t("footer.support")}</h3>
                    <ul className="space-y-3">
                        <li><LocalizedLink to="/about" className="hover:text-white hover:underline transition-colors">{t("footer.about")}</LocalizedLink></li>
                        <li><LocalizedLink to="/help" className="hover:text-white hover:underline transition-colors">{t("footer.help")}</LocalizedLink></li>
                        <li><LocalizedLink to="/contact" className="hover:text-white hover:underline transition-colors">{t("footer.contact")}</LocalizedLink></li>
                    </ul>
                </div>

                {/* Yasal */}
                <div>
                    <h3 className="text-white font-bold mb-4 tracking-wider text-xs">{t("footer.legal")}</h3>
                    <ul className="space-y-3">
                        <li><LocalizedLink to="/terms" className="hover:text-white hover:underline transition-colors">{t("footer.terms")}</LocalizedLink></li>
                        <li><LocalizedLink to="/privacy" className="hover:text-white hover:underline transition-colors">{t("footer.privacy")}</LocalizedLink></li>
                        <li><LocalizedLink to="/privacy" className="hover:text-white hover:underline transition-colors">{t("footer.cookies")}</LocalizedLink></li>
                    </ul>
                </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col lg:flex-row justify-between items-center gap-4">
                <p>© {new Date().getFullYear()} {t("common.brand")}. {t("footer.copyright")}</p>
            </div>
        </footer>
    );
}
