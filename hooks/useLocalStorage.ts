
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// Helper to safely stringify objects with circular references
const safeStringify = (value: any) => {
    const seen = new WeakSet();
    return JSON.stringify(value, (_key, val) => {
        if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
                return; // Discard circular reference
            }
            seen.add(val);
        }
        return val;
    });
};

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue: Dispatch<SetStateAction<T>> = (value) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            
            // Save state
            setStoredValue(valueToStore);
            
            // Save to local storage
            if (typeof window !== 'undefined') {
                try {
                    window.localStorage.setItem(key, safeStringify(valueToStore));
                } catch (writeError) {
                    console.error(`Error writing localStorage key "${key}":`, writeError);
                }
            }
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}
