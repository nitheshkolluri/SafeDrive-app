import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavigationContextType {
    navigationActive: boolean;
    navigationPaused: boolean;
    isFullscreen: boolean;
    enterNavigation: () => void;
    pauseNavigation: () => void;
    resumeNavigation: () => void;
    exitNavigation: () => void;
    setFullscreen: (fullscreen: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType>({
    navigationActive: false,
    navigationPaused: false,
    isFullscreen: false,
    enterNavigation: () => {},
    pauseNavigation: () => {},
    resumeNavigation: () => {},
    exitNavigation: () => {},
    setFullscreen: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [navigationActive, setNavigationActive] = useState(false);
    const [navigationPaused, setNavigationPaused] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const enterNavigation = useCallback(() => {
        setNavigationActive(true);
        setNavigationPaused(false);
        setIsFullscreen(true);
    }, []);

    const pauseNavigation = useCallback(() => {
        setNavigationPaused(true);
        // Note: We intentionally do NOT exit fullscreen or show bottom nav on pause
        // per requirements ("only if user explicitly taps Exit Navigation")
    }, []);

    const resumeNavigation = useCallback(() => {
        setNavigationPaused(false);
        setIsFullscreen(true);
    }, []);

    const exitNavigation = useCallback(() => {
        setNavigationActive(false);
        setNavigationPaused(false);
        setIsFullscreen(false);
    }, []);

    const setFullscreen = useCallback((state: boolean) => {
        setIsFullscreen(state);
    }, []);

    return (
        <NavigationContext.Provider value={{
            navigationActive,
            navigationPaused,
            isFullscreen,
            enterNavigation,
            pauseNavigation,
            resumeNavigation,
            exitNavigation,
            setFullscreen
        }}>
            {children}
        </NavigationContext.Provider>
    );
};