import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEO yönetimi için belirli sayfaların arama motorları tarafından 
 * indekslenmesini (noindex) veya takip edilmesini (nofollow) kontrol eder.
 */
export default function RobotsManager() {
    const location = useLocation();

    useEffect(() => {
        // İndekslenmemesi gereken yollar
        const NOINDEX_PATHS = [
            '/login',
            '/register',
            '/settings',
            '/search',
            '/complete-profile'
        ];

        // Dinamik kontroller (örn: /watch ile bitenler veya kullanıcı listeleri)
        const normalizedPath = location.pathname.startsWith('/tr') 
            ? location.pathname.replace(/^\/tr/, '') || '/' 
            : location.pathname;

        const isNoIndex = NOINDEX_PATHS.includes(normalizedPath) || 
                          normalizedPath.endsWith('/watch') || 
                          normalizedPath.endsWith('/comments');

        // Mevcut meta tag'i bul veya oluştur
        let metaRobots = document.querySelector('meta[name="robots"]');
        
        if (isNoIndex) {
            if (!metaRobots) {
                metaRobots = document.createElement('meta');
                metaRobots.name = 'robots';
                document.head.appendChild(metaRobots);
            }
            metaRobots.content = 'noindex, nofollow';
        } else {
            // Eğer noindex gerektirmeyen bir sayfadaysak ve meta tag varsa temizle
            // (Varsayılan olarak indexable kalsın)
            if (metaRobots) {
                metaRobots.content = 'index, follow';
            }
        }
    }, [location.pathname]);

    return null;
}
