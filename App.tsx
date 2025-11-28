import React, { useState, useEffect } from 'react';
import { Screen, User } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import RewardsScreen from './screens/RewardsScreen';
import SupportScreen from './screens/SupportScreen';
import BottomNav from './components/BottomNav';
import WelcomeScreen from './screens/WelcomeScreen';

const App: React.FC = () => {
    const [activeScreen, setActiveScreen] = useState<Screen>('home');
    const [user, setUser] = useLocalStorage<User | null>('user', null);
    const [theme, setTheme] = useLocalStorage<'light'|'dark'>('theme', 'dark');

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    // Dynamic Viewport Height Fix for Mobile Browsers
    useEffect(() => {
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        setVH();
        window.addEventListener('resize', setVH);
        return () => window.removeEventListener('resize', setVH);
    }, []);
    
    const handleLogin = (userData: User) => {
        setUser(userData);
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user-stats');
        localStorage.removeItem('recent-trips');
        localStorage.removeItem('last-trip');
    }

    // Render other screens as overlays to keep HomeScreen mounted
    const renderOverlay = () => {
        switch (activeScreen) {
            case 'profile':
                return (
                    <div className="absolute inset-0 z-50 bg-slate-50 dark:bg-dark-950 animate-fade-in-up overflow-y-auto pb-safe">
                        <ProfileScreen 
                            setActiveScreen={setActiveScreen} 
                            user={user!} 
                            onUpdateUser={setUser} 
                            onLogout={handleLogout}
                            theme={theme}
                            toggleTheme={toggleTheme}
                        />
                    </div>
                );
            case 'rewards':
                return (
                    <div className="absolute inset-0 z-50 bg-slate-50 dark:bg-dark-950 animate-fade-in-up overflow-y-auto pb-safe">
                        <RewardsScreen />
                    </div>
                );
            case 'support':
                return (
                    // z-[70] to ensure it covers BottomNav (z-[60])
                    // Removed pb-safe here because SupportScreen handles its own bottom input spacing
                    <div className="absolute inset-0 z-[70] bg-slate-50 dark:bg-dark-950 animate-fade-in-up overflow-hidden">
                        <SupportScreen onBack={() => setActiveScreen('profile')} />
                    </div>
                );
            default:
                return null;
        }
    };
    
    if (!user) {
        return <WelcomeScreen onLogin={handleLogin} />;
    }
    
    return (
        <div className="relative w-full h-[100dvh] font-sans bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white transition-colors duration-500 flex flex-col overflow-hidden">
            <main className="flex-1 relative w-full h-full overflow-hidden">
                {/* HomeScreen is ALWAYS rendered to persist Map and Trip state. 
                    We hide it visually using visibility/z-index when not active, 
                    but keep it mounted so hooks run. */}
                <div className={`absolute inset-0 w-full h-full ${activeScreen === 'home' ? 'z-10 visible' : 'z-0 invisible'}`}>
                    <HomeScreen setActiveScreen={setActiveScreen} user={user!} theme={theme} toggleTheme={toggleTheme} />
                </div>

                {/* Other screens overlay the map */}
                {renderOverlay()}
            </main>
            
            {/* Hide BottomNav when on Support screen to prevent overlap with input */}
            {activeScreen !== 'support' && (
                <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
            )}
        </div>
    );
};

export default App;