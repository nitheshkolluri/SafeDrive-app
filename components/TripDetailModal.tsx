
import React, { useEffect, useState, useRef } from 'react';
import type { Trip, DrivingEvent, SeverityLevel } from '../types';
import { XIcon, ClockIcon, RouteIcon, TrophyIcon, AlertTriangleIcon, GaugeIcon, StarIcon, MapPinIcon, ArrowRightIcon, UploadIcon, BriefcaseIcon, UserIcon } from './icons';
import { formatDuration, formatDistance } from '../utils/helpers';
import { syncService } from '../utils/sync';
import { auth } from '../utils/firebase';

interface TripDetailModalProps {
    trip: Trip;
    onClose: () => void;
}

const ProgressBar: React.FC<{ label: string; percent: number; color: string; delay: number }> = ({ label, percent, color, delay }) => {
    const [width, setWidth] = useState(0);
    useEffect(() => { setTimeout(() => setWidth(percent), delay); }, [percent, delay]);

    return (
        <div className="mb-4">
            <div className="flex justify-between text-xs font-bold mb-1.5 uppercase tracking-wide text-slate-500 dark:text-slate-400 font-display">
                <span>{label}</span>
                <span className="text-slate-900 dark:text-white">{percent}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-900/50 rounded-full overflow-hidden border border-slate-100 dark:border-white/5">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${color} shadow-[0_0_10px_currentColor]`} 
                    style={{ width: `${width}%` }} 
                />
            </div>
        </div>
    );
};

