import { useEffect, useRef } from "react";
import { useNavigationType } from "react-router-dom";

/**
 * Sayfa scroll konumunu sessionStorage üzerinden kaydeder ve geri yükler.
 * HomeView, MovieDetails, PersonDetails ve CategoryView'da tekrarlanan
 * scroll restoration mantığını tek bir hook'ta birleştirir.
 *
 * @param {string} key - sessionStorage anahtarı
 * @param {boolean} isReady - İçerik yüklenip yüklenmediği
 */
export default function useScrollRestoration(key, isReady) {
    const isRestoring = useRef(false);
    const scrollTimeout = useRef(null);
    const navType = useNavigationType();

    useEffect(() => {
        if (!isReady) return;

        // Sadece geri/ileri (POP) navigasyonunda pozisyonu geri yükle.
        if (navType === "POP") {
            const savedScroll = sessionStorage.getItem(key);
            if (savedScroll && parseInt(savedScroll, 10) > 0) {
                const targetScroll = parseInt(savedScroll, 10);
                isRestoring.current = true;
                
                let attempts = 0;
                const maxAttempts = 15; // ~250-500ms arası deneme süresi
                
                const tryScroll = () => {
                    const currentHeight = document.documentElement.scrollHeight;
                    const viewportHeight = window.innerHeight;
                    
                    // Eğer sayfa yüksekliği gidilecek konuma ulaştıysa veya maksimum denemeye ulaştıysak
                    if (currentHeight >= targetScroll + viewportHeight || attempts >= maxAttempts) {
                        window.scrollTo({ top: targetScroll, behavior: "instant" });
                        
                        // Son bir kez daha garanti olması için bir frame sonra
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
            // Sadece yeni bir sayfaya gidildiğinde (PUSH) eski veriyi sil.
            // REPLACE (örneğin filtre değişimi) durumunda silmiyoruz.
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
