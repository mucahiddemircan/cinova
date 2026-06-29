import React from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function AboutPage() {
    const { t } = useLanguage();
    
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-black mb-8 border-b border-bg-surface-hover pb-4">{t("staticPages.about.title")}</h1>
            
            <div className="space-y-6 text-text-secondary leading-relaxed text-lg">
                <p>
                    <span className="text-white font-bold">{t("common.brand")}</span>, {t("staticPages.about.description")}
                </p>
                
                <p>
                    {t("staticPages.about.description2")}
                </p>

                <h2 className="text-xl text-white font-bold mt-10 mb-4">{t("staticPages.about.visionTitle")}</h2>
                <p>
                    {t("staticPages.about.visionDescription")}
                </p>

                <h2 className="text-xl text-white font-bold mt-10 mb-4">{t("staticPages.about.whyTitle")}</h2>
                <ul className="list-disc list-inside space-y-2">
                    {t("staticPages.about.whyList").map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
