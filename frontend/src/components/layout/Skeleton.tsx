"use client";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "shimmer";
}

export default function Skeleton({
  className = "",
  variant = "default",
}: SkeletonProps) {
  const variants = {
    default: "bg-white/5",
    shimmer:
      "bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer",
  };

  return (
    <div
      className={`rounded ${variants[variant] || variants.default} ${className}`}
    />
  );
}
