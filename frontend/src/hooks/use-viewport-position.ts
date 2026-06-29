import { useState, useLayoutEffect, type RefObject } from "react";

interface Position {
  top: number;
  left: number;
  placement: string;
}

/**
 * Calculates the most suitable position of an element based on viewport boundaries.
 */
export default function useViewportPosition(
  triggerRef: RefObject<HTMLElement | null>,
  offset = 8
): Position {
  const [position, setPosition] = useState<Position>({
    top: 0,
    left: 0,
    placement: "bottom-right",
  });

  useLayoutEffect(() => {
    if (!triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = triggerRect.bottom + offset;
      let left = triggerRect.right;
      let placement = "bottom-right";

      // Horizontal overflow check
      if (left + 260 > viewportWidth) {
        left = triggerRect.left - 260;
        placement = "bottom-left";
      }

      // Vertical overflow check
      if (top + 300 > viewportHeight) {
        top = triggerRect.top - offset - 300;
        if (placement === "bottom-right") placement = "top-right";
        else placement = "top-left";
      }

      setPosition({
        top: top + window.scrollY,
        left: Math.max(8, left + window.scrollX),
        placement,
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
