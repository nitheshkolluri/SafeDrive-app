
import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../utils/sync';
import { circleRepository } from '../utils/circleRepository';
import { auth } from '../utils/firebase';
import type { Circle } from '../types';
import { UsersIcon, PlusIcon, ArrowRightIcon, MapPinIcon, LinkIcon, ArrowLeftIcon } from '../components/icons';
import CircleDetailModal from '../components/CircleDetailModal';
import CreateCircleModal from '../components/CreateCircleModal';

interface CirclesScreenProps {
    onBack?: () => void;
}

const CirclesScreen: React.FC<CirclesScreenProps> = ({ onBack }) => {
    const [circles, setCircles] = useState<Circle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Join State
    const [isJoinMode, setIsJoinMode] = useState(false);
    const [joinInput, setJoinInput] = useState('');
    const [joinStatus, setJoinStatus] = useState<{msg: string, type: 'error'|'success'} | null>(null);

    useEffect(() => {
        loadCircles();
    }, []);

    const loadCircles = async () => {
        if (!auth.currentUser) return;
        try {
            const myCircles = await circleRepository.getMyCircles(auth.currentUser.uid);
            setCircles(myCircles);
        } catch (e) {
            console.error("Failed to load circles", e);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!joinInput) return;
        setJoinStatus({ msg: 'Joining...', type: 'success' }); // pseudo-loading type
        
        try {
            // Support full link or just token
            let token = joinInput;
            if (token.includes('/join/')) {
                token = token.split('/join/')[1];
            }
            
            const result = await circleRepository.joinCircleByToken(token);
            if (result.success) {
                setJoinStatus({ msg: 'Success! Redirecting...', type: 'success' });
                await loadCircles();
                setTimeout(() => setIsJoinMode(false), 1000);
            } else {
                setJoinStatus({ msg: result.message, type: 'error' });
            }
        } catch (e) {
            setJoinStatus({ msg: 'Failed to join.', type: 'error' });
        }
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-dark-950 flex flex-col">
            {/* Header */}
            <div className="pt-12 pb-6 px-6 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-white/5 flex justify-between items-end">
                <div className="flex items-center">
                    {onBack && (
                        <button onClick={onBack} className="mr-3 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-colors">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white font-display">My Squads</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Connect, Compete, Protect.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-10 h-10 bg-brand-cyan text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                >
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Join Block */}
                {!isJoinMode ? (
                    <button 
                        onClick={() => setIsJoinMode(true)}
                        className="w-full p-4 border border-dashed border-slate-300 dark:border-white/20 rounded-2xl flex items-center justify-center text-slate-500 hover:text-brand-purple hover:border-brand-purple hover:bg-brand-purple/5 transition-all"
                    >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        <span className="text-sm font-bold">Have an invite link?</span>
                    </button>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 rounded-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Join Circle</h3>
                            <button onClick={() => setIsJoinMode(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                value={joinInput}
                                onChange={e => setJoinInput(e.target.value)}
                                placeholder="Paste link or token..."
                                className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
                            />
                            <button 
                                onClick={handleJoin}
                                className="bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-xs font-bold"
                            >
                                Join
                            </button>
                        </div>
                        {joinStatus && (
                            <p className={`text-xs mt-2 font-bold ${joinStatus.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                {joinStatus.msg}
                            </p>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full"/></div>
                ) : circles.length === 0 ? (
                    <div className="text-center py-20 opacity-60">
                        <UsersIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Circles Yet</h3>
                        <p className="text-sm mt-2 text-slate-500">Create a squad or join via invite.</p>
                    </div>
                ) : (
                    circles.map(circle => (
                        <div 
                            key={circle.id}
                            onClick={() => setSelectedCircle(circle)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-3xl shadow-sm hover:border-brand-cyan/50 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-lux rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                                        {circle.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{circle.name}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {circle.memberIds?.length || 1} Members • {circle.settings?.challengesEnabled ? '🏆 Active' : '🛡️ Standard'}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRightIcon className="w-5 h-5 text-slate-300 group-hover:text-brand-cyan transition-colors" />
                            </div>

                            {/* Stats Summary Sparkline Placeholder */}
                            {circle.analyticsSummary && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xl font-black ${circle.analyticsSummary.avgSafetyScore > 90 ? 'text-green-500' : 'text-orange-500'}`}>
                                            {circle.analyticsSummary.avgSafetyScore}
                                        </span>
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Avg Safety</span>
                                    </div>
                                    {circle.analyticsSummary.totalPoints > 0 && (
                                        <div className="text-xs font-bold text-brand-purple">
                                            +{circle.analyticsSummary.totalPoints.toLocaleString()} Pool Pts
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {selectedCircle && (
                <CircleDetailModal 
                    circle={selectedCircle} 
                    onClose={() => { setSelectedCircle(null); loadCircles(); }} 
                />
            )}
            
            {isCreating && (
                <CreateCircleModal 
                    onClose={() => setIsCreating(false)} 
                    onSuccess={() => { setIsCreating(false); loadCircles(); }} 
                />
            )}
        </div>
    );
};

export default CirclesScreen;
