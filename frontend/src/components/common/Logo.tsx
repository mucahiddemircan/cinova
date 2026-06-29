import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "w-8 h-8", size }: LogoProps) {
  const style = size ? { width: size, height: size } : undefined;
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={`${className} flex-shrink-0`}
      style={style}
    >
      <path
        d="M38 12.5C34.7 8.5 29.7 6 24 6C14.06 6 6 14.06 6 24C6 33.94 14.06 42 24 42C29.7 42 34.7 39.5 38 35.5"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 17.5L32 24L20 30.5V17.5Z" fill="currentColor" />
    </svg>
  );
}
