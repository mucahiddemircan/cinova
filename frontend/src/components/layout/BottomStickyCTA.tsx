"use client";

import { useLanguage } from "@/providers/language-provider";
import LocalizedLink from "../common/LocalizedLink";

export default function BottomStickyCTA() {
  const { t } = useLanguage();

  return (
    <aside
      className="fixed bottom-0 left-2 right-2 z-50 bg-bg-base/95 backdrop-blur-md border border-brand/50 border-b-0 shadow-[0_-5px_25px_rgba(0,0,0,0.5)] p-3 sm:p-4 hidden md:block rounded-t-2xl"
      aria-label="Kayıt Daveti"
    >
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between">
        <div className="text-white mb-4 sm:mb-0 text-center sm:text-left">
          <h4 className="font-bold text-lg mb-0.5 text-text-primary">
            {t("home.ctaTitle")}
          </h4>
          <p className="text-xs sm:text-sm text-text-secondary max-w-4xl opacity-80">
            {t("home.ctaText")}
          </p>
        </div>
        <LocalizedLink
          href="/register"
          className="inline-block text-sm bg-brand hover:bg-brand-hover text-white px-6 py-2 rounded-full font-bold transition-transform transform hover:scale-105 cursor-pointer whitespace-nowrap shadow-[0_0_15px_rgba(229,9,20,0.4)]"
        >
          {t("home.ctaButton")}
        </LocalizedLink>
      </div>
    </aside>
  );
}
