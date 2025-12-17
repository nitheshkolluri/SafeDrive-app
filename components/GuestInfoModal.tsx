import React, { useState } from 'react';

interface GuestInfoModalProps {
    onSubmit: (data: { name: string, email?: string, contact?: string }) => void;
    onCancel: () => void;
}

const GuestInfoModal: React.FC<GuestInfoModalProps> = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [contact, setContact] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) {
            setError('Username is required.');
            return;
        }
        setError('');
        onSubmit({ 
            name: name.trim(), 
            email: email.trim() || undefined,
            contact: contact.trim() || undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-dark-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
                <h2 className="text-xl font-bold text-white text-center">Guest Information</h2>
                <p className="text-sm text-gray-300 text-center">
                    Just a username is needed to get started. Your data will be stored locally.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-gray-400">Username <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-dark-950 rounded-md outline-none border border-white/10 focus:ring-2 focus:ring-accent-400"
                            placeholder="e.g., SpeedyGonzales"
                        />
                         {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400">Email (Optional)</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-dark-950 rounded-md outline-none border border-white/10 focus:ring-2 focus:ring-accent-400"
                            placeholder="For account recovery"
                        />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-400">Contact (Optional)</label>
                        <input
                            type="tel"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-dark-950 rounded-md outline-none border border-white/10 focus:ring-2 focus:ring-accent-400"
                            placeholder="For support"
                        />
                    </div>
                </div>
                <div className="flex space-x-3 pt-2">
                    <button onClick={onCancel} className="w-full py-2 font-semibold bg-white/10 rounded-lg hover:bg-white/20">Cancel</button>
                    <button onClick={handleSubmit} className="w-full py-2 font-semibold text-white bg-gradient-aurora rounded-lg hover:scale-105 transition-transform">Start Driving</button>
                </div>
            </div>
        </div>
    );
};

export default GuestInfoModal;