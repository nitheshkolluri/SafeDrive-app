import React, { useState, useEffect } from 'react';
import type { SafetyCircleMember, User } from '../types';
import { XIcon, UsersIcon, TrophyIcon, LinkIcon, PlusIcon, SendIcon } from './icons';
import { userRepository } from '../utils/userRepository';
import { auth } from '../utils/firebase';

interface SafetyCircleModalProps {
    onClose: () => void;
}

const SafetyCircleModal: React.FC<SafetyCircleModalProps> = ({ onClose }) => {
    const [viewState, setViewState] = useState<'loading' | 'onboarding' | 'create' | 'join' | 'view'>('loading');
    const [circleData, setCircleData] = useState<{name: string, code: string} | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    
    // Inputs
    const [inviteCodeInput, setInviteCodeInput] = useState('');
    const [newCircleName, setNewCircleName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);

    useEffect(() => {
        loadCircle();
    }, []);

    const loadCircle = async () => {
        setViewState('loading');
        if (!auth.currentUser) return;

        try {
            const user = await userRepository.syncUser({ id: auth.currentUser.uid } as any);
            
            if (user.circleId) {
                const { circle, members } = await userRepository.getCircleDetails(user.circleId);
                setCircleData({ name: circle.name, code: circle.inviteCode });
                setMembers(members);
                setViewState('view');
            } else {
                setViewState('onboarding');
            }
        } catch (e) {
            console.error(e);
            // If fetching fails, default to onboarding so they aren't stuck
            setViewState('onboarding');
        }
    };

    const handleCreate = async () => {
        if (!newCircleName.trim() || !auth.currentUser) return;
        setIsProcessing(true);
        setError(null);
        try {
            await userRepository.createCircle(auth.currentUser.uid, newCircleName);
            await loadCircle();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Could not create circle. Try again.");
            setIsProcessing(false);
        }
    };

    const handleJoin = async () => {
        if (!inviteCodeInput.trim() || !auth.currentUser) return;
        setIsProcessing(true);
        setError(null);
        try {
            await userRepository.joinCircleByCode(auth.currentUser.uid, inviteCodeInput);
            await loadCircle();
        } catch (e: any) {
            setError(e.message || "Invalid invite code or circle not found.");
            setIsProcessing(false);
        }
    };

    const handleCopyInvite = () => {
        if (circleData) {
            // Simulate a real deep link
            const link = `https://safedrive.app/join?code=${circleData.code}`;
            navigator.clipboard.writeText(link);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        }
    };

    const handleNativeShare = async () => {
        if (!circleData) return;
        const text = `Join my Safety Circle on SafeDrive! Use code: ${circleData.code}`;
        const url = `https://safedrive.app/join?code=${circleData.code}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'SafeDrive Invite',
                    text: text,
                    url: url
                });
            } catch (err) {
                // Share cancelled
            }
        } else {
            handleCopyInvite();
        }
    };

    return (
        <div className="fixed inset-0 z-[6000] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-dark-900 w-full sm:max-w-md h-[90vh] sm:h-auto rounded-t-[32px] sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden transition-colors duration-300">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5 transition-colors">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            {viewState === 'view' ? circleData?.name : 'Safety Circle'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Family & Fleet Tracking</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-dark-900">
                    
                    {viewState === 'loading' && (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {viewState === 'onboarding' && (
                        <div className="space-y-6 animate-fade-in-up h-full flex flex-col justify-center pb-12">
                            <div className="text-center space-y-2 mb-4">
                                <div className="w-20 h-20 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-purple border border-brand-purple/30 shadow-glow-purple">
                                    <UsersIcon className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Squad Up</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                                    Keep your family safe. Compare scores, see status, and earn group rewards.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <button 
                                    onClick={() => setViewState('create')}
                                    className="p-6 bg-gradient-lux rounded-2xl shadow-lg hover:scale-[1.02] transition-transform text-left group"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-lg font-black text-white">Create Squad</h4>
                                        <PlusIcon className="w-6 h-6 text-white bg-white/20 rounded-full p-1" />
                                    </div>
                                    <p className="text-xs text-white/80">Start a new circle for your family or team.</p>
                                </button>

                                <button 
                                    onClick={() => setViewState('join')}
                                    className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left group"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white">Join Squad</h4>
                                        <LinkIcon className="w-6 h-6 text-brand-cyan" />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Have a code? Enter it to join an existing circle.</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {viewState === 'create' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => setViewState('onboarding')}>
                                <span className="text-lg">←</span> <span>Back</span>
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Name your Circle</h3>
                            
                            <div className="space-y-4">
                                <input 
                                    value={newCircleName}
                                    onChange={e => setNewCircleName(e.target.value)}
                                    placeholder="e.g. The Smiths"
                                    className="w-full p-4 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white outline-none focus:border-brand-purple transition-colors"
                                    autoFocus
                                />
                                <button 
                                    onClick={handleCreate}
                                    disabled={!newCircleName.trim() || isProcessing}
                                    className="w-full py-4 bg-brand-purple text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create & Invite'}
                                </button>
                            </div>
                            {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-xl">{error}</p>}
                        </div>
                    )}

                    {viewState === 'join' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => setViewState('onboarding')}>
                                <span className="text-lg">←</span> <span>Back</span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Enter Invite Code</h3>

                            <div className="space-y-4">
                                <input 
                                    value={inviteCodeInput}
                                    onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                                    placeholder="XYZ123"
                                    className="w-full p-4 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 rounded-xl text-center text-2xl font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-brand-cyan uppercase"
                                    maxLength={6}
                                    autoFocus
                                />
                                <button 
                                    onClick={handleJoin}
                                    disabled={inviteCodeInput.length < 6 || isProcessing}
                                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isProcessing ? <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" /> : 'Join Circle'}
                                </button>
                            </div>
                            {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-xl">{error}</p>}
                        </div>
                    )}

                    {viewState === 'view' && (
                        <div className="space-y-6 animate-fade-in-up">
                            
                            {/* Invite Code Card */}
                            <div className="bg-gradient-to-r from-brand-purple/10 to-blue-600/10 dark:from-brand-purple/20 dark:to-blue-600/20 border border-brand-purple/20 dark:border-brand-purple/30 rounded-2xl p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-brand-purple uppercase tracking-widest mb-1">Invite Code</p>
                                        <p className="text-3xl font-mono font-black text-slate-900 dark:text-white tracking-wider">{circleData?.code}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={handleCopyInvite}
                                            className="p-3 bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-xl text-slate-900 dark:text-white transition-colors border border-white/50 dark:border-transparent"
                                            title="Copy Link"
                                        >
                                            <LinkIcon className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={handleNativeShare}
                                            className="p-3 bg-white text-black hover:bg-slate-200 rounded-xl transition-colors shadow-lg"
                                            title="Share"
                                        >
                                            <SendIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                {copyFeedback && (
                                    <div className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded text-center mb-2">
                                        Invite Link Copied!
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400">Share this code with family to add them.</p>
                            </div>

                            {/* Leaderboard */}
                            <div>
                                <div className="flex justify-between items-center mb-4 px-1">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Leaderboard</h3>
                                    <span className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded font-bold">Weekly</span>
                                </div>
                                <div className="space-y-3">
                                    {members.sort((a,b) => (b.currentScore || 0) - (a.currentScore || 0)).map((m, idx) => (
                                        <div key={m.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-3 rounded-2xl">
                                            <div className="flex items-center space-x-4">
                                                <div className={`font-black text-lg w-6 text-center ${idx === 0 ? 'text-yellow-500' : (idx === 1 ? 'text-slate-400' : (idx === 2 ? 'text-orange-500' : 'text-slate-600'))}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-white border border-slate-300 dark:border-white/10 overflow-hidden">
                                                    {m.photoUrl ? <img src={m.photoUrl} className="w-full h-full object-cover" /> : m.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{m.name} {m.id === auth.currentUser?.uid && '(You)'}</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                        {m.lastActive && Date.now() - m.lastActive < 3600000 ? '🟢 Active Recently' : '⚫ Offline'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className={`text-xl font-mono font-black ${
                                                    (m.currentScore || 0) >= 95 ? 'text-brand-cyan' : 
                                                    (m.currentScore || 0) >= 90 ? 'text-green-500' : 
                                                    (m.currentScore || 0) >= 80 ? 'text-yellow-500' : 'text-red-500'
                                                }`}>
                                                    {m.currentScore || 0}
                                                </div>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase">Score</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SafetyCircleModal;