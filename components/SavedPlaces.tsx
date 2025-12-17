import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { SavedPlace, LatLng, LocationPoint } from '../types';
import { XIcon, HomeIcon, BriefcaseIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useFirestoreCollection, syncService } from '../utils/sync';
import { auth } from '../utils/firebase';
import GooglePlacesInput from './GooglePlacesInput';

interface SavedPlacesProps {
    onSelect: (point: LocationPoint) => void;
    currentLocation: LatLng | undefined;
}

type AddMode = 'Home' | 'Work';

const SavedPlaces: React.FC<SavedPlacesProps> = ({ onSelect, currentLocation }) => {
    // Determine data source
    const isGuest = !auth.currentUser;
    
    // UPDATED: Added fallback cache key 'saved-places' to ensure data appears even if offline/loading
    const { data: cloudPlaces } = useFirestoreCollection<SavedPlace>('saved_places', [], 'saved-places');
    const [localPlaces, setLocalPlaces] = useLocalStorage<SavedPlace[]>('saved-places', []);
    
    const savedPlaces = isGuest ? localPlaces : cloudPlaces;

    const [isAdding, setIsAdding] = useState(false);
    const [addMode, setAddMode] = useState<AddMode>('Home');
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlace, setSelectedPlace] = useState<{ name: string, coords: LatLng } | null>(null);

    const homePlace = savedPlaces.find(p => p.name === 'Home');
    const workPlace = savedPlaces.find(p => p.name === 'Work');

    const handleAddClick = (mode: AddMode) => {
        setAddMode(mode);
        setIsAdding(true);
        setSearchQuery('');
        setSelectedPlace(null);
    };

    const handlePlaceSelect = (result: { name: string, coords: LatLng }) => {
        setSelectedPlace(result);
        setSearchQuery(result.name);
    };

    const confirmAdd = async () => {
        if (!searchQuery.trim()) {
            setIsAdding(false);
            return;
        }
        
        let finalCoords = selectedPlace?.coords;
        if (!finalCoords && currentLocation) {
            finalCoords = currentLocation;
        }

        if (!finalCoords) {
            alert("Please select a location from the list.");
            return;
        }

        const newPlace: SavedPlace = {
            id: isGuest ? Date.now().toString() : '', // ID managed by Firestore or Local
            name: addMode,
            address: searchQuery,
            coords: finalCoords,
            icon: addMode === 'Home' ? '🏠' : '💼'
        };

        if (isGuest) {
            // Remove existing if overwriting Home/Work locally
            const filtered = localPlaces.filter(p => p.name !== addMode);
            setLocalPlaces([...filtered, newPlace]);
        } else {
            // Check for existing cloud doc to update or create
            const existing = savedPlaces.find(p => p.name === addMode);
            if (existing) {
                await syncService.update('saved_places', existing.id, newPlace);
            } else {
                await syncService.add('saved_places', newPlace);
            }
        }
        
        setIsAdding(false);
        setSearchQuery('');
        setSelectedPlace(null);
    };

    const removePlace = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Clear this saved location?")) {
            if (isGuest) {
                setLocalPlaces(localPlaces.filter(p => p.id !== id));
            } else {
                await syncService.delete('saved_places', id);
            }
        }
    };

    const renderCard = (type: 'Home' | 'Work', Icon: React.ElementType, place?: SavedPlace) => {
        const isSet = !!place;
        return (
            <button
                onClick={() => isSet ? onSelect({ name: place.name, coords: place.coords }) : handleAddClick(type)}
                className={`relative flex items-center p-4 h-20 w-full rounded-2xl transition-all duration-300 group overflow-hidden text-left shadow-sm
                    ${isSet 
                        ? 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-cyan-400/50 hover:shadow-md' 
                        : 'bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'}
                `}
            >
                <div className={`flex-shrink-0 p-3 rounded-xl mr-4 transition-colors ${isSet ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-grow min-w-0">
                    <span className={`block text-sm font-bold ${isSet ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                        {type}
                    </span>
                    {isSet ? (
                         <p className="text-xs text-slate-500 dark:text-slate-400 truncate opacity-80">{place.address.split(',')[0]}</p>
                    ) : (
                         <p className="text-[10px] text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Set Location</p>
                    )}
                </div>

                {isSet && (
                    <div 
                        onClick={(e) => removePlace(e, place.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2"
                    >
                        <XIcon className="w-4 h-4" />
                    </div>
                )}
            </button>
        );
    };

    // Modal Content rendering via Portal
    const modalContent = (
        <div className="fixed inset-0 z-[9999] bg-dark-950/95 backdrop-blur-xl flex flex-col animate-fade-in-up h-[100dvh]">
            <div className="flex-1 w-full max-w-lg mx-auto flex flex-col h-full overflow-hidden px-4 pt-safe">
                
                {/* Header */}
                <div className="flex-shrink-0 flex justify-between items-center py-6">
                    <h3 className="text-2xl font-black text-white">Set {addMode}</h3>
                    <button 
                        onClick={() => setIsAdding(false)} 
                        className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto min-h-0 pb-40 px-1 scroll-smooth">
                    {/* Input Container */}
                    <div className="relative z-[100] mb-6">
                        <GooglePlacesInput 
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            onResultSelect={handlePlaceSelect}
                            placeholder={`Search ${addMode} address...`}
                            userLocation={currentLocation ? { latitude: currentLocation.lat, longitude: currentLocation.lng } as any : null}
                            autoFocus
                            className="w-full"
                        />
                    </div>
                    
                    {/* Status Display */}
                     {selectedPlace ? (
                         <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-6 animate-fade-in-up">
                            <p className="text-xs font-bold text-green-400 uppercase mb-1">Selected Location</p>
                            <p className="text-white font-medium">{selectedPlace.name}</p>
                         </div>
                     ) : (
                         <div className="p-4 bg-white/5 border border-white/5 rounded-xl mb-6">
                            <p className="text-sm text-slate-400 text-center">
                                Search and select a location from the suggestions list.
                            </p>
                         </div>
                     )}

                    {/* Action Buttons - Inline Flow (Better for Mobile Keyboards) */}
                    <div className="space-y-3">
                        <button 
                            onClick={confirmAdd}
                            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-aurora shadow-lg hover:scale-[1.02] transition-all text-lg disabled:opacity-50 disabled:grayscale"
                            disabled={!selectedPlace}
                        >
                            Save {addMode}
                        </button>
                         <button 
                            onClick={() => setIsAdding(false)}
                            className="w-full py-4 rounded-xl font-bold text-slate-400 hover:text-white transition-colors bg-white/5"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full">
             {/* Render Modal via Portal to Body to escape stacking contexts */}
             {isAdding && createPortal(modalContent, document.body)}

            {/* Primary Grid for Home/Work */}
            <div className="grid grid-cols-2 gap-3">
                {renderCard('Home', HomeIcon, homePlace)}
                {renderCard('Work', BriefcaseIcon, workPlace)}
            </div>
        </div>
    );
};

export default SavedPlaces;