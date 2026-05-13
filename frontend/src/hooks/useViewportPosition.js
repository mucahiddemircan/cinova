import { useState, useLayoutEffect } from "react";

/**
 * Bir elementin (menü/popover) ekran sınırlarına göre en uygun konumunu hesaplar.
 */
export default function useViewportPosition(triggerRef, offset = 8) {
    const [position, setPosition] = useState({ top: 0, left: 0, placement: "bottom-right" });

    useLayoutEffect(() => {
        if (!triggerRef.current) return;

        const updatePosition = () => {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Menü boyutlarını tahmin et (veya bir sonraki render'da ölç)
            // Şimdilik tetikleyiciye göre temel konumu belirleyelim
            let top = triggerRect.bottom + offset;
            let left = triggerRect.right;
            let placement = "bottom-right";

            // Yatay taşma kontrolü
            if (left + 260 > viewportWidth) { // 260px standart menü genişliği varsayımı
                left = triggerRect.left - 260;
                placement = "bottom-left";
            }

            // Dikey taşma kontrolü
            if (top + 300 > viewportHeight) { // 300px standart menü yüksekliği varsayımı
                top = triggerRect.top - offset - 300;
                if (placement === "bottom-right") placement = "top-right";
                else placement = "top-left";
            }

            setPosition({
                top: top + window.scrollY,
                left: Math.max(8, left + window.scrollX),
                placement
            });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition);
        };
    }, [triggerRef, offset]);

    return position;
}
