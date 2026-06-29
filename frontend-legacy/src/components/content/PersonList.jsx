import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import PersonCard from "./PersonCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PersonList({ title, contents, to, state, basePath = "/actor", hideShowAll = false, noUnderline = false, user, restoreKey }) {
    const { t } = useLanguage();
    const scrollRef = useRef(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);

    const storageKey = restoreKey ? `person_scroll_${restoreKey}` : `person_scroll_${title}`;

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

    const scrollBy = (amount) => {
        scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
    };

    if (!contents || contents.length === 0) return null;

    return (
        <section className="mb-10 group relative">
            <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl font-bold text-text-primary">
                    {to ? (
                        <Link to={to} state={state} className={`cursor-pointer decoration-white ${noUnderline ? '' : 'hover:underline'}`}>
                            {title}
                        </Link>
                    ) : (
                        <span className="decoration-white cursor-default">
                            {title}
                        </span>
                    )}
                </h2>
                {!hideShowAll && to && (
                    <Link to={to} state={state} className="hidden md:block text-sm text-text-secondary hover:text-text-primary hover:underline cursor-pointer font-medium tracking-wide transition-colors decoration-white">
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
                    className="absolute left-0 top-[60%] -translate-y-1/2 z-[60] bg-black/60 hover:bg-black/80 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer pointer-events-none group-hover:pointer-events-auto shadow-xl border border-white/5"
                    aria-label={t("common.scrollLeft") || "Scroll Left"}
                >
                    <ChevronLeft size={24} strokeWidth={2.5} />
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
                    className="absolute right-0 top-[60%] -translate-y-1/2 z-[60] bg-black/60 hover:bg-black/80 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer pointer-events-none group-hover:pointer-events-auto shadow-xl border border-white/5"
                    aria-label={t("common.scrollRight") || "Scroll Right"}
                >
                    <ChevronRight size={24} strokeWidth={2.5} />
                </button>
            )}

            <div
                ref={scrollRef}
                onScroll={updateArrows}
                className="flex overflow-x-auto pb-4 pt-2 scroll-smooth touch-pan-y hide-scrollbar -ml-6 pl-6 -mr-6 md:ml-0 md:pl-0 md:mr-0"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {contents.map((person) => (
                    <div key={person.id} className="min-w-[120px] w-[25vw] sm:min-w-[150px] md:w-[calc(100%/9)] flex-none">
                        <PersonCard person={person} basePath={basePath} user={user} />
                    </div>
                ))}
            </div>
        </section>
    );
}
