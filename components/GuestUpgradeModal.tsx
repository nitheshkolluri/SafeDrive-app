
import React, { useState } from 'react';
import { MailIcon, LockIcon, CallIcon, UserIcon, ArrowRightIcon, ChatIcon } from './icons';
import { mockAuth } from '../utils/mockAuth';
import type { User } from '../types';

interface GuestUpgradeModalProps {
    currentUser: User;
    onSuccess: (user: User) => void;
    onCancel: () => void;
}

const GuestUpgradeModal: React.FC<GuestUpgradeModalProps> = ({ currentUser, onSuccess, onCancel }) => {
    const [step, setStep] = useState<'details' | 'verify'>('details');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(currentUser.name);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // OTP Simulation
    const [showToast, setShowToast] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (!email || !phone || !password || !name) {
            setError("All fields are required.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setIsLoading(true);
        try {
            // Generate OTP
            const code = await mockAuth.generateOtp(phone);
            setGeneratedCode(code);
            setStep('verify');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 6000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAndUpgrade = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await mockAuth.verifyOtp(phone, otp);
            // Call upgrade logic
            const updatedUser = await mockAuth.upgradeGuest(
                currentUser.id || '', 
                email, 
                password, 
                name, 
                phone
            );
            onSuccess(updatedUser);
        } catch (err: any) {
            setError(err.message || "Verification failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
            
            {/* OTP Toast Simulation */}
            <div className={`fixed top-6 left-4 right-4 z-[5100] transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-[200%] opacity-0'}`}>
                <div className="max-w-md mx-auto bg-white text-slate-900 p-4 rounded-2xl shadow-2xl flex items-start gap-3 cursor-pointer" onClick={() => { setOtp(generatedCode); setShowToast(false); }}>
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ChatIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">Your code: <span className="text-xl ml-1">{generatedCode}</span></p>
                        <p className="text-xs text-slate-500">Tap to fill</p>
                    </div>
                </div>
            </div>

            <div className="bg-dark-900 w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
                
                <button onClick={onCancel} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">
                    ✕
                </button>

                <div className="p-8 text-center border-b border-white/5 bg-white/5">
                    <h2 className="text-2xl font-bold text-white">Save Progress</h2>
                    <p className="text-sm text-slate-400 mt-1">Create a secure account to keep your rewards.</p>
                </div>

                <div className="p-8">
                    {step === 'details' ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-xl py-3 pl-10 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="Username" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                                <div className="relative">
                                    <MailIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-xl py-3 pl-10 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="you@example.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mobile</label>
                                <div className="relative">
                                    <CallIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-xl py-3 pl-10 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="+61..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                                <div className="relative">
                                    <LockIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-dark-950 border border-white/10 rounded-xl py-3 pl-10 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="Min 8 chars" />
                                </div>
                            </div>

                            {error && <p className="text-xs text-red-400 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

                            <button disabled={isLoading} type="submit" className="w-full py-4 bg-gradient-aurora text-white font-bold rounded-xl mt-2 hover:shadow-lg transition-all disabled:opacity-50 flex justify-center">
                                {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : 'Verify & Create'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyAndUpgrade} className="space-y-6 text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                                <LockIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-white font-bold">Enter Verification Code</p>
                                <p className="text-xs text-slate-400 mt-1">Sent to {phone}</p>
                            </div>
                            
                            <input 
                                type="text" 
                                value={otp} 
                                onChange={e => setOtp(e.target.value)} 
                                placeholder="000000" 
                                className="w-full text-center text-2xl tracking-[0.5em] bg-dark-950 border border-white/10 rounded-xl py-4 text-white outline-none focus:border-green-500 transition-colors font-mono"
                                maxLength={6}
                            />

                            {error && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg">{error}</p>}

                            <button disabled={isLoading} type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-colors disabled:opacity-50 flex justify-center">
                                {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : 'Confirm Account'}
                            </button>
                            
                            <button type="button" onClick={() => setStep('details')} className="text-xs text-slate-500 hover:text-white">
                                Incorrect details? Go Back
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuestUpgradeModal;
