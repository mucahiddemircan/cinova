"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLanguage } from "@/providers/language-provider";
import { useMetadata } from "@/providers/metadata-provider";
import { useCertification } from "@/providers/certification-provider";
import { resolveGenreNames } from "@/lib/utils";
import { Star } from "lucide-react";
import CardActions from "./CardActions";
import PlaceholderImage from "../common/PlaceholderImage";
import LocalizedLink from "../common/LocalizedLink";
import type { User } from "@/types";

interface MovieCardProps {
  movie: any;
  user: User | null;
}

export default function MovieCard({ movie, user }: MovieCardProps) {
  const { t, getLocalizedPath } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const { getCertInfo } = useCertification();
  const { getGenreName } = useMetadata();

  const isSearchOrMyLists =
    pathname.includes("/search") || pathname.includes("/mylists");
  const lineClampClass = isSearchOrMyLists ? "line-clamp-4" : "line-clamp-2";

  const getNavPath = () => {
    if (movie.type === "profile") return `/${movie.title}`;
    if (movie.type === "person") return `/people/${movie.id}`;
    return `/${movie.type === "series" ? "series" : "movies"}/${movie.id}`;
  };

  const handleClick = () => {
    router.push(getLocalizedPath(getNavPath()));
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <div
        onClick={handleClick}
        className="block h-full cursor-pointer relative"
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        <article className="bg-bg-surface group/card rounded-md overflow-hidden border border-transparent transition-all duration-300 flex flex-col h-full shadow-lg">
          <CardActions movie={movie} user={user} />
          <div
            className={`${
              movie.type === "profile"
                ? "aspect-square w-24 h-24 sm:w-32 sm:h-32 mx-auto mt-6 rounded-full border border-white/10"
                : "aspect-[2/3]"
            } bg-bg-base relative flex items-center justify-center overflow-hidden shrink-0`}
          >
            {movie.poster_path ? (
              <img
                src={
                  movie.poster_path.startsWith("http")
                    ? movie.poster_path
                    : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                }
                alt={movie.title || movie.name}
                className={`w-full h-full object-cover group-hover/card:brightness-75 transition-all duration-500`}
              />
            ) : (
              <PlaceholderImage type={movie.type} />
            )}
            {movie.type !== "profile" && (
              <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-transparent to-transparent opacity-90" />
            )}
          </div>

          <div
            className={`p-4 flex-grow flex flex-col z-10 ${
              movie.type === "profile"
                ? "mt-2 items-center text-center"
                : "-mt-6"
            } min-h-[130px] md:min-h-[150px]`}
          >
            <h2
              className={`text-lg font-bold text-text-primary mb-0.5 ${lineClampClass}`}
              title={movie.title || movie.name}
            >
              <LocalizedLink
                href={getNavPath()}
                onClick={stopPropagation}
                className="hover:underline"
              >
                {movie.title || movie.name}
              </LocalizedLink>
            </h2>

            {movie.original_title && (
              <p
                className="text-[11px] text-text-secondary/60 font-medium line-clamp-1 mb-1 italic"
                title={movie.original_title}
              >
                {movie.original_title}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-text-secondary mb-2 whitespace-nowrap overflow-hidden">
              {(movie.release_date || movie.first_air_date) && (
                <>
                  <span>
                    {(movie.release_date || movie.first_air_date).split("-")[0]}
                  </span>
                </>
              )}
              {movie.vote_average > 0 && (
                <>
                  {(movie.release_date || movie.first_air_date) && (
                    <span>•</span>
                  )}
                  <div className="flex items-center gap-0.5">
                    <Star size={12} fill="#eab308" color="#eab308" />
                    <span className="font-bold text-white/80">
                      {movie.vote_average.toFixed(1)}
                    </span>
                  </div>
                </>
              )}
              {movie.certification &&
                (() => {
                  const certInfo = getCertInfo(movie.certification);
                  if (!certInfo) return null;
                  return (
                    <>
                      {((movie.release_date || movie.first_air_date) ||
                        movie.vote_average > 0) && <span>•</span>}
                      <span
                        className={`px-1.5 py-0.5 rounded border-2 text-[9px] font-bold leading-none ${certInfo.colorClass}`}
                      >
                        {certInfo.label}
                      </span>
                    </>
                  );
                })()}
            </div>

            <p className="text-[10px] sm:text-xs text-text-secondary/60 line-clamp-1 mb-3 italic">
              {resolveGenreNames(
                movie.genre_ids,
                getGenreName,
                movie.type,
                t("common.genreNotSpecified")
              )}
            </p>

            {!movie.hideDetails && (
              <div className="text-sm text-text-secondary/90 leading-relaxed flex-grow overflow-hidden">
                {(() => {
                  if (movie.role && !movie.hideRole)
                    return (
                      <span>
                        {t("person.actedAs", { role: movie.role })}
                      </span>
                    );

                  const desc =
                    movie.description ||
                    movie.overview ||
                    t("person.noDescription");

                  if (desc.startsWith("@pers@")) {
                    const people = desc.replace("@pers@", "").split("\n");
                    return (
                      <div className="text-[10px] sm:text-[11px] leading-tight flex flex-col gap-0.5 mt-0.5">
                        {people.map((p: string, i: number) => (
                          <div
                            key={i}
                            className="text-white/80 font-medium"
                            title={p}
                          >
                            {p}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <span className="text-sm text-text-secondary/90 line-clamp-2 md:line-clamp-3 leading-relaxed">
                      {desc}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
