
import React, { useState } from 'react';
import { SupportIcon, ArrowLeftIcon, CallIcon, MailIcon, AlertTriangleIcon, ChatIcon, SendIcon, XIcon } from '../components/icons';
import { syncService } from '../utils/sync';
import { auth } from '../utils/firebase';
import type { Feedback } from '../types';

interface SupportScreenProps {
    onBack?: () => void;
}

const CUSTOMER_SUPPORT_NUMBER = '+61434712612';
const EMERGENCY_NUMBER = '000';

const FAQS = [
    {
        q: "How are my points calculated?",
        a: "You earn approximately 15 points per kilometer driven safely. Deductions occur for speeding, harsh braking, or phone usage."
    },
    {
        q: "What is 'Harsh Braking'?",
        a: "A sudden decrease in speed (more than 8.5 m/s²). Anticipate stops to avoid this penalty."
    },
    {
        q: "I was flagged for speeding but wasn't!",
        a: "GPS drift can happen. You can dispute specific penalties in the Trip Details screen after your drive."
    },
    {
        q: "How do I redeem rewards?",
        a: "Go to the Rewards tab, tap on a partner offer, and if you have enough points, you'll get a unique code."
    }
];

const SupportScreen: React.FC<SupportScreenProps> = ({ onBack }) => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    
    // Feedback Modal State
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'general'>('general');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitFeedback = async () => {
        if (!feedbackMessage.trim()) return;
        
        // Guest check
        if (!auth.currentUser) {
            alert("Please create an account to submit feedback.");
            return;
        }

        setIsSubmitting(true);
        try {
            const feedback: Feedback = {
                id: '', // Set by Firestore
                category: feedbackCategory,
                message: feedbackMessage,
                timestamp: Date.now(),
                status: 'new',
                userEmail: auth.currentUser.email || 'Unknown'
            };

            await syncService.add('feedback', feedback);
            
            alert("Feedback sent! Thank you for helping us improve.");
            setShowFeedback(false);
            setFeedbackMessage('');
            setFeedbackCategory('general');
        } catch (e) {
            console.error(e);
            alert("Failed to send feedback. Please check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative h-[100dvh] flex flex-col bg-slate-50 dark:bg-dark-950 overflow-hidden">
            {/* Emergency Banner */}
            <div className="flex-shrink-0 bg-red-600 text-white px-6 py-3 shadow-md flex items-center justify-between z-10">
                <div className="flex items-center animate-pulse">
                    <AlertTriangleIcon className="w-6 h-6 mr-2" />
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider">Emergency</h2>
                        <p className="text-[10px] opacity-90">Immediate Assistance</p>
                    </div>
                </div>
                <a href={`tel:${EMERGENCY_NUMBER}`} className="bg-white text-red-600 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-red-50 transition-colors shadow-sm">
                    Call 000
                </a>
            </div>

            {/* Header */}
            <header className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl flex items-center space-x-3 z-10">
                {onBack && (
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-white">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                )}
                <div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Help Center</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Support & FAQs</p>
                </div>
            </header>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Contact Options */}
                <div className="grid grid-cols-2 gap-4">
                    <a href={`tel:${CUSTOMER_SUPPORT_NUMBER}`} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-cyan-500 transition-colors">
                        <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center mb-3 text-cyan-600 dark:text-cyan-400">
                            <CallIcon className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">Call Us</span>
                    </a>
                    <button onClick={() => setShowFeedback(true)} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-purple transition-colors">
                        <div className="w-12 h-12 bg-purple/10 rounded-full flex items-center justify-center mb-3 text-purple">
                            <ChatIcon className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">Feedback</span>
                    </button>
                </div>

                {/* FAQ Section */}
                <div>
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Common Questions</h2>
                    <div className="space-y-3">
                        {FAQS.map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                                <button 
                                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                    className="w-full flex items-center justify-between p-4 text-left font-bold text-slate-900 dark:text-white text-sm"
                                >
                                    {item.q}
                                    <span className={`transform transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                {openFaq === idx && (
                                    <div className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl text-center">
                    <p className="text-xs text-slate-500">App Version 1.2.0 • Build 2024.10</p>
                </div>
            </div>

            {/* Feedback Modal Overlay */}
            {showFeedback && (
                <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
                    <div className="bg-white dark:bg-dark-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-white/10">
                        <button 
                            onClick={() => setShowFeedback(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Share Feedback</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Found a bug? Have a feature request?</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                                {['general', 'bug', 'feature'].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setFeedbackCategory(cat as any)}
                                        className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all ${
                                            feedbackCategory === cat 
                                            ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' 
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <textarea 
                                value={feedbackMessage}
                                onChange={(e) => setFeedbackMessage(e.target.value)}
                                placeholder="Describe your experience..."
                                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-cyan resize-none"
                            />

                            <button 
                                onClick={handleSubmitFeedback}
                                disabled={isSubmitting || !feedbackMessage.trim()}
                                className="w-full py-3 bg-brand-cyan text-black font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center disabled:opacity-50 disabled:grayscale"
                            >
                                {isSubmitting ? (
                                    <span className="animate-pulse">Sending...</span>
                                ) : (
                                    <>
                                        <SendIcon className="w-4 h-4 mr-2" /> Send Feedback
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportScreen;
