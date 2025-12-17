
import React, { useState } from 'react';
import { circleRepository } from '../utils/circleRepository';
import { XIcon, UsersIcon } from './icons';

interface CreateCircleModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateCircleModal: React.FC<CreateCircleModalProps> = ({ onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await circleRepository.createCircle(name.trim());
            onSuccess();
        } catch (e: any) {
            alert(e.message || "Failed to create circle.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">New Squad</h3>
                    <button onClick={onClose}><XIcon className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-white/20">
                        <UsersIcon className="w-8 h-8 text-slate-400" />
                    </div>
                </div>

                <input 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Squad Name (e.g. The Millers)"
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-lg font-bold text-slate-900 dark:text-white outline-none focus:border-brand-cyan mb-4"
                    autoFocus
                />

                <button 
                    onClick={handleCreate}
                    disabled={!name.trim() || loading}
                    className="w-full py-4 bg-brand-cyan text-black font-bold rounded-xl shadow-lg disabled:opacity-50"
                >
                    {loading ? 'Creating...' : 'Create & Invite'}
                </button>
            </div>
        </div>
    );
};

export default CreateCircleModal;
