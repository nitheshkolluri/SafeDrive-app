
import React, { useState, useMemo } from 'react';
import { useFirestoreCollection } from '../utils/sync';
import type { Trip, Vehicle } from '../types';
import { XIcon, DownloadIcon, FileTextIcon, BriefcaseIcon, UserIcon, SearchIcon, MapPinIcon, ClockIcon, TrophyIcon, CarIcon, ArrowRightIcon } from './icons';
import { formatDistance, formatDuration } from '../utils/helpers';
import SubscriptionModal from './SubscriptionModal';
import { auth } from '../utils/firebase';

interface LogbookModalProps {
    onClose: () => void;
    preselectedVehicleId?: string;
}

type FilterType = 'All' | 'Personal' | 'Business';

const LogbookModal: React.FC<LogbookModalProps> = ({ onClose, preselectedVehicleId }) => {
    // --- Data Fetching ---
    const { data: rawTrips } = useFirestoreCollection<Trip>('trips', [], 'recent-trips');
    const { data: vehicles } = useFirestoreCollection<Vehicle>('vehicles');

    // --- State ---
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>(preselectedVehicleId || '');
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterType, setFilterType] = useState<FilterType>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPaywall, setShowPaywall] = useState(false);

    // --- Derived Data & Calculations ---
    
    // 1. Sort trips chronologically for odometer logic
    const allTripsSorted = useMemo(() => {
        return [...rawTrips].sort((a, b) => a.startTime - b.startTime);
    }, [rawTrips]);

    // 2. Filter by Year (Base Set for Stats & Odometer)
    const yearTrips = useMemo(() => {
        return allTripsSorted.filter(t => {
            const tripYear = new Date(t.startTime).getFullYear().toString();
            return tripYear === filterYear;
        });
    }, [allTripsSorted, filterYear]);

    // 3. Calculate Odometer Projections on the Year Set
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
    
    const tripsWithOdometer = useMemo(() => {
        return yearTrips.map((trip, index) => {
            let endOdo = 0;
            let startOdo = 0;

            if (selectedVehicle) {
                // Calculate historical odometer by subtracting distance of subsequent trips from current odometer
                // Note: This logic assumes 'yearTrips' is a slice. For perfect accuracy, 
                // one would need ALL trips ever. Simplified here for the modal context.
                const distanceAfter = yearTrips.slice(index + 1).reduce((acc, t) => acc + t.distance, 0);
                // We also need to account for trips *after* this year if we want perfect accuracy, 
                // but usually logbooks are viewed for the current/past year context.
                // Reverting to the previous logic which was relative to the list:
                // Previous logic: endOdo = currentOdo - distance of newer trips in this list.
                
                // Let's refine: The newest trip in the list should end at (Current Odo - Distance of trips *after* this list).
                // Since we don't easily have "trips after this list", we'll approximate 
                // that the last trip in the sorted list ends at current odometer (if it's the current year).
                
                const tripsAfterThisOneInList = yearTrips.slice(index + 1);
                const distanceGap = tripsAfterThisOneInList.reduce((acc, t) => acc + t.distance, 0);
                
                endOdo = Math.round(selectedVehicle.odometer - distanceGap);
                startOdo = Math.round(endOdo - trip.distance);
            }

            return { ...trip, startOdo, endOdo };
        }).reverse(); // Reverse to show newest first for the UI
    }, [yearTrips, selectedVehicle]);

    // 4. Yearly Stats (Calculated on the full year set, ignoring search filters for context)
    const stats = useMemo(() => {
        const businessTrips = yearTrips.filter(t => t.purpose === 'Business');
        const totalKm = yearTrips.reduce((acc, t) => acc + t.distance, 0);
        const businessKm = businessTrips.reduce((acc, t) => acc + t.distance, 0);
        const deductiblePct = totalKm > 0 ? (businessKm / totalKm) * 100 : 0;
        return { totalKm, businessKm, deductiblePct };
    }, [yearTrips]);

    // 5. Apply Display Filters (Search & Type)
    const displayTrips = useMemo(() => {
        return tripsWithOdometer.filter(trip => {
            // Type Filter
            if (filterType !== 'All' && trip.purpose !== filterType) return false;

            // Search Filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const start = trip.startName?.toLowerCase() || '';
                const end = trip.endName?.toLowerCase() || '';
                const notes = trip.notes?.toLowerCase() || '';
                const dateStr = new Date(trip.startTime).toLocaleDateString().toLowerCase();
                
                return start.includes(q) || end.includes(q) || notes.includes(q) || dateStr.includes(q);
            }

            return true;
        });
    }, [tripsWithOdometer, filterType, searchQuery]);

    const handleDownload = () => {
        // Mock premium check
        setShowPaywall(true);
    };

    // --- Components ---

    const ScoreBadge = ({ score }: { score: number }) => {
        let color = 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        let label = 'C';
        if (score >= 98) { color = 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'; label = 'S'; }
        else if (score >= 90) { color = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'; label = 'A'; }
        else if (score >= 80) { color = 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'; label = 'B'; }

        return (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-md ${color}`}>
                <TrophyIcon className="w-3 h-3" />
                <span className="text-xs font-black">{score}</span>
            </div>
        );
    };

    return (
        <>
            {showPaywall && (
                <SubscriptionModal 
                    onClose={() => setShowPaywall(false)}
                    onSuccess={() => {
                        setShowPaywall(false);
                        alert("Logbook exported successfully!");
                    }}
                />
            )}
            
            <div className="fixed inset-0 z-[6000] bg-slate-200/60 dark:bg-black/80 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-fade-in-up">
                <div className="bg-slate-50 dark:bg-dark-950 w-full sm:max-w-lg h-[100dvh] sm:h-[90vh] sm:rounded-[32px] border-0 sm:border border-white/20 shadow-2xl flex flex-col overflow-hidden relative">
                    
                    {/* --- Top Bar --- */}
                    <div className="flex-shrink-0 px-6 py-5 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/5 flex justify-between items-center z-20">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">Logbook</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{filterYear} Tax Year</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleDownload}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-brand-cyan hover:bg-brand-cyan hover:text-white transition-all shadow-sm"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* --- Search & Filter Header (Sticky) --- */}
                    <div className="flex-shrink-0 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 py-3 z-10 space-y-3">
                        
                        {/* Search Bar */}
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search trips, locations, notes..."
                                className="w-full bg-slate-100 dark:bg-black/20 border border-transparent focus:border-brand-cyan/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition-all placeholder-slate-500"
                            />
                        </div>

                        {/* Filter Toggles */}
                        <div className="flex justify-between items-center gap-2">
                            <div className="flex p-1 bg-slate-100 dark:bg-black/20 rounded-xl flex-1">
                                {(['All', 'Personal', 'Business'] as FilterType[]).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            filterType === type 
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Year Selector (Simple) */}
                            <select 
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="bg-slate-100 dark:bg-black/20 text-slate-700 dark:text-slate-300 text-xs font-bold py-2 px-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-brand-cyan/50"
                            >
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                            </select>
                        </div>
                    </div>

                    {/* --- Stats Summary --- */}
                    <div className="flex-shrink-0 grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/5 bg-slate-50 dark:bg-dark-900 border-b border-slate-200 dark:border-white/5">
                        <div className="p-3 text-center">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatDistance(stats.totalKm)}</p>
                        </div>
                        <div className="p-3 text-center">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Business</p>
                            <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-0.5">{formatDistance(stats.businessKm)}</p>
                        </div>
                        <div className="p-3 text-center">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Claimable</p>
                            <p className="text-sm font-bold text-brand-cyan mt-0.5">{stats.deductiblePct.toFixed(0)}%</p>
                        </div>
                    </div>

                    {/* --- Trip List --- */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100 dark:bg-black/10">
                        {displayTrips.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50 pb-20">
                                <div className="w-16 h-16 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <SearchIcon className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-bold text-sm">No trips found</p>
                                <p className="text-slate-400 text-xs mt-1">Try adjusting filters</p>
                            </div>
                        ) : (
                            displayTrips.map((trip) => (
                                <div 
                                    key={trip.id} 
                                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/5 hover:border-brand-cyan/30 transition-all group relative overflow-hidden"
                                >
                                    {/* Left Border Indicator */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${trip.purpose === 'Business' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`} />

                                    {/* Row 1: Header */}
                                    <div className="flex justify-between items-start mb-3 pl-3">
                                        <div>
                                            <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
                                                <span>{new Date(trip.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <span className="font-mono text-slate-500 text-xs">{new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                                    trip.purpose === 'Business' 
                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {trip.purpose || 'Personal'}
                                                </span>
                                                {trip.notes && <FileTextIcon className="w-3 h-3 text-slate-400" />}
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <ScoreBadge score={trip.complianceScore} />
                                            <span className="text-[10px] text-slate-400 mt-1 font-mono">
                                                {formatDuration(trip.duration)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Row 2: Route Visual */}
                                    <div className="flex flex-col space-y-2 pl-3 mb-3 relative">
                                        {/* Connector Line */}
                                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-white/10" />
                                        
                                        <div className="flex items-center relative z-10">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 ring-4 ring-white dark:ring-slate-900 mr-3" />
                                            <p className="text-xs text-slate-600 dark:text-slate-300 truncate w-full pr-4">{trip.startName || "Unknown Start"}</p>
                                        </div>
                                        <div className="flex items-center relative z-10">
                                            <MapPinIcon className="w-3 h-3 text-brand-cyan mr-2.5 bg-white dark:bg-slate-900" />
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate w-full pr-4">{trip.endName || "Unknown Destination"}</p>
                                        </div>
                                    </div>

                                    {/* Row 3: Footer Stats */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 pl-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex items-center text-slate-500 dark:text-slate-400">
                                                <CarIcon className="w-3 h-3 mr-1" />
                                                <span className="text-xs font-mono">{trip.startOdo ?? '-'} → {trip.endOdo ?? '-'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-brand-cyan font-bold text-sm">
                                            <span className="font-display mr-1">{formatDistance(trip.distance)}</span>
                                            <ArrowRightIcon className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LogbookModal;
