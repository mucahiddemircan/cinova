"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/language-provider";
import { useMetadata } from "@/providers/metadata-provider";
import { contentApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Globe, XCircle } from "lucide-react";
import PlaceholderImage from "@/components/common/PlaceholderImage";
import LoadingDots from "@/components/common/LoadingDots";

const COUNTRY_CODES = [
  "TR",
  "US",
  "DE",
  "FR",
  "GB",
  "ES",
  "IT",
  "CA",
  "AU",
  "IN",
  "JP",
  "KR",
];

interface WatchViewProps {
  type: "movie" | "series";
  id: string;
}

export default function WatchView({ type, id }: WatchViewProps) {
  const { t, language } = useLanguage();
  const { getCountryName } = useMetadata();
  const [selectedCountry, setSelectedCountry] = useState(
    language === "tr" ? "TR" : "US"
  );

  const { data: movie, isLoading } = useQuery({
    queryKey: ["details", type, id],
    queryFn: () => contentApi.getById(type, id),
  });

  if (isLoading) {
    return (
      <div className="text-center py-40">
        <LoadingDots size="lg" className="text-white/20" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="text-center py-20 text-white">{t("watch.noSource")}</div>
    );
  }

  const p = (movie as any).watch_providers?.[selectedCountry] || null;

  const hasProviders =
    p &&
    (p.flatrate?.length > 0 ||
      p.ads?.length > 0 ||
      p.free?.length > 0 ||
      p.rent?.length > 0 ||
      p.buy?.length > 0);

  return (
    <div className="animate-fade-in overflow-x-hidden">
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
        <div className="w-32 md:w-48 aspect-[2/3] bg-bg-surface rounded-xl border border-bg-surface-hover overflow-hidden shadow-2xl shrink-0">
          {movie.poster_path ? (
            <img
              src={movie.poster_path}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <PlaceholderImage type={type} />
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-2 leading-tight">
            {movie.title}
          </h1>
          <p className="text-xl md:text-2xl text-brand font-bold tracking-tight">
            {t("watch.watchOptions")}
          </p>
        </div>
      </div>

      <div className="bg-bg-surface p-6 rounded-2xl border border-bg-surface-hover mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
            <Globe size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              {t("watch.changeRegion")}
            </h2>
            <p className="text-xs text-text-secondary">
              {t("watch.regionDisclaimer")}
            </p>
          </div>
        </div>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="bg-bg-base text-white px-4 py-3 rounded-xl border border-bg-surface-hover focus:outline-none focus:border-brand/50 cursor-pointer font-bold transition-all w-full md:w-auto min-w-[200px]"
        >
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {getCountryName(code)}
            </option>
          ))}
        </select>
      </div>

      {!hasProviders ? (
        <div className="bg-bg-surface p-12 rounded-2xl border border-bg-surface-hover text-center space-y-4">
          <div className="text-text-secondary/20 flex justify-center">
            <XCircle size={64} strokeWidth={1} />
          </div>
          <p className="text-text-secondary font-medium">
            {t("watch.noProviders")}
          </p>
        </div>
      ) : (
        <div className="bg-bg-surface p-8 md:p-12 rounded-[2rem] border border-bg-surface-hover shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {p.flatrate?.length > 0 && (
              <ProviderSection
                title={t("watch.subscription")}
                items={p.flatrate}
                link={p.link}
              />
            )}
            {p.ads?.length > 0 && (
              <ProviderSection
                title={t("watch.ads")}
                items={p.ads}
                link={p.link}
              />
            )}
            {p.free?.length > 0 && (
              <ProviderSection
                title={t("watch.free")}
                items={p.free}
                link={p.link}
              />
            )}
            {p.rent?.length > 0 && (
              <ProviderSection
                title={t("watch.rent")}
                items={p.rent}
                link={p.link}
              />
            )}
            {p.buy?.length > 0 && (
              <ProviderSection
                title={t("watch.buy")}
                items={p.buy}
                link={p.link}
              />
            )}
          </div>
        </div>
      )}

      <div className="mt-12 text-center p-8 border-t border-bg-surface-hover/30">
        <p className="text-sm text-text-secondary leading-relaxed">
          {t("watch.dailyUpdated")} <br />
          {(() => {
            const translation = t("watch.allOptionsTMDB", { link: "[[LINK]]" });
            const [before, after] = translation.split("[[LINK]]");
            return (
              <>
                {before}
                <a
                  href={p?.link || "https://www.themoviedb.org"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-bold no-underline hover:underline"
                >
                  TMDB
                </a>
                {after}
              </>
            );
          })()}
        </p>
      </div>
    </div>
  );
}

function ProviderSection({
  title,
  items,
  link,
}: {
  title: string;
  items: any[];
  link: string;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-white opacity-80">{title}</h3>
      <div className="flex flex-wrap gap-4">
        {items.map((item) => (
          <a
            key={item.provider_id}
            href={link || "https://www.themoviedb.org"}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block transition-all duration-300 hover:brightness-75 active:scale-95"
            title={item.provider_name}
          >
            <div className="relative">
              <img
                src={item.logo_path}
                alt={item.provider_name}
                className="w-12 h-12 rounded-xl shadow-xl ring-1 ring-white/5"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
