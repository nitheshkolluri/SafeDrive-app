import React from 'react';
import type { Screen } from '../types';
import { HomeIcon, UserIcon, TrophyIcon } from './icons';
import { useNavigation } from '../context/NavigationContext';

interface BottomNavProps {
    activeScreen: Screen;
    setActiveScreen: (screen: Screen) => void;
}

const NavItem: React.FC<{
    label: string;
    Icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
    activeColor: string;
}> = ({ label, Icon, isActive, onClick, activeColor }) => {
    return (
        <button
            onClick={onClick}
            className="group relative flex flex-1 flex-col items-center justify-center h-full transition-all duration-300 outline-none tap-highlight-transparent"
        >
            <div className={`absolute top-0 w-12 h-1 bg-gradient-to-r from-transparent via-${activeColor} to-transparent blur-[2px] transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
            
            <div className={`relative p-2 rounded-2xl transition-all duration-300 transform ${isActive ? '-translate-y-1' : 'group-hover:scale-110'}`}>
                <div className={`absolute inset-0 bg-${activeColor}/30 blur-xl rounded-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                
                <Icon 
                    className={`w-7 h-7 transition-all duration-300 ${isActive ? `text-${activeColor} drop-shadow-[0_0_8px_rgba(var(--${activeColor}-rgb),0.5)]` : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} 
                    fill={isActive}
                />
            </div>
            
            <span className={`text-[10px] font-bold tracking-widest uppercase transition-all duration-300 transform ${isActive ? `text-${activeColor} translate-y-0 opacity-100` : 'text-slate-500 translate-y-2 opacity-0'}`}>
                {label}
            </span>
        </button>
    );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen }) => {
    const { navigationActive } = useNavigation();

    return (
        <nav 
            className={`fixed bottom-0 left-0 right-0 z-[60] pointer-events-none pb-safe transition-transform duration-500 ease-in-out ${navigationActive ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
        >
            {/* Gradient Fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent dark:from-dark-950 dark:via-dark-950/90 h-48 bottom-0 pointer-events-none transition-colors duration-500" />
            
            {/* Floating Glass Dock */}
            <div className="relative pointer-events-auto mx-4 mb-4 sm:mx-auto sm:max-w-md">
                <div className="bg-white/80 dark:bg-dark-950/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex justify-between items-center h-[88px] px-6 overflow-hidden relative ring-1 ring-black/5 dark:ring-white/5 transition-colors duration-500">
                    
                    {/* Glass Shine */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent opacity-50" />
                    
                    <NavItem 
                        label="Rewards" 
                        Icon={TrophyIcon} 
                        isActive={activeScreen === 'rewards'} 
                        onClick={() => setActiveScreen('rewards')}
                        activeColor="yellow-400"
                    />
                    
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/5 mx-2" />
                    
                    <NavItem 
                        label="Drive" 
                        Icon={HomeIcon} 
                        isActive={activeScreen === 'home'} 
                        onClick={() => setActiveScreen('home')}
                        activeColor="brand-cyan"
                    />

                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/5 mx-2" />

                    <NavItem 
                        label="Profile" 
                        Icon={UserIcon} 
                        isActive={activeScreen === 'profile'} 
                        onClick={() => setActiveScreen('profile')}
                        activeColor="brand-purple"
                    />
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;