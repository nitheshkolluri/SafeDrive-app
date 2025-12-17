
import React, { useState, useEffect } from 'react';
import type { Circle, CircleMember } from '../types';
import { circleRepository } from '../utils/circleRepository';
import { auth, db } from '../utils/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { XIcon, UsersIcon, MapPinIcon, TrophyIcon, LinkIcon, UserIcon, GaugeIcon, CrownIcon, TrashIcon, CheckCircleIcon } from './icons';
import SpiderGraph from './SpiderGraph'; // Reuse existing component if available

interface CircleDetailModalProps {
    circle: Circle;
    onClose: () => void;
}

const CircleDetailModal: React.FC<CircleDetailModalProps> = ({ circle, onClose }) => {
    const [activeTab, setActiveTab] = useState<'members' | 'analytics' | 'invite' | 'settings'>('members');
    const [members, setMembers] = useState<CircleMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [actionMemberId, setActionMemberId] = useState<string | null>(null);

    // Settings State
    const [settings, setSettings] = useState(circle.settings || {
        requireApproval: true,
        poolingEnabled: true,
        autoJoin: false,
        shareLocationDefault: 'opt-out' as const,
        challengesEnabled: true
    });

    useEffect(() => {
        loadMembers();
    }, [circle.id]);

    const loadMembers = async () => {
        setLoadingMembers(true);
        try {
            const snap = await getDocs(collection(db, `safetyCircles/${circle.id}/members`));
            const data = snap.docs.map(d => d.data() as CircleMember);
            setMembers(data);
        } catch (e) {
            console.error("Load members error", e);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleShareLocationToggle = async (enabled: boolean) => {
        await circleRepository.toggleLocationSharing(circle.id, enabled);
        loadMembers(); // Refresh
    };

    const generateInvite = async () => {
        const link = await circleRepository.createInvite(circle.id);
        setInviteLink(link);
    };

    const copyInvite = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            alert("Link copied!");
        }
    };

    // Admin Actions
    const handleKick = async (uid: string) => {
        if (!confirm("Remove this member?")) return;
        await circleRepository.removeMember(circle.id, uid);
        setMembers(prev => prev.filter(m => m.uid !== uid));
        setActionMemberId(null);
    };

    const handlePromote = async (uid: string) => {
        await circleRepository.updateMemberRole(circle.id, uid, 'ADMIN');
        loadMembers();
        setActionMemberId(null);
    };

    const toggleSetting = async (key: keyof typeof settings) => {
        const newVal = !settings[key];
        setSettings(prev => ({ ...prev, [key]: newVal })); // Optimistic update
        try {
            await circleRepository.updateCircleSettings(circle.id, { [key]: newVal });
        } catch (e) {
            console.error("Setting update failed", e);
            setSettings(prev => ({ ...prev, [key]: !newVal })); // Revert
        }
    };

    const handleDeleteCircle = async () => {
        if (!confirm("Are you sure you want to DELETE this circle? This action cannot be undone.")) return;
        
        try {
            await circleRepository.deleteCircle(circle.id);
            onClose();
        } catch (e: any) {
            alert("Failed to delete: " + e.message);
        }
    };

    const currentUserMember = members.find(m => m.uid === auth.currentUser?.uid);
    const isAdmin = currentUserMember?.role === 'OWNER' || currentUserMember?.role === 'ADMIN';

    return (
        <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-dark-900 w-full max-w-lg h-[90vh] rounded-3xl border border-white/10 flex flex-col overflow-hidden">
                
                {/* Hero */}
                <div className="p-6 bg-gradient-dark border-b border-white/10 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-white">{circle.name}</h2>
                        <p className="text-sm text-slate-400">{members.length} Members</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-slate-100 dark:bg-dark-950 border-b border-slate-200 dark:border-white/5">
                    <button onClick={() => setActiveTab('members')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'members' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Members</button>
                    <button onClick={() => setActiveTab('analytics')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Analytics</button>
                    <button onClick={() => setActiveTab('invite')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'invite' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Invite</button>
                    {isAdmin && <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'settings' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Admin</button>}
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-dark-900/50">
                    
                    {/* MEMBERS TAB */}
                    {activeTab === 'members' && (
                        <div className="space-y-3">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-100 dark:border-white/5">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${currentUserMember?.shareLocation ? 'bg-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                                        <MapPinIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Share Location</p>
                                        <p className="text-xs text-slate-500">Visible to circle members</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleShareLocationToggle(!currentUserMember?.shareLocation)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${currentUserMember?.shareLocation ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${currentUserMember?.shareLocation ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>

                            {loadingMembers ? (
                                <p className="text-center py-4 text-slate-500">Loading...</p>
                            ) : members.map(m => (
                                <div key={m.uid} className="flex flex-col bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
                                    <div className="flex items-center justify-between p-3" onClick={() => isAdmin && m.uid !== auth.currentUser?.uid && setActionMemberId(actionMemberId === m.uid ? null : m.uid)}>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                                {m.userProfile?.photoUrl ? <img src={m.userProfile.photoUrl} className="w-full h-full object-cover"/> : <UserIcon className="w-5 h-5 text-slate-400"/>}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {m.userProfile?.name || 'Unknown'} 
                                                    {m.uid === auth.currentUser?.uid && ' (You)'}
                                                </p>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${m.role === 'OWNER' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>{m.role}</span>
                                                    {m.shareLocation && <span className="text-[9px] text-green-500 flex items-center"><MapPinIcon className="w-3 h-3 mr-0.5"/> Live</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            {/* Admin Chevron hint */}
                                            {isAdmin && m.uid !== auth.currentUser?.uid && (
                                                <span className="text-xs text-slate-400 mr-2">⋮</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Admin Context Menu */}
                                    {actionMemberId === m.uid && (
                                        <div className="flex border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                                            <button 
                                                onClick={() => handlePromote(m.uid)}
                                                className="flex-1 py-3 text-xs font-bold text-slate-500 hover:text-white hover:bg-slate-500 transition-colors"
                                            >
                                                Make Admin
                                            </button>
                                            <div className="w-px bg-slate-200 dark:bg-white/10"></div>
                                            <button 
                                                onClick={() => handleKick(m.uid)}
                                                className="flex-1 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ANALYTICS TAB */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-4 animate-fade-in-up">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
                                        <GaugeIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                        {circle.analyticsSummary?.avgSafetyScore || 98}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Avg Safety</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-2">
                                        <TrophyIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                        {circle.analyticsSummary?.totalPoints || 0}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Pool Points</span>
                                </div>
                            </div>

                            {/* Chart Placeholder */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col items-center">
                                <h3 className="text-xs font-black uppercase text-slate-400 mb-4">Circle Performance</h3>
                                <div className="w-full h-40 flex items-end justify-between px-4 space-x-2">
                                    {/* Mock Bars */}
                                    {[60, 80, 45, 90, 70, 85, 95].map((h, i) => (
                                        <div key={i} className="w-full bg-slate-100 dark:bg-white/10 rounded-t-lg relative group">
                                            <div 
                                                className="absolute bottom-0 left-0 right-0 bg-brand-cyan rounded-t-lg transition-all duration-1000" 
                                                style={{ height: `${h}%`, opacity: 0.6 + (i*0.05) }} 
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full flex justify-between mt-2 text-[10px] text-slate-400 font-bold">
                                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                                </div>
                            </div>

                            {/* Top Driver */}
                            <div className="bg-gradient-lux p-1 rounded-2xl shadow-lg">
                                <div className="bg-dark-900 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black shadow-lg">
                                            <CrownIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-yellow-500 font-black uppercase">Top Driver</p>
                                            <p className="font-bold text-white text-sm">
                                                {members[0]?.userProfile?.name || 'Loading...'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-black text-white">
                                        {circle.analyticsSummary?.avgSafetyScore || 100} pts
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INVITE TAB */}
                    {activeTab === 'invite' && (
                        <div className="text-center py-8 space-y-6">
                            <div className="w-20 h-20 bg-brand-cyan/20 rounded-full flex items-center justify-center mx-auto text-brand-cyan shadow-glow-cyan">
                                <LinkIcon className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Grow your Squad</h3>
                                <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">Share a secure link to let others join this circle.</p>
                            </div>

                            {inviteLink ? (
                                <div className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 p-4 rounded-xl break-all">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-mono select-all">{inviteLink}</p>
                                    <button onClick={copyInvite} className="w-full py-3 bg-brand-cyan text-black font-bold rounded-xl shadow-lg hover:bg-cyan-400 transition-colors flex items-center justify-center">
                                        <CheckCircleIcon className="w-4 h-4 mr-2" /> Copy Link
                                    </button>
                                </div>
                            ) : (
                                <button onClick={generateInvite} className="px-8 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 font-bold rounded-xl shadow-lg hover:scale-105 transition-transform">
                                    Generate Invite Link
                                </button>
                            )}
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && isAdmin && (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-2">General</h4>
                                
                                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/5">
                                    <span className="text-sm text-slate-500 dark:text-slate-300">Require Approval</span>
                                    <button 
                                        onClick={() => toggleSetting('requireApproval')}
                                        className={`w-10 h-6 rounded-full relative transition-colors ${settings.requireApproval ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${settings.requireApproval ? 'translate-x-4' : ''}`}/>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between py-3">
                                    <span className="text-sm text-slate-500 dark:text-slate-300">Allow Pooling</span>
                                    <button 
                                        onClick={() => toggleSetting('poolingEnabled')}
                                        className={`w-10 h-6 rounded-full relative transition-colors ${settings.poolingEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${settings.poolingEnabled ? 'translate-x-4' : ''}`}/>
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                                <h4 className="font-bold text-red-500">Danger Zone</h4>
                                <p className="text-xs text-red-400 mt-1 mb-3">Circle deletion is permanent and removes all member data associated with this circle.</p>
                                <button 
                                    onClick={handleDeleteCircle}
                                    className="w-full py-3 bg-red-600 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                                >
                                    <TrashIcon className="w-4 h-4 mr-2" /> Delete Circle
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default CircleDetailModal;
