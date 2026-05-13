import { useLanguage } from "../../context/LanguageContext";

export default function PrivacyPage() {
    const { t } = useLanguage();
    const sections = t("staticPages.privacy.sections") || [];

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-black mb-8 border-b border-bg-surface-hover pb-4">{t("staticPages.privacy.title")}</h1>
            <p className="text-text-secondary mb-12 text-lg leading-relaxed">{t("staticPages.privacy.intro")}</p>

            <div className="space-y-12 text-text-secondary leading-relaxed">
                {Array.isArray(sections) && sections.map((section, idx) => (
                    <section key={idx} className="bg-bg-surface/30 p-8 rounded-2xl border border-bg-surface-hover/50 hover:border-brand/30 transition-colors">
                        <h2 className="text-xl text-white font-bold mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-sm font-black">{idx + 1}</span>
                            {section.title}
                        </h2>
                        <p>{section.content}</p>
                    </section>
                ))}
            </div>
        </div>
    );
}
