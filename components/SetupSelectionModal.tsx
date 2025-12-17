
import React from 'react';
import { SetupMode } from '../types';

interface SetupSelectionModalProps {
    onSelect: (mode: SetupMode) => void;
    onCancel: () => void;
}

const SetupOption: React.FC<{ 
    title: string, 
    description: string, 
    onClick?: () => void, 
    icon: string, 
    recommended?: boolean, 
    disabled?: boolean,
    tag?: string
}> = ({ title, description, onClick, icon, recommended, disabled, tag }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`w-full text-left p-4 rounded-2xl transition-all border group relative overflow-hidden 
            ${disabled ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/5' : 
              recommended ? 'bg-brand-cyan/10 border-brand-cyan/50 hover:bg-brand-cyan/20' : 
              'bg-white/5 border-white/10 hover:bg-white/10'}
        `}
    >
        {recommended && (
            <div className="absolute top-0 right-0 bg-brand-cyan text-black text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase">
                Recommended
            </div>
        )}
        {tag && (
            <div className="absolute top-0 right-0 bg-slate-700 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase">
                {tag}
            </div>
        )}
        <div className="flex items-start space-x-3 relative z-10">
            <div className="text-2xl grayscale group-hover:grayscale-0 transition-all">{icon}</div>
            <div>
                <h3 className={`font-bold ${recommended ? 'text-brand-cyan' : 'text-white'}`}>{title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
            </div>
        </div>
    </button>
);

const SetupSelectionModal: React.FC<SetupSelectionModalProps> = ({ onSelect, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-dark-900 border border-white/10 rounded-3xl p-6 text-center max-w-sm w-full space-y-4 animate-fade-in-up shadow-2xl">
                <div className="mb-2">
                    <h2 className="text-xl font-bold text-white">Select Drive Mode</h2>
                    <p className="text-sm text-slate-400">
                        Choose how your device is positioned.
                    </p>
                </div>
                
                <div className="space-y-3">
                    <SetupOption 
                        title="Pro / Mount"
                        description="Fixed on dashboard. Maximum accuracy & full rewards. Strict verification."
                        icon="🛡️"
                        recommended
                        onClick={() => onSelect('mount')}
                    />
                    <SetupOption 
                        title="CarPlay / Pocket"
                        description="Connects to vehicle screen. Background tracking only."
                        icon="🚗"
                        disabled
                        tag="Coming Soon"
                    />
                    <SetupOption 
                        title="Passenger"
                        description="Navigation only. No scoring or safety tracking."
                        icon="👤"
                        onClick={() => onSelect('passenger')}
                    />
                </div>

                <button onClick={onCancel} className="w-full mt-2 py-3 text-slate-400 font-semibold hover:text-white transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default SetupSelectionModal;
