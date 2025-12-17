import { useEffect, useRef, useState, useCallback } from 'react';

export const useWakeLock = (enabled: boolean) => {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const [error, setError] = useState<string | null>(null);

    const requestWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                wakeLockRef.current.addEventListener('release', () => {
                    // console.log('Wake Lock released');
                });
                // console.log('Wake Lock acquired');
                setError(null);
            } catch (err: any) {
                // Suppress the specific NotAllowedError to avoid console noise, 
                // but store it in state if needed for UI feedback.
                if (err.name !== 'NotAllowedError') {
                    console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
                }
                setError(err.message);
            }
        } else {
            // console.warn("Wake Lock API not supported in this browser.");
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err: any) {
                console.error(`Wake Lock release failed: ${err.name}, ${err.message}`);
            }
        }
    }, []);

    // Initial Request Effect
    useEffect(() => {
        if (enabled) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        return () => {
            releaseWakeLock();
        };
    }, [enabled, requestWakeLock, releaseWakeLock]);

    // Re-acquire on visibility change (tab switch)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, requestWakeLock]);

    // Retry on user interaction if previously failed (Policy requirement)
    useEffect(() => {
        const handleInteraction = () => {
            if (enabled && !wakeLockRef.current) {
                requestWakeLock();
            }
        };

        if (enabled && error) {
            window.addEventListener('click', handleInteraction, { once: true });
            window.addEventListener('touchstart', handleInteraction, { once: true });
        }

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, [enabled, error, requestWakeLock]);

    return { error };
};