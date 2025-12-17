
import React, { useState, useEffect, useRef } from 'react';
import type { DeviceOrientationData, DeviceMotionData } from '../types';
import { AlertTriangleIcon } from './icons';

interface DriverVerificationProps {
    orientation: DeviceOrientationData | null;
    motion?: DeviceMotionData | null;
    onSuccess: (calibratedOrientation: DeviceOrientationData) => void;
    onCancel: () => void;
}

const CALIBRATION_DURATION = 3000;
const SETTLING_DELAY = 1000; // Ignore first second

// Tightened thresholds for "Mechanical Stability"
// Handheld is usually > 10.0 deg variance
// Dashboard mount usually < 5.0 but > 0.01 (engine vibration)
// Table is < 0.01
const ORIENTATION_STABILITY_THRESHOLD = 5.0; 
const ROTATION_STABILITY_THRESHOLD = 15.0;   
const TABLE_STABILITY_THRESHOLD = 0.02; // Too perfect

const DriverVerificationRoot: React.FC<DriverVerificationProps> = ({ orientation, motion, onSuccess, onCancel }) => {
    const [status, setStatus] = useState<'idle' | 'calibrating' | 'success' | 'unstable' | 'too_perfect'>('idle');
    const [progress, setProgress] = useState(0);
    const [hint, setHint] = useState<string>('');
    
    const historyRef = useRef<{
        beta: number[], 
        gamma: number[],
        rotationRates: number[]
    }>({ beta: [], gamma: [], rotationRates: [] });
    
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startCalibration = () => {
        setStatus('calibrating');
        setProgress(0);
        setHint('Engine on. Hands off.');
        historyRef.current = { beta: [], gamma: [], rotationRates: [] };
        
        const startTime = Date.now();
        
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;
            
            // UI Progress
            const pct = Math.min(100, (elapsed / (CALIBRATION_DURATION + SETTLING_DELAY)) * 100);
            setProgress(pct);

            // Only record data AFTER the settling delay
            if (elapsed > SETTLING_DELAY) {
                // Sample orientation (Tilt)
                if (orientation && orientation.beta !== null && orientation.gamma !== null) {
                    historyRef.current.beta.push(orientation.beta);
                    historyRef.current.gamma.push(orientation.gamma);
                }

                // Sample rotation rate (Gyro)
                if (motion && motion.rotationRate) {
                    const { alpha, beta, gamma } = motion.rotationRate;
                    if (alpha !== null && beta !== null && gamma !== null) {
                         const mag = Math.sqrt(alpha*alpha + beta*beta + gamma*gamma);
                         historyRef.current.rotationRates.push(mag);
                    }
                }
            }

            if (elapsed >= (CALIBRATION_DURATION + SETTLING_DELAY)) {
                finishCalibration();
            }
        }, 100);
    };

    const finishCalibration = () => {
        if (timerRef.current) clearInterval(timerRef.current);

        const betas = historyRef.current.beta;
        const gammas = historyRef.current.gamma;
        const rotations = historyRef.current.rotationRates;

        // Fallback for desktop/no-sensor environments
        if (betas.length < 5) {
            setStatus('success');
            setTimeout(() => {
                onSuccess({ alpha: 0, beta: 0, gamma: 0 });
            }, 500);
            return;
        }

        const calculateStats = (arr: number[]) => {
            if (arr.length === 0) return { stdDev: 0, mean: 0, max: 0, p90: 0 };
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            const sse = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
            const stdDev = Math.sqrt(sse / arr.length);
            
            const sorted = [...arr].sort((a,b) => a - b);
            const p90 = sorted[Math.floor(sorted.length * 0.9)];

            return { stdDev, mean, p90 };
        };

        const betaStats = calculateStats(betas);
        const gammaStats = calculateStats(gammas);
        const rotationStats = calculateStats(rotations);

        // --- STRICT VERIFICATION LOGIC ---
        
        // 1. Check if it's "Too Perfect" (Sitting on a table, engine off, or emulated)
        // We want to detect actual car vibration if possible, but for web compatibility we keep this loose.
        // However, if stdDev is literally 0, it's suspicious for a "Mount Check" in a moving car context.
        const isTooPerfect = betaStats.stdDev < TABLE_STABILITY_THRESHOLD && gammaStats.stdDev < TABLE_STABILITY_THRESHOLD;

        // 2. Check Stability (Handheld vs Mount)
        const isGyroStable = rotations.length > 0 ? rotationStats.p90 < ROTATION_STABILITY_THRESHOLD : true;
        const isOrientationStable = betaStats.stdDev < ORIENTATION_STABILITY_THRESHOLD && gammaStats.stdDev < ORIENTATION_STABILITY_THRESHOLD;

        if (isTooPerfect) {
             // In a strict app we might fail this. For now, we warn but allow, or fail if strict.
             // Let's fail it to be "Authentic"
             setStatus('too_perfect');
             setHint('Device is lifeless. Is the engine running?');
        } else if (isGyroStable && isOrientationStable) {
            setStatus('success');
            setHint('Mechanical fix verified.');
            setTimeout(() => {
                onSuccess({ alpha: 0, beta: betaStats.mean, gamma: gammaStats.mean });
            }, 800);
        } else {
            setStatus('unstable');
            setProgress(0);
            
            if (!isGyroStable) {
                setHint('Micro-movements detected. Don\'t hold it.');
            } else {
                setHint('Vibration too high. Tighten mount.');
            }
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const getStatusUI = () => {
        switch (status) {
            case 'idle':
                return { 
                    title: 'Mount Calibration', 
                    desc: 'We analyze micro-vibrations to verify the phone is mounted, not handheld.', 
                    color: 'text-white',
                    btnText: 'Start Scan',
                    btnColor: 'bg-gradient-aurora'
                };
            case 'calibrating':
                return { 
                    title: 'Sampling Physics...', 
                    desc: 'Engine vibration expected. Human tremors rejected.', 
                    color: 'text-cyan-400',
                    btnText: 'Analyzing...',
                    btnColor: 'bg-slate-700'
                };
            case 'success':
                return { 
                    title: 'Hardware Locked', 
                    desc: 'Mount signature confirmed.', 
                    color: 'text-green-400',
                    btnText: 'Launching...',
                    btnColor: 'bg-green-600'
                };
            case 'unstable':
                return { 
                    title: 'Handheld Detected', 
                    desc: hint || 'Stability variance too high.', 
                    color: 'text-red-400',
                    btnText: 'Retry',
                    btnColor: 'bg-red-600'
                };
            case 'too_perfect':
                return {
                    title: 'No Engine Detect',
                    desc: hint,
                    color: 'text-yellow-400',
                    btnText: 'Retry with Engine On',
                    btnColor: 'bg-yellow-600'
                };
        }
    };
    
    const ui = getStatusUI();

    return (
        <div className="fixed inset-0 bg-dark-950/90 z-[3000] flex items-center justify-center p-6 backdrop-blur-md animate-fade-in-up">
            <div className="bg-dark-900 border border-white/10 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
                
                {status === 'calibrating' && (
                    <div className="absolute inset-0 pointer-events-none">
                         <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,1)] animate-[scan_1.5s_ease-in-out_infinite]" />
                    </div>
                )}

                <div className="mb-6 flex justify-center relative">
                    <div className={`w-24 h-24 rounded-2xl flex items-center justify-center bg-white/5 border-2 transition-all duration-300 ${status === 'unstable' || status === 'too_perfect' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : (status === 'success' ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-cyan-500/30')}`}>
                        {status === 'unstable' || status === 'too_perfect' ? (
                            <AlertTriangleIcon className="w-10 h-10 text-red-500 animate-pulse" />
                        ) : (
                            <span className="text-4xl filter drop-shadow-lg">
                                {status === 'success' ? '🔒' : '📲'}
                            </span>
                        )}
                    </div>
                </div>

                <h2 className={`text-2xl font-bold mb-2 ${ui.color}`}>{ui.title}</h2>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed font-medium">
                    {ui.desc}
                </p>

                {status === 'calibrating' && (
                    <div className="w-full bg-dark-800 rounded-full h-3 mb-6 overflow-hidden border border-white/5">
                        <div 
                            className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full transition-all duration-100 ease-linear" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                <div className="space-y-3">
                    <button 
                        onClick={(status === 'idle' || status === 'unstable' || status === 'too_perfect') ? startCalibration : undefined}
                        disabled={status === 'calibrating' || status === 'success'}
                        className={`w-full py-4 font-bold text-white rounded-xl shadow-lg transition-all ${ui.btnColor} ${status === 'calibrating' ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02] active:scale-95'}`}
                    >
                        {ui.btnText}
                    </button>
                    
                    {status !== 'success' && status !== 'calibrating' && (
                        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-white transition-colors">
                            Cancel Setup
                        </button>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    15% { opacity: 1; }
                    85% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default DriverVerificationRoot;
