import { useState, useEffect } from 'react';

/**
 * Debounces a value change for a specified duration (delay).
 * Used to limit API requests in fast-changing inputs like filtering.
 * 
 * @param {any} value - Value to follow.
 * @param {number} delay - Delay duration (ms).
 * @returns {any} - Debounced value.
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
