"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ChevronDown,
  Filter,
  ArrowUpDown,
  Search,
  Globe,
  MonitorPlay,
  Calendar,
  Clock,
  Star,
  Languages,
  Check,
} from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import { useMetadata } from "@/providers/metadata-provider";
import { metadataApi } from "@/lib/api";

const Accordion = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-bg-surface/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 border-b border-white/5 transition-colors outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2 font-semibold text-text-primary text-sm">
          {Icon && <Icon size={16} className="text-text-secondary" />}
          {title}
        </div>
        <ChevronDown
          size={16}
          className={`text-text-secondary transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-[1500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 pt-0">{children}</div>
      </div>
    </div>
  );
};

export default function FilterBar({
  type,
  category,
}: {
  type?: string;
  category?: string;
}) {
  const { t, language } = useLanguage();
  const { genres, countries, languages, loading: metaLoading } = useMetadata();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const defaultSort = category === "trending" ? "trending" : "popularity.desc";
  const isMovie = type?.startsWith("movie");
  const tmdbType = isMovie ? "movie" : "series";

  const [localSort, setLocalSort] = useState(
    searchParams.get("sort_by") || defaultSort
  );
  const [localGenres, setLocalGenres] = useState<string[]>(
    searchParams.get("genres")?.split(",").filter(Boolean) || []
  );
  const [localRating, setLocalRating] = useState(
    searchParams.get("rating") || "0"
  );
  const [localVoteCount, setLocalVoteCount] = useState(
    searchParams.get("vote_count") || "0"
  );

  const [localRegion, setLocalRegion] = useState(
    searchParams.get("watch_region") || "TR"
  );
  const [providers, setProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [localSelectedProviders, setLocalSelectedProviders] = useState<
    string[]
  >(searchParams.get("providers")?.split(",").filter(Boolean) || []);
  const [localMonetization, setLocalMonetization] = useState<string[]>(
    searchParams.get("monetization")?.split(",").filter(Boolean) || []
  );
  const [localSearchAllAvails, setLocalSearchAllAvails] = useState(
    !searchParams.has("monetization")
  );

  const [localDateFrom, setLocalDateFrom] = useState(
    searchParams.get("date_from") || ""
  );
  const [localDateTo, setLocalDateTo] = useState(
    searchParams.get("date_to") || ""
  );
  const [localReleaseTypes, setLocalReleaseTypes] = useState<string[]>(
    searchParams.get("release_types")?.split(",").filter(Boolean) || []
  );
  const [localRuntimeFrom, setLocalRuntimeFrom] = useState(
    searchParams.get("runtime_from") || "0"
  );
  const [localRuntimeTo, setLocalRuntimeTo] = useState(
    searchParams.get("runtime_to") || "400"
  );
  const [localOriginalLanguage, setLocalOriginalLanguage] = useState(
    searchParams.get("original_language") || ""
  );

  useEffect(() => {
    if (!localRegion) {
      setProviders([]);
      return;
    }
    let isMounted = true;
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        const data = await metadataApi.getProviders(localRegion, tmdbType);
        if (isMounted) setProviders(data || []);
      } catch (err) {
        console.error("Failed to fetch providers", err);
      } finally {
        if (isMounted) setLoadingProviders(false);
      }
    };
    fetchProviders();
    return () => {
      isMounted = false;
    };
  }, [localRegion, tmdbType]);

  useEffect(() => {
    setLocalSort(searchParams.get("sort_by") || defaultSort);
    setLocalGenres(
      searchParams.get("genres")?.split(",").filter(Boolean) || []
    );
    setLocalRating(searchParams.get("rating") || "0");
    setLocalVoteCount(searchParams.get("vote_count") || "0");
    setLocalRegion(searchParams.get("watch_region") || "TR");
    setLocalSelectedProviders(
      searchParams.get("providers")?.split(",").filter(Boolean) || []
    );
    setLocalMonetization(
      searchParams.get("monetization")?.split(",").filter(Boolean) || []
    );
    setLocalSearchAllAvails(!searchParams.has("monetization"));
    setLocalDateFrom(searchParams.get("date_from") || "");
    setLocalDateTo(searchParams.get("date_to") || "");
    setLocalReleaseTypes(
      searchParams.get("release_types")?.split(",").filter(Boolean) || []
    );
    setLocalRuntimeFrom(searchParams.get("runtime_from") || "0");
    setLocalRuntimeTo(searchParams.get("runtime_to") || "400");
    setLocalOriginalLanguage(searchParams.get("original_language") || "");
  }, [searchParams, defaultSort]);

  const sortOptions = [
    {
      label: t("sortOptions.popularityDesc"),
      value: "popularity.desc",
    },
    {
      label: t("sortOptions.popularityAsc"),
      value: "popularity.asc",
    },
    {
      label: t("sortOptions.ratingDesc"),
      value: "vote_average.desc",
    },
    {
      label: t("sortOptions.ratingAsc"),
      value: "vote_average.asc",
    },
    {
      label: t("sortOptions.dateDesc"),
      value: isMovie ? "primary_release_date.desc" : "first_air_date.desc",
    },
    {
      label: t("sortOptions.dateAsc"),
      value: isMovie ? "primary_release_date.asc" : "first_air_date.asc",
    },
  ];

  const monetizationTypes = [
    { id: "flatrate", label: t("filters.stream") },
    { id: "free", label: t("filters.free") },
    { id: "ads", label: t("filters.ads") },
    { id: "rent", label: t("filters.rent") },
    { id: "buy", label: t("filters.buy") },
  ];

  const releaseTypesMovie = [
    { id: "1", label: t("filters.premiere") },
    { id: "2", label: t("filters.theatricalLimited") },
    { id: "3", label: t("filters.theatrical") },
    { id: "4", label: t("filters.digital") },
    { id: "5", label: t("filters.physical") },
    { id: "6", label: t("filters.tv") },
  ];

  const genreMap = isMovie ? genres.movie : genres.series;
  const genreList = useMemo(
    () =>
      Object.entries(genreMap || {})
        .map(([id, name]) => ({ id: parseInt(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name, language)),
    [genreMap, language]
  );

  const countryList = useMemo(
    () =>
      Object.entries(countries || {})
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name, language)),
    [countries, language]
  );

  const languageList = useMemo(
    () =>
      Object.entries(languages || {})
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name, language)),
    [languages, language]
  );

  const handleToggleArray = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string
  ) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSearch = () => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (localSort && localSort !== defaultSort)
      nextParams.set("sort_by", localSort);
    else nextParams.delete("sort_by");

    if (localGenres.length > 0) nextParams.set("genres", localGenres.join(","));
    else nextParams.delete("genres");

    if (localRating && localRating !== "0")
      nextParams.set("rating", localRating);
    else nextParams.delete("rating");

    if (localVoteCount && localVoteCount !== "0")
      nextParams.set("vote_count", localVoteCount);
    else nextParams.delete("vote_count");

    if (localRegion) nextParams.set("watch_region", localRegion);
    else nextParams.delete("watch_region");

    if (localSelectedProviders.length > 0)
      nextParams.set("providers", localSelectedProviders.join(","));
    else nextParams.delete("providers");

    if (!localSearchAllAvails && localMonetization.length > 0)
      nextParams.set("monetization", localMonetization.join(","));
    else if (!localSearchAllAvails && localMonetization.length === 0) {
      nextParams.set("monetization", "flatrate,free,ads,rent,buy");
    } else nextParams.delete("monetization");

    if (localDateFrom) nextParams.set("date_from", localDateFrom);
    else nextParams.delete("date_from");

    if (localDateTo) nextParams.set("date_to", localDateTo);
    else nextParams.delete("date_to");

    if (localReleaseTypes.length > 0)
      nextParams.set("release_types", localReleaseTypes.join(","));
    else nextParams.delete("release_types");

    if (localRuntimeFrom && localRuntimeFrom !== "0")
      nextParams.set("runtime_from", localRuntimeFrom);
    else nextParams.delete("runtime_from");

    if (localRuntimeTo && localRuntimeTo !== "400")
      nextParams.set("runtime_to", localRuntimeTo);
    else nextParams.delete("runtime_to");

    if (localOriginalLanguage)
      nextParams.set("original_language", localOriginalLanguage);
    else nextParams.delete("original_language");

    router.push(`${pathname}?${nextParams.toString()}`);
  };

  const isChanged =
    localSort !== (searchParams.get("sort_by") || defaultSort) ||
    localGenres.sort().join(",") !==
      (searchParams.get("genres")?.split(",").filter(Boolean).sort().join(",") ||
        "") ||
    localRating !== (searchParams.get("rating") || "0") ||
    localVoteCount !== (searchParams.get("vote_count") || "0") ||
    localRegion !== (searchParams.get("watch_region") || "TR") ||
    localSelectedProviders.sort().join(",") !==
      (searchParams
        .get("providers")
        ?.split(",")
        .filter(Boolean)
        .sort()
        .join(",") || "") ||
    localSearchAllAvails !== !searchParams.has("monetization") ||
    (!localSearchAllAvails &&
      localMonetization.sort().join(",") !==
        (searchParams
          .get("monetization")
          ?.split(",")
          .filter(Boolean)
          .sort()
          .join(",") || "")) ||
    localDateFrom !== (searchParams.get("date_from") || "") ||
    localDateTo !== (searchParams.get("date_to") || "") ||
    localReleaseTypes.sort().join(",") !==
      (searchParams
        .get("release_types")
        ?.split(",")
        .filter(Boolean)
        .sort()
        .join(",") || "") ||
    localRuntimeFrom !== (searchParams.get("runtime_from") || "0") ||
    localRuntimeTo !== (searchParams.get("runtime_to") || "400") ||
    localOriginalLanguage !== (searchParams.get("original_language") || "");

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-4 animate-fade-in">
        {/* Sort */}
        <Accordion title={t("filters.sort")} icon={ArrowUpDown}>
          <div className="relative mt-2">
            <select
              value={localSort}
              onChange={(e) => setLocalSort(e.target.value)}
              className="w-full bg-white/5 text-text-primary text-sm border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all cursor-pointer appearance-none"
            >
              {sortOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-bg-surface"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
          </div>
        </Accordion>

        {/* Watch Providers */}
        <Accordion title={t("filters.whereToWatch")} icon={MonitorPlay}>
          <div className="flex flex-col gap-5 mt-2">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-text-secondary ml-1">
                {t("filters.country")}
              </label>
              <div className="relative">
                <select
                  value={localRegion}
                  onChange={(e) => {
                    setLocalRegion(e.target.value);
                    setLocalSelectedProviders([]);
                  }}
                  className="w-full bg-white/5 text-text-primary text-sm border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-white/20 transition-all cursor-pointer appearance-none"
                >
                  <option value="" className="bg-bg-surface">
                    {t("filters.allCountries")}
                  </option>
                  {countryList.map((c) => (
                    <option
                      key={c.code}
                      value={c.code}
                      className="bg-bg-surface"
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
                <Globe
                  size={14}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                />
              </div>
            </div>

            {localRegion && (
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-text-secondary ml-1">
                  {t("filters.availabilities")}
                </label>
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-white/5 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={localSearchAllAvails}
                    onChange={(e) => {
                      setLocalSearchAllAvails(e.target.checked);
                      if (e.target.checked) setLocalMonetization([]);
                      else
                        setLocalMonetization([
                          "flatrate",
                          "free",
                          "ads",
                          "rent",
                          "buy",
                        ]);
                    }}
                    className="rounded border-white/20 bg-bg-surface accent-white w-4 h-4 cursor-pointer"
                  />
                  {t("filters.searchAllAvailabilities")}
                </label>
                {!localSearchAllAvails && (
                  <div className="grid grid-cols-2 gap-2 pl-6 mt-1">
                    {monetizationTypes.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-white/5 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={localMonetization.includes(m.id)}
                          onChange={() =>
                            handleToggleArray(setLocalMonetization, m.id)
                          }
                          className="rounded border-white/20 bg-bg-surface accent-white w-3.5 h-3.5 cursor-pointer"
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {localRegion && (
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-text-secondary ml-1">
                  {t("filters.providers")}
                </label>
                {loadingProviders ? (
                  <div className="flex items-center gap-2 text-xs text-text-secondary py-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                    {t("common.loading")}
                  </div>
                ) : providers.length === 0 ? (
                  <p className="text-xs text-text-secondary py-2">
                    {t("filters.noProviders")}
                  </p>
                ) : (
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-4 gap-2">
                    {providers.map((p) => {
                      const isActive = localSelectedProviders.includes(
                        p.provider_id.toString()
                      );
                      return (
                        <button
                          key={p.provider_id}
                          onClick={() =>
                            handleToggleArray(
                              setLocalSelectedProviders,
                              p.provider_id.toString()
                            )
                          }
                          title={p.provider_name}
                          className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
                            isActive
                              ? "ring-2 ring-white scale-95"
                              : "hover:scale-105 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                            alt={p.provider_name}
                            className="w-full h-full object-cover"
                          />
                          {isActive && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Check size={16} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Accordion>

        {/* Filters */}
        <Accordion title={t("filters.filters")} icon={Filter}>
          <div className="flex flex-col gap-6 mt-2">
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-bold text-text-secondary flex items-center gap-2 ml-1">
                <Calendar size={14} />
                {t("filters.releaseDates")}
              </label>

              <div className="flex flex-col gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-text-secondary ml-1">
                    {t("filters.from")}
                  </label>
                  <input
                    type="date"
                    value={localDateFrom}
                    onChange={(e) => setLocalDateFrom(e.target.value)}
                    className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-white/20 [color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-text-secondary ml-1">
                    {t("filters.to")}
                  </label>
                  <input
                    type="date"
                    value={localDateTo}
                    onChange={(e) => setLocalDateTo(e.target.value)}
                    className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-white/20 [color-scheme:dark]"
                  />
                </div>
              </div>

              {isMovie && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {releaseTypesMovie.map((rt) => {
                    const isActive = localReleaseTypes.includes(rt.id);
                    return (
                      <button
                        key={rt.id}
                        onClick={() =>
                          handleToggleArray(setLocalReleaseTypes, rt.id)
                        }
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white/5 text-text-secondary hover:bg-white/10"
                        }`}
                      >
                        {rt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-bold text-text-secondary ml-1">
                {t("category.genres")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {genreList.map(({ id, name }) => {
                  const isActive = localGenres.includes(id.toString());
                  return (
                    <button
                      key={id}
                      onClick={() =>
                        handleToggleArray(setLocalGenres, id.toString())
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-white/15 border-white/30 text-white shadow-sm"
                          : "bg-white/5 border-white/5 text-text-secondary hover:border-white/20 hover:text-text-primary hover:bg-white/10"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-bold text-text-secondary flex items-center gap-2 ml-1">
                <Languages size={14} />
                {t("filters.originalLanguage")}
              </label>
              <div className="relative">
                <select
                  value={localOriginalLanguage}
                  onChange={(e) => setLocalOriginalLanguage(e.target.value)}
                  className="w-full bg-white/5 text-text-primary text-sm border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-white/20 transition-all cursor-pointer appearance-none"
                >
                  <option value="" className="bg-bg-surface">
                    {t("filters.allLanguages")}
                  </option>
                  <optgroup label="Popular">
                    <option value="en" className="bg-bg-surface">
                      English
                    </option>
                    <option value="tr" className="bg-bg-surface">
                      Turkish
                    </option>
                    <option value="fr" className="bg-bg-surface">
                      French
                    </option>
                    <option value="es" className="bg-bg-surface">
                      Spanish
                    </option>
                    <option value="ko" className="bg-bg-surface">
                      Korean
                    </option>
                    <option value="ja" className="bg-bg-surface">
                      Japanese
                    </option>
                  </optgroup>
                  <optgroup label="All">
                    {languageList.map((l) => (
                      <option
                        key={l.code}
                        value={l.code}
                        className="bg-bg-surface"
                      >
                        {l.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-bold text-text-secondary flex items-center gap-2 ml-1">
                <Clock size={14} />
                {t("filters.runtime")}
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[10px] text-text-secondary text-center">
                    {localRuntimeFrom} min
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="400"
                    step="15"
                    value={localRuntimeFrom}
                    onChange={(e) => setLocalRuntimeFrom(e.target.value)}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>
                <span className="text-text-secondary text-xs">-</span>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[10px] text-text-secondary text-center">
                    {localRuntimeTo} min
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="400"
                    step="15"
                    value={localRuntimeTo}
                    onChange={(e) => setLocalRuntimeTo(e.target.value)}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 pt-2">
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-bold text-text-secondary flex items-center justify-between ml-1">
                  <span className="flex items-center gap-2">
                    <Star size={14} /> {t("category.minRating")}
                  </span>
                  <span className="bg-white/10 px-2 py-0.5 rounded text-white">
                    {localRating}
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={localRating}
                  onChange={(e) => setLocalRating(e.target.value)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-bold text-text-secondary flex items-center justify-between ml-1">
                  <span>{t("filters.minVotes")}</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded text-white">
                    {localVoteCount}
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={localVoteCount}
                  onChange={(e) => setLocalVoteCount(e.target.value)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>
          </div>
        </Accordion>

        <button
          onClick={handleSearch}
          disabled={!isChanged}
          className={`w-full mt-2 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 group ${
            isChanged
              ? "bg-white text-bg-base cursor-pointer hover:bg-white/90 active:scale-[0.98] shadow-lg shadow-white/5"
              : "bg-white/5 text-text-secondary/50 border border-white/10 cursor-not-allowed"
          }`}
        >
          <Search
            size={18}
            className={
              isChanged ? "group-hover:scale-110 transition-transform" : "opacity-50"
            }
          />
          {t("category.search")}
        </button>
      </div>
    </div>
  );
}
