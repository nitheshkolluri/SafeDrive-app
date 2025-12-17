
import React, { useState, useMemo } from 'react';
import type { Trip, Screen, User, UserStats } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useFirestoreCollection } from '../utils/sync';
import { auth } from '../utils/firebase';
import { UserIcon, ClockIcon, RouteIcon, TrophyIcon, StarIcon, SupportIcon, ArrowRightIcon, LockIcon, SunIcon, MoonIcon, CarIcon, UsersIcon, EditIcon, TrashIcon, CallIcon, BriefcaseIcon, FileTextIcon } from '../components/icons';
import GuestUpgradeModal from '../components/GuestUpgradeModal';
import TripDetailModal from '../components/TripDetailModal';
import GarageModal from '../components/GarageModal';
import { formatDistance } from '../utils/helpers';
import { userRepository } from '../utils/userRepository';

interface ProfileScreenProps {
    setActiveScreen: (screen: Screen) => void;
    user: User;
    onUpdateUser: (user: User) => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const StatPill: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3 flex-1 flex flex-col items-center justify-center min-w-[90px]">
        <span className={`text-lg font-black ${color} font-display`}>{value}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
);

const DayCluster: React.FC<{ dateKey: string; trips: Trip[]; onSelectTrip: (t: Trip) => void }> = ({ dateKey, trips, onSelectTrip }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const totalDist = trips.reduce((acc, t) => acc + t.distance, 0);
    const sortedTrips = [...trips].sort((a, b) => b.startTime - a.startTime);
    const visibleTrips = isExpanded ? sortedTrips : sortedTrips.slice(0, 3);
    const hiddenCount = sortedTrips.length - visibleTrips.length;

    return (
        <div className="mb-4 animate-fade-in-up">
            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-dark-950/95 backdrop-blur-md py-2 px-2 flex justify-between items-center mb-1">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </h3>
                <span className="text-[10px] font-bold text-slate-400">{formatDistance(totalDist)} km</span>
            </div>

            <div className="space-y-2 px-2">
                {visibleTrips.map((trip) => (
                    <button
                        key={trip.id}
                        onClick={() => onSelectTrip(trip)}
                        className="w-full flex items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-brand-cyan/50 transition-all text-left relative overflow-hidden group shadow-sm"
                    >
                        {trip.purpose === 'Business' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-cyan" />}
                        <div className="flex-1 min-w-0 ml-2">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate pr-2">
                                    {trip.endName || 'Driving Session'}
                                </h4>
                                <span className={`text-xs font-black ${trip.complianceScore >= 90 ? 'text-green-500' : 'text-orange-500'}`}>
                                    {trip.complianceScore}
                                </span>
                            </div>
                            <div className="flex items-center text-[10px] text-slate-500 mt-1 space-x-2">
                                <span>{new Date(trip.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                <span>•</span>
                                <span>{formatDistance(trip.distance)} km</span>
                                {trip.points > 0 && <span className="text-brand-cyan font-bold">+{trip.points} pts</span>}
                            </div>
                        </div>
                    </button>
                ))}

                {hiddenCount > 0 && (
                    <button 
                        onClick={() => setIsExpanded(true)}
                        className="w-full py-2 text-xs font-bold text-slate-500 hover:text-brand-cyan transition-colors bg-white dark:bg-white/5 rounded-xl border border-transparent"
                    >
                        Show {hiddenCount} more...
                    </button>
                )}
            </div>
        </div>
    );
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ setActiveScreen, user, onUpdateUser, onLogout, theme, toggleTheme }) => {
    const isGuest = !auth.currentUser;
    const { data: rawTrips } = useFirestoreCollection<Trip>('trips', [], 'recent-trips');
    const [localTrips] = useLocalStorage<Trip[]>('recent-trips', []);
    const allTrips = (isGuest ? localTrips : rawTrips).sort((a,b) => b.startTime - a.startTime);
    const [stats] = useLocalStorage<UserStats>('user-stats', { points: 0, streak: 0, complianceScore: 100, totalDistance: 0, totalTrips: 0 });
    
    // Modals
    const [showGarage, setShowGarage] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.name);

    const handleSaveProfile = async () => {
        if (!user.id) return;
        try {
            await userRepository.updateUser(user.id, { name: editName });
            onUpdateUser({ ...user, name: editName });
            setIsEditing(false);
        } catch (e) { alert("Failed to save"); }
    };

    const clusteredTrips = useMemo(() => {
        const groups: Record<string, Trip[]> = {};
        allTrips.forEach(trip => {
            const dateKey = new Date(trip.startTime).toDateString();
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(trip);
        });
        return groups;
    }, [allTrips]);

    return (
        <div className="h-full overflow-y-auto bg-slate-50 dark:bg-dark-950 pb-32 transition-colors duration-300">
            {showGarage && <GarageModal onClose={() => setShowGarage(false)} user={user} />}
            {selectedTrip && <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}
            {showUpgradeModal && <GuestUpgradeModal currentUser={user} onSuccess={(u) => { onUpdateUser(u); setShowUpgradeModal(false); }} onCancel={() => setShowUpgradeModal(false)} />}

            {/* HERO */}
            <div className="relative pt-12 pb-8 px-6 bg-white dark:bg-dark-900 rounded-b-[40px] shadow-lg border-b border-slate-200 dark:border-slate-800 z-10">
                <div className="flex justify-between items-start mb-6">
                    <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white">
                        {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={onLogout} className="p-2 text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest">Logout</button>
                </div>

                <div className="flex flex-col items-center">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-dark-950 shadow-xl">
                            {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-slate-400">{user.name.charAt(0)}</span>}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white dark:border-dark-900" />
                    </div>
                    
                    {isEditing ? (
                        <div className="mt-4 flex space-x-2">
                            <input value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg text-center font-bold" />
                            <button onClick={handleSaveProfile} className="text-green-500 font-bold">Save</button>
                        </div>
                    ) : (
                        <div className="mt-3 flex items-center space-x-2" onClick={() => setIsEditing(true)}>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{user.name}</h1>
                            <EditIcon className="w-4 h-4 text-slate-400" />
                        </div>
                    )}
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">SafeDrive Member</p>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-2 mt-8">
                    <StatPill label="Points" value={stats.points.toLocaleString()} color="text-brand-cyan" />
                    <StatPill label="Safety" value={`${stats.complianceScore}%`} color={stats.complianceScore > 90 ? 'text-green-500' : 'text-orange-500'} />
                    <StatPill label="Trips" value={stats.totalTrips.toString()} color="text-brand-purple" />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-6 mt-6 mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowGarage(true)} className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-3 hover:scale-[1.02] transition-transform">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><CarIcon className="w-6 h-6" /></div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Garage</span>
                    </button>
                    <button onClick={() => setActiveScreen('circles')} className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-3 hover:scale-[1.02] transition-transform">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><UsersIcon className="w-6 h-6" /></div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Circle</span>
                    </button>
                </div>
            </div>

            {/* Trip History */}
            <div className="px-4">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Activity</h3>
                </div>
                {Object.keys(clusteredTrips).length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">No trips recorded yet.</div>
                ) : (
                    Object.entries(clusteredTrips).map(([date, trips]) => (
                        <DayCluster key={date} dateKey={date} trips={trips} onSelectTrip={setSelectedTrip} />
                    ))
                )}
            </div>

            <div className="px-6 mt-8">
                <button onClick={() => setActiveScreen('support')} className="w-full py-4 bg-white dark:bg-slate-900 rounded-2xl text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-800">
                    Help & Support
                </button>
            </div>
        </div>
    );
};

export default ProfileScreen;
