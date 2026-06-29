import { useState, useLayoutEffect } from "react";

/**
 * Calculates the most suitable position of an element (menu/popover) based on viewport boundaries.
 */
export default function useViewportPosition(triggerRef, offset = 8) {
    const [position, setPosition] = useState({ top: 0, left: 0, placement: "bottom-right" });

    useLayoutEffect(() => {
        if (!triggerRef.current) return;

        const updatePosition = () => {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Estimate menu dimensions (or measure on next render)
            // Let's determine the base position based on trigger for now
            let top = triggerRect.bottom + offset;
            let left = triggerRect.right;
            let placement = "bottom-right";

            // Horizontal overflow check
            if (left + 260 > viewportWidth) { // 260px standard menu width assumption
                left = triggerRect.left - 260;
                placement = "bottom-left";
            }

            // Vertical overflow check
            if (top + 300 > viewportHeight) { // 300px standard menu height assumption
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
