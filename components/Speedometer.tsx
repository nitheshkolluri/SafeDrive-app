
import React from 'react';
import { clamp } from '../utils/helpers';

interface SpeedometerProps {
    currentSpeed: number;
    speedLimit: number | null;
}

const Speedometer: React.FC<SpeedometerProps> = ({ currentSpeed, speedLimit }) => {
    const isSpeeding = speedLimit !== null && currentSpeed > speedLimit;
    const overLimit = speedLimit ? currentSpeed - speedLimit : 0;
    
    // Determine severity for visual feedback
    let severityColor = 'text-white';
    let ringColor = 'stroke-accent-400';
    let borderColor = 'border-slate-200 dark:border-white/10';
    
    if (isSpeeding) {
        if (overLimit > 20) { // Severe/Critical
            severityColor = 'text-red-600 animate-pulse';
            ringColor = 'stroke-red-600';
            borderColor = 'border-red-600';
        } else if (overLimit > 10) { // Moderate
            severityColor = 'text-orange-500';
            ringColor = 'stroke-orange-500';
            borderColor = 'border-orange-500';
        } else { // Minor
            severityColor = 'text-yellow-400';
            ringColor = 'stroke-yellow-400';
            borderColor = 'border-yellow-400';
        }
    }

    const maxDisplaySpeed = speedLimit ? Math.max(speedLimit + 30, 100) : 120;
    const speedRatio = clamp(currentSpeed / maxDisplaySpeed, 0, 1);

    const strokeWidth = 10;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - speedRatio * circumference * 0.75; // 0.75 for 270 degrees arc

    const gradientId = "speedo-gradient";

    return (
        <div className="relative flex flex-col items-center justify-center w-40 h-40">
            <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90 transform">
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                     <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                {/* Arc */}
                <circle
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx="80"
                    cy="80"
                    className="stroke-white/10"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - circumference * 0.75}
                    transform="rotate(135 80 80)"
                />
                {/* Progress */}
                <circle
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx="80"
                    cy="80"
                    className={`transition-all duration-300 ${isSpeeding ? ringColor : ''}`}
                    stroke={isSpeeding ? undefined : `url(#${gradientId})`}
                    filter={isSpeeding ? undefined : "url(#glow)"}
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset }}
                    transform="rotate(135 80 80)"
                />
                 {/* Speed Limit Marker */}
                {speedLimit !== null && (
                    <line
                        x1="80"
                        y1="20"
                        x2="80"
                        y2="8"
                        strokeWidth="4"
                        className="stroke-gray-500"
                        transform={`rotate(${(speedLimit / maxDisplaySpeed * 270) + 135} 80 80)`}
                    />
                )}
            </svg>
            <div className={`absolute w-24 h-24 rounded-full border-4 ${borderColor} flex flex-col items-center justify-center bg-white dark:bg-dark-900 transition-colors duration-300 shadow-2xl`}>
                <span className={`text-4xl font-black font-display ${severityColor}`}>{currentSpeed.toFixed(0)}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">km/h</span>
                {speedLimit !== null && (
                    <div className="absolute -bottom-6 bg-dark-900 rounded-full border border-white/20 px-3 py-1 shadow-lg">
                       <span className="text-xs font-bold text-gray-200">LIMIT {speedLimit}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Speedometer;
