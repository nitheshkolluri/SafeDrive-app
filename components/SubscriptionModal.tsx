import React, { useState } from 'react';
import { XIcon, CheckCircleIcon, CrownIcon, CreditCardIcon, LockIcon } from './icons';
import { userRepository } from '../utils/userRepository';
import { auth } from '../utils/firebase';

interface SubscriptionModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

// Updated Pricing to reflect modern SaaS trends
const PLANS = [
    { id: 'monthly', name: 'Monthly Access', price: '$9.99', period: '/mo', tag: 'Flexible' },
    { id: 'yearly', name: 'Annual Pro', price: '$59.99', period: '/yr', tag: 'Best Value', popular: true }
];

const FEATURES = [
    "ATO-Compliant CSV Logbook Exports",
    "Unlimited Cloud Trip History",
    "Advanced Driving Analytics & Insights",
    "Priority 24/7 Support",
    "Ad-Free Experience"
];

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, onSuccess }) => {
    const [selectedPlan, setSelectedPlan] = useState('yearly');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubscribe = async () => {
        setIsProcessing(true);
        // Mock Payment Delay
        setTimeout(async () => {
            if (auth.currentUser) {
                await userRepository.setPremiumStatus(auth.currentUser.uid, true);
                setIsProcessing(false);
                onSuccess();
            } else {
                 // Guest Fallback simulation
                 setIsProcessing(false);
                 onSuccess();
            }
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[7000] bg-black/60 dark:bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-dark-900 w-full max-w-sm rounded-[32px] border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden ring-1 ring-black/5 dark:ring-white/10 transition-colors duration-300">
                
                {/* Background Decor */}
                <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-brand-purple/10 dark:from-brand-purple/20 to-transparent pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-cyan/10 dark:bg-brand-cyan/20 rounded-full blur-3xl pointer-events-none" />

                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-black/20 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white z-20 transition-all backdrop-blur-md">
                    <XIcon className="w-5 h-5" />
                </button>

                {/* Hero */}
                <div className="pt-10 pb-6 px-6 text-center relative z-10">
                    <div className="w-20 h-20 bg-gradient-lux rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-purple/30 transform rotate-3 border border-white/20">
                        <CrownIcon className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Upgrade to <span className="text-brand-cyan">Pro</span></h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Unlock full potential and professional tools.</p>
                </div>

                {/* Features */}
                <div className="px-8 space-y-4 mb-8 relative z-10">
                    {FEATURES.map((feat, idx) => (
                        <div key={idx} className="flex items-start space-x-3 text-sm text-slate-600 dark:text-slate-300">
                            <CheckCircleIcon className="w-5 h-5 text-brand-cyan flex-shrink-0" />
                            <span className="leading-snug">{feat}</span>
                        </div>
                    ))}
                </div>

                {/* Plans */}
                <div className="px-6 space-y-3 mb-6 relative z-10">
                    {PLANS.map(plan => (
                        <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${
                                selectedPlan === plan.id 
                                ? 'bg-brand-purple/10 border-brand-purple shadow-lg shadow-brand-purple/20' 
                                : 'bg-slate-50 dark:bg-white/5 border-transparent hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-200 dark:hover:border-white/10'
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 bg-brand-cyan text-black text-[9px] font-black px-2 py-1 rounded-bl-xl uppercase tracking-wider">
                                    Popular
                                </div>
                            )}
                            
                            <div className="text-left">
                                <p className={`font-bold text-base ${selectedPlan === plan.id ? 'text-brand-purple dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>{plan.name}</p>
                                {plan.tag && !plan.popular && <span className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">{plan.tag}</span>}
                            </div>
                            <div className="text-right">
                                <div className="flex items-baseline justify-end">
                                    <span className={`text-xl font-black ${selectedPlan === plan.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>{plan.price}</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-1">{plan.period}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* CTA */}
                <div className="p-6 pt-0 relative z-10">
                    <button 
                        onClick={handleSubscribe}
                        disabled={isProcessing}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/10 flex items-center justify-center text-lg"
                    >
                        {isProcessing ? (
                            <span className="animate-pulse flex items-center"><div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin mr-2"/>Processing...</span>
                        ) : (
                            <>
                                <CreditCardIcon className="w-5 h-5 mr-2" /> 
                                Subscribe & Export
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-4 flex justify-center items-center">
                        <LockIcon className="w-3 h-3 mr-1" /> Secure payment via Stripe. Cancel anytime.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;