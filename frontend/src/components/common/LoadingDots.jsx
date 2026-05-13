import React from 'react';

/**
 * Üç noktadan oluşan animasyonlu yükleme bileşeni.
 * "Yükleniyor..." metni yerine görsel bir deneyim sunar.
 * 
 * @param {string} className Ek CSS sınıfları
 * @param {string} size Nokta boyutu (xs, sm, md, lg)
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
