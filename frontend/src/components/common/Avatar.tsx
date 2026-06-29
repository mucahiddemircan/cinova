"use client";

import { memo } from "react";
import PlaceholderImage from "./PlaceholderImage";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | string;
  type?: "profile" | "person";
  className?: string;
  showBorder?: boolean;
  borderColor?: "default" | "brand" | "white";
}

/**
 * Standard avatar/profile picture component used application-wide.
 */
function Avatar({
  src,
  alt = "Avatar",
  size = "md",
  type = "profile",
  className = "",
  showBorder = true,
  borderColor = "default",
}: AvatarProps) {
  // Standard size mappings
  const sizeMap: Record<string, string> = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-32 h-32",
    "2xl": "w-40 h-40 lg:w-52 lg:h-52",
  };

  const borderMap: Record<string, string> = {
    default: "border-white/5",
    brand: "border-brand/20",
    white: "border-white/10",
  };

  const resolvedSize = sizeMap[size] || size;
  const resolvedBorder = showBorder
    ? borderMap[borderColor] || borderMap.default
    : "border-transparent";

  // Calculate icon size (about 50% of size)
  const getIconSize = () => {
    if (size === "xs") return 12;
    if (size === "sm") return 16;
    if (size === "md") return 20;
    if (size === "lg") return 24;
    if (size === "xl") return 60;
    if (size === "2xl") return 80;
    return 20;
  };

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-bg-surface-hover transition-all duration-300 relative group/avatar ${resolvedSize} ${
        showBorder ? "border" : ""
      } ${resolvedBorder} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <PlaceholderImage type={type} iconSize={getIconSize()} />
      )}

      {/* Hover overlay - slight darkening */}
      <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/20 transition-colors duration-300 pointer-events-none" />
    </div>
  );
}

export default memo(Avatar);
