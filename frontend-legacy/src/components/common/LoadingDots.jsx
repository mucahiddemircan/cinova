import React from 'react';

/**
 * Animated three-dot loading component.
 * Provides a visual experience instead of "Loading..." text.
 * 
 * @param {string} className Additional CSS classes
 * @param {string} size Dot size (xs, sm, md, lg)
 */
export default function LoadingDots({ className = "", size = "md" }) {
    const sizeClasses = {
        xs: "w-1 h-1",
        sm: "w-1.5 h-1.5",
        md: "w-2 h-2",
        lg: "w-3 h-3"
    };

    const dotSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className={`flex items-center gap-1.5 justify-center ${className}`}>
            <div className={`${dotSize} bg-current rounded-full animate-bounce [animation-delay:-0.3s] opacity-60`}></div>
            <div className={`${dotSize} bg-current rounded-full animate-bounce [animation-delay:-0.15s] opacity-80`}></div>
            <div className={`${dotSize} bg-current rounded-full animate-bounce opacity-100`}></div>
        </div>
    );
}
