import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Sayfa değişimlerinde scroll pozisyonunu manuel yöneten bileşen.
 * Spotify ve diğer üst düzey uygulamaların davranışını simüle eder.
 */
export default function ScrollToTop() {
    const { pathname, key } = useLocation();
    const navType = useNavigationType();
    
    const scrollPositions = useRef({});

    useEffect(() => {
        // Tarayıcının reload sonrası kaldığı yerden devam etme özelliğini kapatır
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        // İlk açılışta veya reload sonrası (dil değişimi dahil) en üste git
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
            // Yeni bir link tıklaması veya dil değişimi sonrası yönlendirme: SIFIRLA
            window.scrollTo(0, 0);
        } else if (navType === "POP") {
            // Geri tuşu: Eğer kaydedilmiş bir pozisyon varsa oraya git
            const savedPosition = scrollPositions.current[key];
            if (savedPosition !== undefined) {
                window.scrollTo(0, savedPosition);
            }
        }
    }, [pathname, key, navType]);

    return null;
}
