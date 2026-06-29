"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/language-provider";
import MovieCard from "./MovieCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { User } from "@/types";

interface MovieListProps {
  title?: string;
  contents: any[];
  to?: string;
  user: User | null;
  hideShowAll?: boolean;
  noUnderline?: boolean;
  variant?: "default" | "small";
  restoreKey?: string;
}

export default function MovieList({
  title,
  contents,
  to,
  user,
  hideShowAll = false,
  noUnderline = false,
  variant = "default",
  restoreKey,
}: MovieListProps) {
  const { t, getLocalizedPath } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const isSmall = variant === "small";

  const storageKey = restoreKey
    ? `movie_scroll_${restoreKey}`
    : `movie_scroll_${title}`;

  const itemClass = isSmall
    ? "min-w-[120px] w-[30vw] sm:w-[20vw] md:min-w-[140px] md:w-[160px] flex-none"
    : "min-w-[140px] w-[35vw] sm:w-[25vw] md:w-[calc((100%-120px)/6)] flex-none";

  const containerClass = `flex overflow-x-auto ${
    isSmall ? "gap-3 md:gap-4" : "gap-4 md:gap-6"
  } pb-4 pt-2 scroll-smooth touch-pan-y hide-scrollbar -ml-6 pl-6 -mr-6 md:ml-0 md:pl-0 md:mr-0`;

  useEffect(() => {
    const savedPos = sessionStorage.getItem(storageKey);
    if (savedPos && scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = parseInt(savedPos, 10);
          updateArrows();
        }
      });
    } else {
      updateArrows();
    }

    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [contents, storageKey]);

  const updateArrows = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    sessionStorage.setItem(storageKey, scrollLeft.toString());
  };

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (!contents || contents.length === 0) return null;

  return (
    <section className="mb-10 group relative">
      <div className="flex justify-between items-end mb-4">
        {title && (
          <h2
            className={`${
              isSmall ? "text-xl md:text-2xl" : "text-2xl"
            } font-bold text-text-primary`}
          >
            {to ? (
              <Link
                href={getLocalizedPath(to)}
                className={`cursor-pointer decoration-white ${
                  noUnderline ? "" : "hover:underline"
                }`}
              >
                {title}
              </Link>
            ) : (
              <span className="decoration-white cursor-default">{title}</span>
            )}
          </h2>
        )}
        {!hideShowAll && to && (
          <Link
            href={getLocalizedPath(to)}
            className="hidden md:block text-sm text-text-secondary hover:text-text-primary hover:underline cursor-pointer font-medium tracking-wide transition-colors decoration-white"
          >
            {t("common.showAll")}
          </Link>
        )}
      </div>

      {showLeft && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            scrollBy(-300);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 top-[50%] -translate-y-1/2 z-[60] bg-black/80 hover:bg-black text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer pointer-events-none group-hover:pointer-events-auto shadow-2xl border border-white/10"
          aria-label={t("common.scrollLeft") || "Scroll Left"}
        >
          <ChevronLeft size={isSmall ? 22 : 24} strokeWidth={3} />
        </button>
      )}

      {showRight && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            scrollBy(300);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-0 top-[50%] -translate-y-1/2 z-[60] bg-black/80 hover:bg-black text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer pointer-events-none group-hover:pointer-events-auto shadow-2xl border border-white/10"
          aria-label={t("common.scrollRight") || "Scroll Right"}
        >
          <ChevronRight size={isSmall ? 22 : 24} strokeWidth={3} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className={containerClass}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {contents.map((movie) => (
          <div key={movie.id} className={itemClass}>
            <MovieCard movie={movie} user={user} />
          </div>
        ))}
      </div>
    </section>
  );
}
