"use client";

import { Mail, MapPin } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-black mb-8 border-b border-bg-surface-hover pb-4">
        {t("staticPages.contact.title")}
      </h1>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl text-white font-bold mb-4">
            {t("staticPages.contact.subtitle")}
          </h2>
          <p className="text-text-secondary mb-8 leading-relaxed">
            {t("staticPages.contact.description")}
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-text-secondary">
              <div className="w-10 h-10 bg-bg-surface flex items-center justify-center rounded-lg border border-bg-surface-hover">
                <Mail size={20} strokeWidth={2} />
              </div>
              <span>destek@abc.com</span>
            </div>
            <div className="flex items-center gap-4 text-text-secondary">
              <div className="w-10 h-10 bg-bg-surface flex items-center justify-center rounded-lg border border-bg-surface-hover">
                <MapPin size={20} strokeWidth={2} />
              </div>
              <span>{t("staticPages.contact.location")}</span>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface p-8 rounded-2xl border border-bg-surface-hover">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("staticPages.contact.namePlaceholder")}
              </label>
              <input
                type="text"
                className="w-full bg-bg-base border border-bg-surface-hover rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors"
                placeholder={t("staticPages.contact.namePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("staticPages.contact.email")}
              </label>
              <input
                type="email"
                className="w-full bg-bg-base border border-bg-surface-hover rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors"
                placeholder={t("staticPages.contact.emailPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("staticPages.contact.messagePlaceholder")}
              </label>
              <textarea
                className="w-full bg-bg-base border border-bg-surface-hover rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors h-32"
                placeholder={t("staticPages.contact.messagePlaceholder")}
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-lg transition-colors cursor-pointer"
            >
              {t("staticPages.contact.sendBtn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
