
import React, { useState, useRef } from 'react';
import { CrosshairIcon } from './icons';

interface RecenterFabProps {
    isVisible: boolean;
    onClick: () => void;
    onModeSelect?: (mode: 'follow' | 'north') => void;
    disabled?: boolean;
}

const RecenterFab: React.FC<RecenterFabProps> = ({ isVisible, onClick, onModeSelect, disabled }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isPressed, setIsPressed] = useState(false);

    const handlePressStart = () => {
        setIsPressed(true);
        longPressTimerRef.current = setTimeout(() => {
            setIsMenuOpen(true);
            if ('vibrate' in navigator) navigator.vibrate(50);
        }, 600);
    };

    const handlePressEnd = () => {
        setIsPressed(false);
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        // Only trigger click if menu didn't open
        if (!isMenuOpen) {
            onClick();
        }
    };

    const handleModeClick = (mode: 'follow' | 'north') => {
        if (onModeSelect) onModeSelect(mode);
        setIsMenuOpen(false);
        onClick(); // Also trigger recenter
    };

    // Force visibility if menu is open
    const show = isVisible || isMenuOpen;

    return (
        <div className={`absolute bottom-32 right-4 z-[2000] flex flex-col items-end pointer-events-auto transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
            {/* Long Press Menu */}
            {isMenuOpen && (
                <div className="mb-2 bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up flex flex-col min-w-[140px]">
                    <button onClick={() => handleModeClick('follow')} className="px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/10 flex items-center border-b border-white/5">
                        <span className="mr-2">📍</span> Follow
                    </button>
                    <button onClick={() => handleModeClick('north')} className="px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/10 flex items-center border-b border-white/5">
                        <span className="mr-2">⬆️</span> North Up
                    </button>
                    <button onClick={() => setIsMenuOpen(false)} className="px-4 py-3 text-center text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider">
                        Close
                    </button>
                </div>
            )}

            {/* Main FAB */}
            <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                disabled={disabled}
                aria-label="Recenter Map"
                className={`
                    w-14 h-14 rounded-full flex items-center justify-center 
                    bg-white dark:bg-dark-900 
                    border-2 ${isMenuOpen ? 'border-brand-purple' : 'border-slate-100 dark:border-brand-cyan/30'}
                    shadow-[0_8px_30px_rgba(0,0,0,0.2)] dark:shadow-[0_0_20px_rgba(6,182,212,0.2)]
                    transition-all duration-200 
                    ${isPressed ? 'scale-90' : 'scale-100'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                `}
            >
                <CrosshairIcon className={`w-6 h-6 ${isMenuOpen ? 'text-brand-purple' : 'text-slate-700 dark:text-brand-cyan'}`} />
            </button>
            
            {/* Context Label */}
            {isVisible && !isMenuOpen && (
                <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 animate-[fadeIn_0.5s_delay-0.2s_forwards] border border-white/10 shadow-lg pointer-events-none">
                    Re-Center
                </div>
            )}
        </div>
    );
};

export default RecenterFab;
