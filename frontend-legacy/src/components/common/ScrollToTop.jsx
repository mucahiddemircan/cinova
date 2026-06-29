import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Component that manually manages scroll position on page changes.
 * Simulates the behavior of Spotify and other premium applications.
 */
export default function ScrollToTop() {
    const { pathname, key } = useLocation();
    const navType = useNavigationType();
    
    const scrollPositions = useRef({});

    useEffect(() => {
        // Disables browser's default scroll restoration after reload
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        // Go to top on initial load or after reload (including language change)
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            scrollPositions.current[key] = window.scrollY;
        };
        
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [key]);

    useEffect(() => {
        if (navType === "PUSH" || navType === "REPLACE") {
            // Redirection after new link click or language change: RESET
            window.scrollTo(0, 0);
        } else if (navType === "POP") {
            // Back button: If a saved position exists, go there
            const savedPosition = scrollPositions.current[key];
            if (savedPosition !== undefined) {
                window.scrollTo(0, savedPosition);
            }
        }
    }, [pathname, key, navType]);

    return null;
}
