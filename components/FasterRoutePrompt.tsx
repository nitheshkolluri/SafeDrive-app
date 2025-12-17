import React from 'react';
import type { Route } from '../types';
import { ClockIcon } from './icons';

interface FasterRoutePromptProps {
    currentRoute: Route;
    newRoute: Route;
    onAccept: () => void;
    onDecline: () => void;
}

const FasterRoutePrompt: React.FC<FasterRoutePromptProps> = ({ currentRoute, newRoute, onAccept, onDecline }) => {
    const timeSavedMinutes = Math.round((currentRoute.summary.totalTime - newRoute.summary.totalTime) / 60);
    
    if (timeSavedMinutes <= 0) return null;

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[4000] w-full max-w-md p-4">
            <div className="bg-dark-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-accent-500/20 rounded-full">
                        <ClockIcon className="w-6 h-6 text-accent-400" />
                    </div>
                    <div>
                        <p className="font-bold text-white">Faster route available</p>
                        <p className="text-sm text-accent-300">Save approx. {timeSavedMinutes} min</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={onDecline} className="px-4 py-2 text-xs font-semibold text-gray-300 bg-white/10 rounded-full hover:bg-white/20">
                        Decline
                    </button>
                    <button onClick={onAccept} className="px-4 py-2 text-xs font-bold text-white bg-gradient-aurora rounded-full hover:scale-105 transition-transform">
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FasterRoutePrompt;