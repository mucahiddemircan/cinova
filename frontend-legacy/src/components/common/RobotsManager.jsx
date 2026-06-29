import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Controls search engine indexing (noindex) or following (nofollow)
 * of specific pages for SEO management.
 */
export default function RobotsManager() {
    const location = useLocation();

    useEffect(() => {
        // Paths that should not be indexed
        const NOINDEX_PATHS = [
            '/login',
            '/register',
            '/settings',
            '/search',
            '/complete-profile'
        ];

        // Dynamic checks (e.g. ending with /watch or user lists)
        const normalizedPath = location.pathname.startsWith('/tr') 
            ? location.pathname.replace(/^\/tr/, '') || '/' 
            : location.pathname;

        const isNoIndex = NOINDEX_PATHS.includes(normalizedPath) || 
                          normalizedPath.endsWith('/watch') || 
                          normalizedPath.endsWith('/comments');

        // Find or create current meta tag
        let metaRobots = document.querySelector('meta[name="robots"]');
        
        if (isNoIndex) {
            if (!metaRobots) {
                metaRobots = document.createElement('meta');
                metaRobots.name = 'robots';
                document.head.appendChild(metaRobots);
            }
            metaRobots.content = 'noindex, nofollow';
        } else {
            // If we are on a page that does not require noindex and meta tag exists, clean it up
            // (Keep indexable by default)
            if (metaRobots) {
                metaRobots.content = 'index, follow';
            }
        }
    }, [location.pathname]);

    return null;
}
