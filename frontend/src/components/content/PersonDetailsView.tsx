"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLanguage } from "@/providers/language-provider";
import { useMetadata } from "@/providers/metadata-provider";
import { useLibraryStore } from "@/stores/library-store";
import { peopleApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { calculateAge, formatDate } from "@/lib/utils";
import MovieCard from "@/components/content/MovieCard";
import MovieList from "@/components/content/MovieList";
import FollowButton from "@/components/profile/FollowButton";
import FollowStats from "@/components/profile/FollowStats";
import FollowMenu from "@/components/profile/FollowMenu";
import Skeleton from "@/components/layout/Skeleton";
import { MovieListSkeleton } from "@/components/content/CardSkeleton";
import { ChevronRight, ChevronUp } from "lucide-react";
import PlaceholderImage from "@/components/common/PlaceholderImage";
import Avatar from "@/components/common/Avatar";
import ErrorState from "@/components/common/ErrorState";

interface PersonDetailsViewProps {
  id: string;
}

export default function PersonDetailsView({ id }: PersonDetailsViewProps) {
  const { t, language } = useLanguage();
  const { translateLocal } = useMetadata();
  const bioRef = useRef<HTMLDivElement>(null);
  
  const [viewMode, setViewMode] = useState<"recent" | "popular" | "oldest">(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem(`person_view_mode_${id}`) as any) || "recent";
    }
    return "recent";
  });
  
  const [visibleCount, setVisibleCount] = useState(25);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const { data: person, isLoading: loading, isError } = useQuery({
    queryKey: ["person-details", id],
    queryFn: () => peopleApi.getPersonDetails(id),
  });

  const { isFollowingPerson } = useLibraryStore();
  const isCurrentlyFollowing = isFollowingPerson(Number(id));

  const initialFollowStatusRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (person && initialFollowStatusRef.current === null) {
      initialFollowStatusRef.current = !!person.is_following;
    }
  }, [person]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`person_view_mode_${id}`, viewMode);
    }
    setVisibleCount(25);
  }, [id, viewMode]);

  const allCast = useMemo(() => person?.known_for || [], [person]);

  const sortedItems = useMemo(() => {
    if (viewMode === "popular") return allCast;
    if (viewMode === "recent") {
      return [...allCast].sort((a, b) =>
        (b.release_date || "0000").localeCompare(a.release_date || "0000")
      );
    }
    if (viewMode === "oldest") {
      return [...allCast].sort((a, b) => {
        const dateA = a.release_date || "9999";
        const dateB = b.release_date || "9999";
        return dateA.localeCompare(dateB);
      });
    }
    return allCast;
  }, [allCast, viewMode]);

  const visibleItems = useMemo(() => sortedItems.slice(0, visibleCount), [sortedItems, visibleCount]);
  const hasMore = visibleCount < sortedItems.length;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => prev + 25);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const displayedFollowersCount = useMemo(() => {
    if (!person) return 0;
    if (initialFollowStatusRef.current === null) return person.followers_count || 0;

    const diff = (isCurrentlyFollowing ? 1 : 0) - (initialFollowStatusRef.current ? 1 : 0);
    return Math.max(0, (person.followers_count || 0) + diff);
  }, [person, isCurrentlyFollowing]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <Skeleton className="h-4 w-24" />
        </div>
        <header className="mb-14 flex flex-col lg:flex-row gap-12 border-b border-white/5 pb-14">
          <Skeleton
            className="w-64 h-96 rounded-2xl shrink-0"
            variant="shimmer"
          />
          <div className="flex-1 flex flex-col gap-6 pt-4">
            <Skeleton className="h-16 w-1/2" />
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
          </div>
        </header>
        <MovieListSkeleton />
      </div>
    );
  }

  if (isError || !person || (person as any).detail) {
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

  return (
    <div className="animate-fade-in">
      <div className="bg-bg-surface p-6 lg:p-8 rounded-[2rem] border border-bg-surface-hover shadow-2xl mb-12 grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-x-8 lg:gap-x-10 items-start overflow-hidden">
        <div className="order-1 flex justify-center lg:justify-start w-full lg:w-auto">
          <Avatar
            src={person.profile_path}
            alt={person.name}
            size="2xl"
            type="person"
          />
        </div>

        <div className="order-2 mt-8 lg:mt-0 flex flex-col items-center lg:items-start w-full min-w-0">
          <div className="flex flex-col items-center lg:items-start gap-5 mb-8">
            <div>
              <h1 className="text-3xl lg:text-6xl font-black mb-1 break-words text-center lg:text-left">
                {person.name}
              </h1>
              {person.original_name && person.original_name !== person.name && (
                <p className="text-sm text-text-secondary/60 font-medium italic text-center lg:text-left">
                  {t("person.originalName")}: {person.original_name}
                </p>
              )}
            </div>

            <FollowStats
              followersCount={displayedFollowersCount}
              isPerson={true}
            />

            <div className="flex items-center gap-3">
              <FollowButton
                user={null}
                username={person.name}
                personId={Number(id)}
                type="person"
                isFollowing={!!person.is_following}
                extraData={{
                  name: person.name,
                  profile_path: person.profile_path,
                  id: Number(id),
                }}
              />
              <FollowMenu
                user={null}
                username={person.name}
                personId={Number(id)}
                type="person"
                isFollowing={!!person.is_following}
                extraData={{
                  name: person.name,
                  profile_path: person.profile_path,
                  id: Number(id),
                }}
              />
            </div>
          </div>
        </div>

        <div className="order-3 mt-10 md:mt-12 w-full">
          <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-text-primary">
                {t("person.personalInfo")}
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  {t("person.knownFor")}
                </h4>
                <p className="text-sm text-text-secondary mt-1">
                  {translateLocal("departments", person.known_for_department)}
                </p>
              </div>

              {person.birthday && (
                <div>
                  <h4 className="text-sm font-bold text-text-primary">
                    {t("person.born")}
                  </h4>
                  <p className="text-sm text-text-secondary mt-1">
                    {formatDate(person.birthday, language)}{" "}
                    {!person.deathday &&
                      `(${t("person.age", {
                        age: calculateAge(person.birthday),
                      })})`}
                  </p>
                </div>
              )}

              {person.deathday && (
                <div>
                  <h4 className="text-sm font-bold text-text-primary">
                    {t("person.deathday")}
                  </h4>
                  <p className="text-sm text-text-secondary mt-1">
                    {formatDate(person.deathday, language)} (
                    {t("person.age", {
                      age: calculateAge(person.birthday, person.deathday),
                    })}
                    )
                  </p>
                </div>
              )}

              {person.place_of_birth && (
                <div>
                  <h4 className="text-sm font-bold text-text-primary">
                    {t("person.birthPlace")}
                  </h4>
                  <p className="text-sm text-text-secondary mt-1">
                    {person.place_of_birth}
                  </p>
                </div>
              )}

              {person.also_known_as && person.also_known_as.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-text-primary">
                    {t("person.alsoKnownAs")}
                  </h4>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {person.also_known_as
                      .filter(
                        (alias) =>
                          alias !== person.name &&
                          alias !== person.original_name
                      )
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="order-4 mt-10 md:mt-12 w-full min-w-0">
          {person.biography && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 scroll-mt-24" ref={bioRef}>
                <h3 className="text-xl font-bold text-text-primary">
                  {t("person.biography")}
                </h3>
              </div>

              <div className="relative group/bio">
                <p
                  className={`text-text-secondary text-sm md:text-base text-left leading-relaxed opacity-90 break-words whitespace-pre-wrap transition-all duration-500 ${
                    isBioExpanded ? "" : "max-h-52 overflow-hidden"
                  }`}
                >
                  {person.biography}
                </p>

                {person.biography.length > 280 && !isBioExpanded && (
                  <>
                    <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-bg-surface to-transparent pointer-events-none"></div>

                    <button
                      onClick={() => setIsBioExpanded(true)}
                      className="absolute bottom-0 right-0 text-white font-bold text-sm md:text-base flex items-center gap-1 transition-all cursor-pointer group/more"
                    >
                      <span className="group-hover/more:underline">
                        {t("common.seeAll")}
                      </span>
                      <span className="group-hover/more:translate-x-1.5 transition-transform duration-300">
                        <ChevronRight size={18} strokeWidth={3} />
                      </span>
                    </button>
                  </>
                )}

                {isBioExpanded && (
                  <button
                    onClick={() => {
                      setIsBioExpanded(false);
                      bioRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    className="mt-4 text-text-secondary/60 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ChevronUp size={12} strokeWidth={3} />
                    {t("common.back")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {person.known_for && person.known_for.length > 0 && (
        <div className="mb-14">
          <MovieList
            title={t("person.popular")}
            contents={person.known_for
              .slice(0, 16)
              .map((m: any) => ({ ...m, hideDetails: true }))}
            user={null}
            hideShowAll={true}
            noUnderline={true}
            variant="small"
          />
        </div>
      )}

      <div className="mb-10">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-text-primary">
                {t("person.portfolio")}
              </h2>
            </div>
            <span className="text-text-secondary text-sm md:text-base font-medium mb-1">
              · {allCast.length} {t("common.results")}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setViewMode("recent")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 border whitespace-nowrap cursor-pointer ${
                viewMode === "recent"
                  ? "bg-white text-black border-white shadow-lg shadow-white/10"
                  : "bg-bg-surface text-text-secondary border-white/5 hover:border-white/20 hover:text-text-primary"
              }`}
            >
              {t("person.newestSort")}
            </button>
            <button
              onClick={() => setViewMode("popular")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 border whitespace-nowrap cursor-pointer ${
                viewMode === "popular"
                  ? "bg-white text-black border-white shadow-lg shadow-white/10"
                  : "bg-bg-surface text-text-secondary border-white/5 hover:border-white/20 hover:text-text-primary"
              }`}
            >
              {t("movieCategories.popular")}
            </button>
            <button
              onClick={() => setViewMode("oldest")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 border whitespace-nowrap cursor-pointer ${
                viewMode === "oldest"
                  ? "bg-white text-black border-white shadow-lg shadow-white/10"
                  : "bg-bg-surface text-text-secondary border-white/5 hover:border-white/20 hover:text-text-primary"
              }`}
            >
              {t("person.oldestSort")}
            </button>
          </div>
        </div>

        {visibleItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
            {visibleItems.map((movie, index) => (
              <div
                key={`${movie.id}-${index}`}
                ref={
                  index === visibleItems.length - 1
                    ? (lastElementRef as any)
                    : null
                }
              >
                <MovieCard movie={movie} user={null} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-bg-surface rounded-xl border border-dashed border-white/10">
            <p className="text-text-secondary italic">
              {t("search.noCriteriaMatch")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
