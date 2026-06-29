import { useEffect, useRef } from "react";
import { useNavigationType } from "react-router-dom";

/**
 * Saves and restores page scroll position via sessionStorage.
 * Combines scroll restoration logic repeated in HomeView,
 * MovieDetails, PersonDetails, and CategoryView into a single hook.
 *
 * @param {string} key - sessionStorage key
 * @param {boolean} isReady - Whether content is loaded
 */
export default function useScrollRestoration(key, isReady) {
    const isRestoring = useRef(false);
    const scrollTimeout = useRef(null);
    const navType = useNavigationType();

    useEffect(() => {
        if (!isReady) return;

        // Restore position only in back/forward (POP) navigation.
        if (navType === "POP") {
            const savedScroll = sessionStorage.getItem(key);
            if (savedScroll && parseInt(savedScroll, 10) > 0) {
                const targetScroll = parseInt(savedScroll, 10);
                isRestoring.current = true;
                
                let attempts = 0;
                const maxAttempts = 15; // ~250-500ms trial duration
                
                const tryScroll = () => {
                    const currentHeight = document.documentElement.scrollHeight;
                    const viewportHeight = window.innerHeight;
                    
                    // If page height has reached target position or max trials reached
                    if (currentHeight >= targetScroll + viewportHeight || attempts >= maxAttempts) {
                        window.scrollTo({ top: targetScroll, behavior: "instant" });
                        
                        // One last frame later to guarantee
                        requestAnimationFrame(() => {
                            window.scrollTo({ top: targetScroll, behavior: "instant" });
                            isRestoring.current = false;
                        });
                    } else {
                        attempts++;
                        requestAnimationFrame(tryScroll);
                    }
                };
                
                requestAnimationFrame(tryScroll);
            }
        } else if (navType === "PUSH") {
            // Delete old data only when navigating to a new page (PUSH).
            // We don't delete on REPLACE (e.g. filter change).
            sessionStorage.removeItem(key);
        }

        const handleScroll = () => {
            if (isRestoring.current) return;
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => {
                sessionStorage.setItem(key, window.scrollY.toString());
            }, 100);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, [key, isReady, navType]);
}
