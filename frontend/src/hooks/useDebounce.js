import { useState, useEffect } from 'react';

/**
 * Bir değerin değişimini belirli bir süre (delay) geciktirir.
 * Filtreleme gibi hızlı değişen girdilerde API isteğini sınırlamak için kullanılır.
 * 
 * @param {any} value - Takip edilecek değer.
 * @param {number} delay - Gecikme süresi (ms).
 * @returns {any} - Geciktirilmiş değer.
 */
export default function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
