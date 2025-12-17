import React from 'react';
import type { Trip } from '../types';
import { formatDistance, formatDuration } from '../utils/helpers';
import { RouteIcon, ClockIcon, TrophyIcon, GaugeIcon } from './icons';

interface TripSummaryCardProps {
    trip: Trip;
    title?: string;
}

const TripSummaryCard: React.FC<TripSummaryCardProps> = ({ trip, title = "Trip Summary" }) => {
    return (
        <div className="p-4 bg-dark-800/50 rounded-2xl shadow-lg backdrop-blur-md border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                    <RouteIcon className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-300">Distance:</span>
                    <span className="font-bold text-white">{formatDistance(trip.distance)} km</span>
                </div>
                <div className="flex items-center space-x-2">
                    <ClockIcon className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-300">Duration:</span>
                    <span className="font-bold text-white">{formatDuration(trip.duration)}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <TrophyIcon className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-300">Points:</span>
                    <span className="font-bold text-white">{trip.points}</span>
                </div>
                 <div className="flex items-center space-x-2">
                    <GaugeIcon className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-300">Max Speed:</span>
                    <span className="font-bold text-white">{trip.maxSpeed.toFixed(0)} km/h</span>
                </div>
            </div>
             <p className="text-xs text-slate-500 mt-4">
                Completed on {new Date(trip.endTime).toLocaleDateString()} at {new Date(trip.endTime).toLocaleTimeString()}
            </p>
        </div>
    );
};

export default TripSummaryCard;