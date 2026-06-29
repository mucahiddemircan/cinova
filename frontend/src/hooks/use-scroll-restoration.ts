import { useEffect, useRef } from "react";

/**
 * Saves and restores page scroll position via sessionStorage.
 * Next.js App Router compatible version — POP detection with popstate event.
 */
export default function useScrollRestoration(
  key: string,
  isReady: boolean
): void {
  const isRestoring = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPopNavigation = useRef(false);

  // Popstate (back/forward) detection
  useEffect(() => {
    const handlePopState = () => {
      isPopNavigation.current = true;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (isPopNavigation.current) {
      isPopNavigation.current = false;

      const savedScroll = sessionStorage.getItem(key);
      if (savedScroll && parseInt(savedScroll, 10) > 0) {
        const targetScroll = parseInt(savedScroll, 10);
        isRestoring.current = true;

        let attempts = 0;
        const maxAttempts = 15;

        const tryScroll = () => {
          const currentHeight = document.documentElement.scrollHeight;
          const viewportHeight = window.innerHeight;

          if (
            currentHeight >= targetScroll + viewportHeight ||
            attempts >= maxAttempts
          ) {
            window.scrollTo({ top: targetScroll, behavior: "instant" });

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
    } else {
      // Delete old scroll data on new navigation
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
  }, [key, isReady]);
}
