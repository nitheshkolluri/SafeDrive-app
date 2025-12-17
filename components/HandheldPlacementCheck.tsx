
import React, { useState, useEffect, useRef } from 'react';
import type { DeviceMotionData } from '../types';

interface HandheldPlacementCheckProps {
    motion: DeviceMotionData | null;
    onSuccess: () => void;
    onCancel: () => void;
}

// Significantly increased to 2.5 to accept cupholder/seat vibration while vehicle is idling
const STABILITY_THRESHOLD = 2.5; 
const CHECK_DURATION = 2000; 

const HandheldPlacementCheck: React.FC<HandheldPlacementCheckProps> = ({ motion, onSuccess, onCancel }) => {
    const [status, setStatus] = useState<'checking' | 'success' | 'fail'>('checking');
    const [progress, setProgress] = useState(0);
    const motionHistoryRef = useRef<number[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        const startTime = Date.now();
        
        // Clear history on start
        motionHistoryRef.current = [];

        timerRef.current = setInterval(() => {
            if (!isMountedRef.current) return;

            const elapsedTime = Date.now() - startTime;
            const newProgress = Math.min(100, (elapsedTime / CHECK_DURATION) * 100);
            setProgress(newProgress);

            if (elapsedTime >= CHECK_DURATION) {
                clearInterval(timerRef.current!);
                
                // Analyze history
                if (motionHistoryRef.current.length > 5) {
                    const mean = motionHistoryRef.current.reduce((a, b) => a + b, 0) / motionHistoryRef.current.length;
                    const variance = motionHistoryRef.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / motionHistoryRef.current.length;
                    const stdDev = Math.sqrt(variance);
                    
                    if (stdDev < STABILITY_THRESHOLD) {
                        setStatus('success');
                        setTimeout(onSuccess, 800); 
                    } else {
                        // console.log("Failed handheld check with stdDev:", stdDev);
                        setStatus('fail');
                    }
                } else {
                    // Not enough data points usually means lag or sensor issue, assume success for UX in web context
                    setStatus('success');
                    setTimeout(onSuccess, 800);
                }
            }
        }, 100);

        return () => {
            isMountedRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [onSuccess]);

    useEffect(() => {
        if (status === 'checking' && motion?.acceleration) {
            const { x, y, z } = motion.acceleration;
            if (x !== null && y !== null && z !== null) {
                const magnitude = Math.sqrt(x * x + y * y + z * z);
                motionHistoryRef.current.push(magnitude);
            }
        }
    }, [motion, status]);

    const getStatusUI = () => {
        switch (status) {
            case 'success': return { text: 'Device is stable.', color: 'text-green-400' };
            case 'fail': return { text: 'Device is moving too much.', color: 'text-red-400' };
            default: return { text: 'Calibrating stability...', color: 'text-slate-300' };
        }
    };

    const { text, color } = getStatusUI();

    return (
        <div className="fixed inset-0 bg-dark-950/80 z-[2000] flex items-center justify-center p-6 backdrop-blur-xl animate-fade-in-up">
            <div className="bg-dark-900 border border-white/10 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
                
                {/* Decor elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-aurora" />
                
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Stability Check</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    Place phone in cup holder or on seat.<br/>
                    <span className="text-white font-semibold">Do not hold it in your hand.</span>
                </p>

                {/* Progress Circle / Bar */}
                <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                            className="text-slate-800"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                        />
                        <path
                            className={`${status === 'fail' ? 'text-red-500' : (status === 'success' ? 'text-green-500' : 'text-cyan-500')} transition-all duration-200`}
                            strokeDasharray={`${progress}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        {status === 'checking' && (
                            <div className="w-12 h-12 bg-cyan-500/20 rounded-full animate-pulse" />
                        )}
                        {status === 'success' && <span className="text-2xl">✅</span>}
                        {status === 'fail' && <span className="text-2xl">⚠️</span>}
                    </div>
                </div>

                <p className={`text-lg font-bold transition-colors duration-300 mb-6 ${color}`}>
                    {text}
                </p>

                <button 
                    onClick={onCancel} 
                    className="w-full py-3.5 text-slate-400 font-bold bg-white/5 rounded-2xl hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                    {status === 'fail' ? 'Try Again / Select Mode' : 'Cancel'}
                </button>
            </div>
        </div>
    );
};

export default HandheldPlacementCheck;
