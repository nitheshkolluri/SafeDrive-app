
import React, { useState, useEffect } from 'react';
import { Screen, User } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import RewardsScreen from './screens/RewardsScreen';
import SupportScreen from './screens/SupportScreen';
import CirclesScreen from './screens/CirclesScreen';
import BottomNav from './components/BottomNav';
import WelcomeScreen from './screens/WelcomeScreen';
import { signOut } from 'firebase/auth';
import { auth } from './utils/firebase';
import { userRepository } from './utils/userRepository';
import { NavigationProvider } from './context/NavigationContext';

const AppContent: React.FC = () => {
    const [activeScreen, setActiveScreen] = useState<Screen>('home');
    const [user, setUser] = useLocalStorage<User | null>('user', null);
    const [theme, setTheme] = useLocalStorage<'light'|'dark'>('theme', 'dark');

    // Apply Theme to DOM
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.style.colorScheme = 'dark';
        } else {
            root.classList.remove('dark');
            root.style.colorScheme = 'light';
        }
    }, [theme]);

    // Sync Theme from Remote User Profile on Login
    useEffect(() => {
        if (user?.theme) {
            if (user.theme !== theme) {
                setTheme(user.theme);
            }
        }
    }, [user?.id]); // Only run when user ID changes (login)

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        
        // Persist to Firebase if logged in
        if (user && user.id && !user.isGuest) {
            try {
                await userRepository.updateUser(user.id, { theme: newTheme });
                setUser({ ...user, theme: newTheme });
            } catch (e) {
                console.error("Failed to sync theme preference", e);
            }
        }
    };

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
        if (userData.theme) {
            setTheme(userData.theme);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.error("Logout error", e);
        }
        setUser(null);
        localStorage.removeItem('user-stats');
        localStorage.removeItem('recent-trips');
        localStorage.removeItem('last-trip');
    }

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
                    <div className="absolute inset-0 z-[70] bg-slate-50 dark:bg-dark-950 animate-fade-in-up overflow-hidden">
                        <SupportScreen onBack={() => setActiveScreen('profile')} />
                    </div>
                );
            case 'circles':
                return (
                    <div className="absolute inset-0 z-[60] bg-slate-50 dark:bg-dark-950 animate-fade-in-up overflow-hidden">
                        <CirclesScreen onBack={() => setActiveScreen('profile')} />
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
                <div className={`absolute inset-0 w-full h-full ${activeScreen === 'home' ? 'z-10 visible' : 'z-0 invisible'}`}>
                    <HomeScreen setActiveScreen={setActiveScreen} user={user!} theme={theme} toggleTheme={toggleTheme} />
                </div>
                {renderOverlay()}
            </main>
            
            {activeScreen !== 'support' && activeScreen !== 'circles' && (
                <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <NavigationProvider>
            <AppContent />
        </NavigationProvider>
    );
}

export default App;
