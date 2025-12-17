import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { UserStats, Reward, Challenge } from '../types';
import { TrophyIcon, LockIcon, StarIcon, ZapIcon, RouteIcon, ClockIcon, CheckCircleIcon, CrownIcon, GiftIcon, ArrowRightIcon } from '../components/icons';
import { INITIAL_CHALLENGES } from '../data/challenges';

// Updated Tier Config
const TIERS = [
    { name: 'Bronze', minPoints: 0, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-400/50' },
    { name: 'Silver', minPoints: 10000, color: 'text-slate-500 dark:text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-300/50' },
    { name: 'Gold', minPoints: 25000, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-400/50' },
    { name: 'Platinum', minPoints: 50000, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-400/50' },
];

const MOCK_REWARDS: Reward[] = [
    { id: '1', name: 'Free Large Coffee', points: 1500, partner: 'The Daily Grind', icon: '☕', tier: 'Bronze', description: 'One free standard coffee at any participating location.' },
    { id: '2', name: '10% Off Service', points: 3000, partner: 'AutoFix Pro', icon: '🔧', tier: 'Silver', description: 'Discount on labor for scheduled maintenance.' },
    { id: '3', name: '$20 Fuel Credit', points: 7500, partner: 'Petrol Palace', icon: '⛽', tier: 'Gold', isSponsored: true, description: 'Direct credit applied to your next fill-up.' },
    { id: '4', name: 'Premium Wash', points: 2500, partner: 'Sparkle Car Wash', icon: '🚿', tier: 'Silver', description: 'Full exterior wash and wax.' },
    { id: '5', name: '50% Off Insurance Excess', points: 20000, partner: 'SafeInsure', icon: '🛡️', tier: 'Platinum', isLimited: true, description: 'One-time reduction in excess fee for safe drivers.' },
    { id: '6', name: 'Mystery Box', points: 5000, partner: 'SafeDrive', icon: '🎁', tier: 'Gold', comingSoon: true, description: 'Contains random boosters and partner offers.' },
];

const RewardsScreen: React.FC = () => {
    const [userStats, setUserStats] = useLocalStorage<UserStats>('user-stats', { points: 0, streak: 0, complianceScore: 100, totalDistance: 0, totalTrips: 0 });
    const [challenges] = useLocalStorage<Challenge[]>('user-challenges', INITIAL_CHALLENGES);
    const [activeTab, setActiveTab] = useState<'Market' | 'Challenges'>('Market');
    
    const currentPoints = Math.floor(userStats.points);
    const currentTier = TIERS.slice().reverse().find(t => currentPoints >= t.minPoints) || TIERS[0];
    const nextTier = TIERS.find(t => t.minPoints > currentPoints);
    const progressToNext = nextTier 
        ? ((currentPoints - (TIERS[TIERS.indexOf(nextTier)-1]?.minPoints || 0)) / (nextTier.minPoints - (TIERS[TIERS.indexOf(nextTier)-1]?.minPoints || 0))) * 100
        : 100;

    const handleRedeem = (reward: Reward) => {
        if (currentPoints < reward.points) {
            alert("Insufficient points.");
            return;
        }
        if (reward.comingSoon) return;

        if (confirm(`Redeem "${reward.name}" for ${reward.points.toLocaleString()} points?`)) {
            setUserStats(prev => ({ ...prev, points: Math.floor(prev.points - reward.points) }));
            alert(`Success! Code: SAFE-${Math.floor(Math.random()*10000)}`);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-slate-50 dark:bg-dark-950 pb-32 transition-colors duration-300">
            
            {/* Header / Tier Progress */}
            <div className="relative pt-8 pb-6 px-6 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/5">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Balance</p>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">
                            {currentPoints.toLocaleString()}
                        </h1>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${currentTier.color} ${currentTier.bg} ${currentTier.border}`}>
                        {currentTier.name} Member
                    </div>
                </div>

                {nextTier ? (
                    <div className="w-full">
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-cyan to-brand-purple transition-all duration-1000" style={{ width: `${progressToNext}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-right font-medium">
                            {Math.floor(nextTier.minPoints - currentPoints).toLocaleString()} pts to {nextTier.name}
                        </p>
                    </div>
                ) : (
                    <p className="text-[10px] text-brand-cyan font-bold uppercase tracking-wide">Max Tier Achieved</p>
                )}

                {/* Tab Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mt-6">
                    {['Market', 'Challenges'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === tab 
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab === 'Market' ? 'Rewards' : 'Missions'}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'Market' && (
                <div className="p-4 space-y-6 animate-fade-in-up">
                    
                    {/* Featured / Limited Drop */}
                    {MOCK_REWARDS.filter(r => r.isLimited).map(reward => (
                        <div key={reward.id} className="relative overflow-hidden rounded-3xl bg-gradient-lux p-0.5 shadow-lg shadow-purple-500/20 group cursor-pointer" onClick={() => handleRedeem(reward)}>
                            <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-dark-900 rounded-[22px] p-5 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                     <div className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-2xl text-2xl border border-white/10">
                                        {reward.icon}
                                     </div>
                                     <div>
                                         <div className="flex items-center space-x-2 mb-1">
                                             <span className="bg-red-500 text-white text-[9px] font-black px-1.5 rounded uppercase">Limited</span>
                                             <h3 className="font-bold text-white text-sm">{reward.name}</h3>
                                         </div>
                                         <p className="text-xs text-slate-400">{reward.partner}</p>
                                     </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-black text-brand-cyan text-lg">{reward.points.toLocaleString()}</span>
                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Redeem</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Standard Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {MOCK_REWARDS.filter(r => !r.isLimited).map(reward => (
                            <button
                                key={reward.id}
                                onClick={() => handleRedeem(reward)}
                                disabled={currentPoints < reward.points || reward.comingSoon}
                                className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                                    currentPoints >= reward.points && !reward.comingSoon
                                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-cyan/50 hover:shadow-md' 
                                    : 'bg-slate-50 dark:bg-white/5 border-transparent opacity-80'
                                }`}
                            >
                                {reward.isSponsored && (
                                    <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[8px] font-black px-2 py-1 rounded-bl-xl uppercase">
                                        Partner
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-black/20 flex items-center justify-center text-xl">
                                        {reward.icon}
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-xs font-black ${
                                        currentPoints >= reward.points 
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-black' 
                                        : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                    }`}>
                                        {reward.points.toLocaleString()}
                                    </div>
                                </div>
                                
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 leading-tight">{reward.name}</h3>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">{reward.partner}</p>
                                
                                {reward.comingSoon && (
                                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                                        <div className="bg-black/80 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center">
                                            <LockIcon className="w-3 h-3 mr-1" /> Locked
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'Challenges' && (
                <div className="p-4 space-y-4 animate-fade-in-up">
                    {challenges.map(challenge => (
                        <div key={challenge.id} className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 ${challenge.isComplete ? 'text-green-500' : 'text-slate-500'}`}>
                                        {challenge.isComplete ? <CheckCircleIcon className="w-6 h-6" /> : <TrophyIcon className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{challenge.title}</h3>
                                        <p className="text-xs text-slate-500">{challenge.description}</p>
                                    </div>
                                </div>
                                <span className="bg-brand-cyan/10 text-brand-cyan px-2 py-1 rounded-lg text-xs font-black">+{challenge.points}</span>
                            </div>
                            
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${challenge.isComplete ? 'bg-green-500' : 'bg-brand-cyan'}`} 
                                    style={{ width: `${Math.min(100, (challenge.progress / challenge.goal) * 100)}%` }} 
                                />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                <span>Progress</span>
                                <span>{Math.floor(challenge.progress)} / {challenge.goal}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RewardsScreen;