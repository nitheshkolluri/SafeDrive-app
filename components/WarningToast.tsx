
import React, { useState, useEffect } from 'react';
import type { SeverityLevel } from '../types';

interface WarningToastProps {
    warning: { message: string, severity?: SeverityLevel } | string | undefined;
}

const WarningToast: React.FC<WarningToastProps> = ({ warning }) => {
    const [visible, setVisible] = useState(false);
    const [data, setData] = useState<{ message: string, severity: SeverityLevel }>({ message: '', severity: 'MINOR' });

    useEffect(() => {
        if (warning) {
            if (typeof warning === 'string') {
                setData({ message: warning, severity: 'MINOR' });
            } else {
                setData({ message: warning.message, severity: warning.severity || 'MINOR' });
            }
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 3500); 
            return () => clearTimeout(timer);
        }
    }, [warning]);

    const getColors = (severity: SeverityLevel) => {
        switch(severity) {
            case 'CRITICAL': return 'bg-red-600 shadow-red-500/50 border-red-400';
            case 'SEVERE': return 'bg-orange-600 shadow-orange-500/50 border-orange-400';
            case 'MODERATE': return 'bg-yellow-500 shadow-yellow-500/50 border-yellow-300 text-black';
            default: return 'bg-dark-900 shadow-slate-900/50 border-slate-700'; // Info/Minor
        }
    };

    return (
        <div
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-[4000] max-w-[90%] w-auto transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
                ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-90 pointer-events-none'}
            `}
        >
            <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center justify-center space-x-3 ${getColors(data.severity)}`}>
                <span className="text-2xl animate-pulse">⚠️</span>
                <span className={`font-black uppercase tracking-wider text-sm ${data.severity === 'MODERATE' ? 'text-black' : 'text-white'}`}>
                    {data.message}
                </span>
            </div>
        </div>
    );
};

export default WarningToast;
