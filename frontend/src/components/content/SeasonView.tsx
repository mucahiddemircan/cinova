"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/language-provider";
import { contentApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/layout/Skeleton";
import PlaceholderImage from "@/components/common/PlaceholderImage";
import ErrorState from "@/components/common/ErrorState";
import LoadingDots from "@/components/common/LoadingDots";

interface SeasonViewProps {
  id: string;
  seasonNumber?: string;
}

export default function SeasonView({ id, seasonNumber }: SeasonViewProps) {
  const { t, language, getLocalizedPath } = useLanguage();
  const router = useRouter();
  const activeSeasonNum = seasonNumber !== undefined ? parseInt(seasonNumber) : null;

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ["details", "series", id],
    queryFn: () => contentApi.getById("series", id),
  });

  const { data: selectedSeason, isLoading: seasonLoading } = useQuery({
    queryKey: ["season", id, activeSeasonNum],
    queryFn: () => contentApi.getSeason(id, activeSeasonNum!),
    enabled: activeSeasonNum !== null,
  });

  if (movieLoading) {
    return (
      <div className="animate-fade-in py-8">
        <div className="mb-12 space-y-4 px-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <ErrorState
        title={t("errors.notFound.title")}
        subtitle={t("errors.notFound.subtitle")}
        buttonText={t("errors.notFound.homeBtn")}
        buttonLink="/"
        errorCode="404"
      />
    );
  }

  // -- RENDER: ALL SEASONS LIST --
  if (activeSeasonNum === null) {
    return (
      <div className="animate-fade-in pb-20">
        <div className="mb-12 px-2">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">
            {movie.title}
          </h1>
          <p className="text-lg text-text-secondary font-medium">
            {t("details.seasonsAndEpisodes")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {(movie as any).seasons?.map((season: any) => (
            <div
              key={season.id}
              onClick={() =>
                router.push(
                  getLocalizedPath(`/series/${id}/seasons/${season.season_number}`)
                )
              }
              className="group flex gap-6 md:gap-8 p-4 md:p-8 rounded-[2rem] bg-transparent hover:bg-white/[0.08] border border-white/5 transition-all duration-300 cursor-pointer"
            >
              <div className="w-24 sm:w-32 md:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl shrink-0 border border-white/10 self-start bg-bg-base">
                {season.poster_path ? (
                  <img
                    src={season.poster_path}
                    alt={season.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PlaceholderImage type="series" iconSize={40} />
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  <Link
                    href={getLocalizedPath(
                      `/series/${id}/seasons/${season.season_number}`
                    )}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline decoration-white"
                  >
                    {season.name}
                  </Link>
                  {season.season_number === 0 && (
                    <span className="ml-3 text-sm font-medium text-white/30">
                      ({t("details.specialSeason")})
                    </span>
                  )}
                </h2>

                <div className="flex items-center gap-6 text-sm font-medium text-text-secondary mb-6">
                  <span>
                    {season.episode_count} {t("details.episodes")}
                  </span>
                  {season.air_date && (
                    <span>{new Date(season.air_date).getFullYear()}</span>
                  )}
                </div>

                <p className="text-sm md:text-base text-white/50 leading-relaxed font-medium">
                  {season.overview || t("details.noSeasonOverview")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -- RENDER: EPISODES LIST --
  return (
    <div className="animate-fade-in pb-20">
      <div className="mb-10 px-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              {movie.title}
            </h1>
            <h2 className="text-xl md:text-2xl font-medium text-white/40">
              {selectedSeason?.name ||
                `${t("details.season")} ${activeSeasonNum}`}
            </h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {(movie as any).seasons?.map((s: any) => (
              <Link
                key={s.id}
                href={getLocalizedPath(`/series/${id}/seasons/${s.season_number}`)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                  activeSeasonNum === s.season_number
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/40 border-white/5 hover:border-white/20"
                }`}
              >
                {s.season_number === 0 ? t("details.specials") : `S${s.season_number}`}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {seasonLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : selectedSeason ? (
        <div className="animate-fade-in space-y-4">
          {selectedSeason.episodes?.map((episode: any) => (
            <div
              key={episode.id}
              className="flex flex-col md:flex-row gap-6 p-5 rounded-3xl bg-transparent border border-white/5 transition-all duration-300"
            >
              <div className="w-full md:w-56 aspect-video rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-lg bg-bg-base">
                {episode.still_path ? (
                  <img
                    src={episode.still_path}
                    alt={episode.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PlaceholderImage type="series" iconSize={32} />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                  <h4 className="text-lg font-bold text-white">
                    <span className="text-white/20 mr-3 tabular-nums font-medium">
                      {episode.episode_number}
                    </span>
                    <span>{episode.name}</span>
                  </h4>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-text-secondary">
                    {episode.runtime && (
                      <span>
                        {t("details.runtimeMinutes", {
                          minutes: episode.runtime,
                        })}
                      </span>
                    )}
                    {episode.air_date && (
                      <span>
                        {new Date(episode.air_date).toLocaleDateString(
                          language === "tr" ? "tr-TR" : "en-US"
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-white/40 leading-relaxed font-medium">
                  {episode.overview || t("details.noSummary")}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
