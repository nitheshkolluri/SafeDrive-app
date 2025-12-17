import React, { useState } from 'react';
import type { Vehicle, User } from '../types';
import { useFirestoreCollection, syncService } from '../utils/sync';
import { XIcon, CarIcon, FuelIcon, TrashIcon, ArrowLeftIcon, PlusIcon, WrenchIcon, AlertTriangleIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import LogbookModal from './LogbookModal';
import { auth } from '../utils/firebase';

interface GarageModalProps {
    onClose: () => void;
    user: User;
}

const GarageModal: React.FC<GarageModalProps> = ({ onClose, user }) => {
    const isGuest = user.isGuest;
    const { data: cloudVehicles } = useFirestoreCollection<Vehicle>('vehicles', [], 'vehicles');
    const [localVehicles, setLocalVehicles] = useLocalStorage<Vehicle[]>('vehicles', []);
    
    const allVehicles = isGuest ? localVehicles : cloudVehicles;
    const vehicles = allVehicles.filter(v => !v.deletedAt);

    const [viewMode, setViewMode] = useState<'list' | 'add'>('list');
    const [showLogbookFor, setShowLogbookFor] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [odometer, setOdometer] = useState('');

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!auth.currentUser && !isGuest) {
             alert("Waiting for connection...");
             return;
        }

        if (!make.trim() || !model.trim() || !year.trim() || odometer === '') {
            alert("Please fill in all fields.");
            return;
        }

        setIsSaving(true);

        try {
            const newVehicle: Vehicle = {
                id: isGuest ? Date.now().toString() : '', 
                make,
                model,
                year,
                odometer: parseInt(odometer),
                lastServiceDate: Date.now(),
                nextServiceDueKm: parseInt(odometer) + 5000,
                lastOilChangeKm: parseInt(odometer),
                lastTireRotationKm: parseInt(odometer)
            };

            if (isGuest) {
                setLocalVehicles([...localVehicles, newVehicle]);
            } else {
                await syncService.add('vehicles', newVehicle);
            }

            setMake(''); setModel(''); setYear(''); setOdometer('');
            setViewMode('list');
        } catch (error: any) {
            console.error("Failed to add vehicle:", error);
            alert(error.message || "Save failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async (id: string) => {
        const retentionPeriod = 30 * 24 * 60 * 60 * 1000; 
        const deleteMetadata = {
            deletedAt: Date.now(),
            permanentDeleteDue: Date.now() + retentionPeriod
        };

        try {
            if (isGuest) {
                const updated = localVehicles.map(v => v.id === id ? { ...v, ...deleteMetadata } : v);
                setLocalVehicles(updated);
            } else {
                if (!auth.currentUser) throw new Error("Not authenticated");
                await syncService.update('vehicles', id, deleteMetadata);
            }
            setDeleteConfirmId(null);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete vehicle.");
        }
    };

    const getHealthColor = (lastKm: number, interval: number, currentKm: number) => {
        const diff = currentKm - lastKm;
        const health = Math.max(0, 100 - (diff / interval) * 100);
        if (health < 20) return 'bg-red-500';
        if (health < 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    if (showLogbookFor) {
        return <LogbookModal onClose={() => setShowLogbookFor(null)} preselectedVehicleId={showLogbookFor} />;
    }

    return (
        <div className="fixed inset-0 z-[6000] bg-black/60 dark:bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-dark-900 w-full sm:max-w-md h-[95dvh] sm:h-[85vh] rounded-t-[32px] sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden transition-colors duration-300">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5 flex-shrink-0 transition-colors">
                    {viewMode === 'add' ? (
                        <div className="flex items-center">
                            <button onClick={() => setViewMode('list')} className="mr-3 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                <ArrowLeftIcon className="w-5 h-5 text-slate-900 dark:text-white" />
                            </button>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white font-display">Add Vehicle</h2>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-brand-cyan/10 dark:bg-brand-cyan/20 rounded-xl text-brand-cyan">
                                <CarIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white font-display">Garage</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Manage Fleet</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                        {viewMode === 'list' && (
                            <button onClick={() => setViewMode('add')} className="p-2 rounded-full bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan transition-colors">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white transition-colors">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-dark-950/50">
                    {viewMode === 'list' && (
                        <div className="space-y-6 pb-20 sm:pb-0">
                            
                            {/* Empty State */}
                            {vehicles.length === 0 && (
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/5">
                                        <CarIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Vehicles Yet</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Add a car to track maintenance and mileage.</p>
                                    <button 
                                        onClick={() => setViewMode('add')}
                                        className="px-6 py-3 bg-brand-cyan text-black font-bold rounded-xl shadow-lg hover:bg-cyan-400 transition-colors"
                                    >
                                        Add First Vehicle
                                    </button>
                                </div>
                            )}

                            {vehicles.map(v => (
                                <div key={v.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[28px] p-5 shadow-xl shadow-slate-200/50 dark:shadow-none relative group transition-all backdrop-blur-sm">
                                    
                                    {deleteConfirmId === v.id && (
                                        <div className="absolute inset-0 bg-red-50/95 dark:bg-red-950/95 backdrop-blur-md z-20 rounded-[28px] flex flex-col items-center justify-center p-6 text-center animate-fade-in-up border border-red-200 dark:border-red-500/30">
                                            <AlertTriangleIcon className="w-10 h-10 text-red-500 dark:text-red-400 mb-3" />
                                            <h4 className="text-lg font-bold text-red-900 dark:text-white mb-1">Remove Vehicle?</h4>
                                            <p className="text-xs text-red-600 dark:text-red-200 mb-4">Moves to trash. Permanent delete in 30 days.</p>
                                            <div className="flex space-x-2 w-full">
                                                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-white dark:bg-white/10 border border-red-200 dark:border-transparent rounded-xl font-bold text-slate-900 dark:text-white text-xs">Keep</button>
                                                <button onClick={() => confirmDelete(v.id)} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl text-xs shadow-lg">Delete</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-cyan mb-1 font-display">{v.year}</div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight font-display">{v.make} <span className="font-normal text-slate-500 dark:text-slate-400 font-sans">{v.model}</span></h3>
                                            <p className="text-xs font-mono text-slate-500 mt-1">{v.odometer.toLocaleString()} km</p>
                                        </div>
                                        <button onClick={() => setDeleteConfirmId(v.id)} className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-50 dark:bg-dark-950 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                                <span className="flex items-center"><FuelIcon className="w-3 h-3 mr-1" /> Oil</span>
                                                <span className={`${getHealthColor(v.lastOilChangeKm || 0, 10000, v.odometer).replace('bg-', 'text-')}`}>Health</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${getHealthColor(v.lastOilChangeKm || 0, 10000, v.odometer)}`} style={{ width: '80%' }} />
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-dark-950 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                                <span className="flex items-center"><WrenchIcon className="w-3 h-3 mr-1" /> Tires</span>
                                                <span className={`${getHealthColor(v.lastTireRotationKm || 0, 12000, v.odometer).replace('bg-', 'text-')}`}>Health</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${getHealthColor(v.lastTireRotationKm || 0, 12000, v.odometer)}`} style={{ width: '60%' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={() => setShowLogbookFor(v.id)} className="w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold rounded-xl border border-slate-200 dark:border-white/5 transition-all text-xs">
                                        Open Logbook
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'add' && (
                        <form onSubmit={handleAddVehicle} className="space-y-4 animate-fade-in-up">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-[28px] space-y-4 shadow-lg shadow-slate-200/50 dark:shadow-none">
                                <input value={make} onChange={e => setMake(e.target.value)} className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-slate-900 dark:text-white outline-none focus:border-brand-cyan font-bold transition-all text-sm" placeholder="Make (e.g. Toyota)" autoFocus />
                                <input value={model} onChange={e => setModel(e.target.value)} className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-slate-900 dark:text-white outline-none focus:border-brand-cyan font-bold transition-all text-sm" placeholder="Model (e.g. Camry)" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-slate-900 dark:text-white outline-none focus:border-brand-cyan font-mono transition-all text-sm" placeholder="Year" />
                                    <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-slate-900 dark:text-white outline-none focus:border-brand-cyan font-mono transition-all text-sm" placeholder="Odometer" />
                                </div>
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full py-4 bg-brand-cyan text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center">
                                {isSaving ? 'Saving...' : 'Add to Garage'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GarageModal;