const EventRow: React.FC<{ label: string; points: number; type?: string; time?: string; disputed?: boolean; severityLevel?: SeverityLevel; onDispute?: (file?: File) => void }> = ({ label, points, type, time, disputed, severityLevel, onDispute }) => {
    const isPositive = points >= 0;
    const [hasDisputed, setHasDisputed] = useState(disputed || false);
    const [showUpload, setShowUpload] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDispute = () => {
        setShowUpload(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const confirmDispute = () => {
        if (!hasDisputed && onDispute) {
            onDispute(selectedFile || undefined);
            setHasDisputed(true);
            setShowUpload(false);
        }
    };

    const getSeverityColor = (level?: SeverityLevel) => {
        switch(level) {
            case 'CRITICAL': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            case 'SEVERE': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
            case 'MODERATE': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
            default: return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
        }
    };

    return (
        <div className={`flex flex-col p-4 rounded-2xl border transition-all ${hasDisputed ? 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 opacity-60' : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-brand-cyan/30'}`}>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                    <div className={`p-2.5 rounded-full ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {isPositive ? <StarIcon className="w-5 h-5" /> : <AlertTriangleIcon className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                             <p className="font-bold text-slate-900 dark:text-white text-sm">{label}</p>
                             {hasDisputed && <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Under Review</span>}
                             {!isPositive && severityLevel && (
                                 <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${getSeverityColor(severityLevel)}`}>
                                     {severityLevel}
                                 </span>
                             )}
                        </div>
                        {time && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{time}</p>}
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                     {!isPositive && !hasDisputed && !showUpload && (
                        <button 
                            onClick={handleDispute}
                            className="text-[10px] text-slate-400 hover:text-brand-cyan font-bold uppercase tracking-wider transition-colors"
                        >
                            Dispute
                        </button>
                     )}
                    <span className={`font-display font-black text-lg ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{points}
                    </span>
                </div>
            </div>
            
            {showUpload && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-dark-900/50 rounded-xl border border-slate-200 dark:border-white/10 animate-fade-in-up">
                    <p className="text-xs text-slate-500 dark:text-slate-300 mb-3 font-bold uppercase tracking-wide">Upload Evidence (Optional)</p>
                    <input 
                        type="file" 
                        accept="video/*,image/*" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                    <div className="flex flex-col space-y-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-4 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center border border-dashed border-slate-300 dark:border-white/20 transition-all"
                        >
                            <UploadIcon className="w-4 h-4 mr-2 text-brand-cyan" /> 
                            {selectedFile ? selectedFile.name : 'Select Dashcam Clip / Photo'}
                        </button>
                        <div className="flex space-x-2 pt-1">
                            <button onClick={confirmDispute} className="flex-1 py-3 bg-brand-cyan text-black text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all">Submit Dispute</button>
                            <button onClick={() => setShowUpload(false)} className="px-4 py-3 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TripDetailModal: React.FC<TripDetailModalProps> = ({ trip, onClose }) => {
    const totalEventPoints = trip.events.reduce((acc, e) => acc + e.points, 0);
    const baseDistancePoints = trip.points - totalEventPoints;

    const [purpose, setPurpose] = useState<'Business' | 'Personal'>(trip.purpose || 'Personal');
    const [notes, setNotes] = useState(trip.notes || '');
    const [isSavingLog, setIsSavingLog] = useState(false);

    // Calculate Grade
    const score = trip.complianceScore;
    let grade = 'F';
    let gradeColor = 'text-red-500';
    let gradeGradient = 'from-red-500 to-orange-600';
    
    if (score >= 98) { grade = 'S'; gradeColor = 'text-brand-cyan'; gradeGradient = 'from-brand-cyan to-blue-600'; }
    else if (score >= 90) { grade = 'A'; gradeColor = 'text-green-500'; gradeGradient = 'from-green-400 to-emerald-600'; }
    else if (score >= 80) { grade = 'B'; gradeColor = 'text-yellow-400'; gradeGradient = 'from-yellow-400 to-orange-500'; }
    else if (score >= 70) { grade = 'C'; gradeColor = 'text-orange-400'; gradeGradient = 'from-orange-400 to-red-500'; }

    const speedEvents = trip.events.filter(e => e.type.includes('SPEED')).length;
    const handlingEvents = trip.events.filter(e => e.type.includes('TURN') || e.type.includes('ACCEL') || e.type.includes('BRAKE') || e.type.includes('CORNERING') || e.type.includes('LANE')).length;
    
    const speedScore = Math.max(0, 100 - (speedEvents * 10));
    const handlingScore = Math.max(0, 100 - (handlingEvents * 10));
    const focusScore = Math.max(0, 100 - (trip.events.filter(e => e.type.includes('PHONE')).length * 20));

    const handleSaveClassification = async () => {
        if (!auth.currentUser) return;
        setIsSavingLog(true);
        try {
            await syncService.update('trips', trip.id, { purpose, notes });
        } catch (e) {
            console.error("Failed to save logbook entry", e);
        } finally {
            setIsSavingLog(false);
        }
    };

    const handleDisputeSubmit = async (event: DrivingEvent, file?: File) => {
        if (!auth.currentUser) {
            alert("Log in to sync disputes.");
            return;
        }

        try {
            if (file) {
                await syncService.uploadFile(file, 'disputes', {
                    notes: `Dispute for ${event.type}`,
                    relatedTripId: trip.id
                });
            }
            alert(`Dispute submitted. We will review it shortly.`);
        } catch (e) {
            console.error("Dispute failed", e);
            alert("Failed to upload evidence.");
        }
    };

    return (
        <div className="fixed inset-0 z-[5000] bg-black/60 dark:bg-dark-950/90 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-dark-900 w-full sm:max-w-md h-[92vh] sm:h-auto sm:max-h-[85vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 dark:border-white/10 transition-colors duration-300">
                
                {/* Header */}
                <div className="flex-shrink-0 relative overflow-hidden bg-slate-50 dark:bg-dark-800 transition-colors">
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradeGradient} opacity-10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4`} />
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 z-10 p-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>

                    <div className="p-8 pb-6 flex items-center justify-between relative z-0">
                        <div>
                             <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">Trip Report</h2>
                             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                                 {new Date(trip.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                             </p>
                             
                             <div className="flex items-center space-x-2 mt-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                                 <span className="px-2 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent rounded-md max-w-[100px] truncate">{trip.startName.split(',')[0]}</span>
                                 <ArrowRightIcon className="w-3 h-3" />
                                 <span className="px-2 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent rounded-md text-slate-900 dark:text-white max-w-[100px] truncate">{trip.endName?.split(',')[0]}</span>
                             </div>
                        </div>

                        {/* Grade Ring */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <div className={`absolute inset-0 rounded-full border-4 border-slate-200 dark:border-white/5`} />
                            <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-current ${gradeColor} opacity-50 rotate-45`} />
                            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradeGradient} flex items-center justify-center shadow-lg shadow-${gradeColor.split('-')[1]}-500/30`}>
                                <span className="text-5xl font-black text-white font-display pt-1">{grade}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-dark-900">
                    
                    {/* Logbook Classification */}
                    <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-5 border border-slate-100 dark:border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Logbook</h3>
                            {isSavingLog && <span className="text-[10px] font-bold text-green-500 animate-pulse">SAVING...</span>}
                        </div>
                        <div className="flex bg-slate-200 dark:bg-black/20 rounded-2xl p-1.5 mb-4">
                            <button 
                                onClick={() => { setPurpose('Personal'); handleSaveClassification(); }}
                                className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-bold transition-all ${purpose === 'Personal' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                            >
                                <UserIcon className="w-4 h-4 mr-2" /> Personal
                            </button>
                            <button 
                                onClick={() => { setPurpose('Business'); handleSaveClassification(); }}
                                className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-bold transition-all ${purpose === 'Business' ? 'bg-white dark:bg-green-600 text-green-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                            >
                                <BriefcaseIcon className="w-4 h-4 mr-2" /> Business
                            </button>
                        </div>
                        {purpose === 'Business' && (
                            <div className="animate-fade-in-up">
                                <input 
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    onBlur={handleSaveClassification}
                                    placeholder="Add trip notes..."
                                    className="w-full bg-white dark:bg-dark-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-cyan transition-colors placeholder-slate-400"
                                />
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-none">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple/10 flex items-center justify-center mb-2 text-purple-500 dark:text-purple">
                                <ClockIcon className="w-5 h-5" />
                            </div>
                            <span className="text-xl font-black text-slate-900 dark:text-white font-display">{formatDuration(trip.duration)}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Time</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-none">
                            <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center mb-2 text-cyan-600 dark:text-cyan-500">
                                <RouteIcon className="w-5 h-5" />
                            </div>
                            <span className="text-xl font-black text-slate-900 dark:text-white font-display">{formatDistance(trip.distance)}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Km</span>
                        </div>
                         <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-none">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center mb-2 text-orange-500">
                                <GaugeIcon className="w-5 h-5" />
                            </div>
                            <span className="text-xl font-black text-slate-900 dark:text-white font-display">{trip.maxSpeed.toFixed(0)}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Speed</span>
                        </div>
                    </div>

                    {/* Analysis Bars */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Driving Analysis</h3>
                        <div className="p-6 bg-slate-50 dark:bg-dark-800 rounded-3xl border border-slate-100 dark:border-white/5 shadow-inner">
                            <ProgressBar label="Speed Control" percent={speedScore} color="bg-brand-cyan" delay={100} />
                            <ProgressBar label="Smooth Handling" percent={handlingScore} color="bg-purple-500" delay={300} />
                            <ProgressBar label="Focus & Stability" percent={focusScore} color="bg-green-500" delay={500} />
                        </div>
                    </div>

                    {/* Points Breakdown */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Events Log</h3>
                            <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-aurora rounded-full shadow-lg shadow-purple/20">
                                <TrophyIcon className="w-3 h-3 text-white" />
                                <span className="text-sm font-black text-white">+{trip.points} Pts</span>
                            </div>
                        </div>
                        
                        <div className="space-y-3 pb-8">
                            {/* Base Points Entry */}
                            {baseDistancePoints > 0 && (
                                <EventRow 
                                    label="Safe Distance Bonus" 
                                    points={Math.round(baseDistancePoints)} 
                                    type="DISTANCE" 
                                />
                            )}

                            {/* Events List */}
                            {trip.events.length > 0 ? (
                                trip.events.map((event, idx) => (
                                    <EventRow 
                                        key={`${event.timestamp}-${idx}`}
                                        label={event.description || event.type.replace(/_/g, ' ')}
                                        points={event.points}
                                        time={new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                        disputed={event.disputed}
                                        severityLevel={event.severityLevel}
                                        onDispute={(file) => handleDisputeSubmit(event, file)}
                                    />
                                ))
                            ) : (
                                baseDistancePoints <= 0 && (
                                    <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                                        <p className="text-sm">No significant events recorded.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripDetailModal;
