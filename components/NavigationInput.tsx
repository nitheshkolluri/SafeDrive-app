
import React, { useState, useEffect } from 'react';
import type { LatLng, LocationPoint, GeolocationData } from '../types';
import { MapPinIcon, ArrowLeftIcon } from './icons';
import GooglePlacesInput from './GooglePlacesInput';

interface NavigationInputProps {
    startPoint: LocationPoint | null;
    destinationPoint: LocationPoint | null;
    onStartChange: (point: LocationPoint | null) => void;
    onDestinationChange: (point: LocationPoint | null) => void;
    onClear: () => void;
    onClose: () => void;
    autoFocusDestination?: boolean;
    userLocation: GeolocationData | null;
}

const NavigationInput: React.FC<NavigationInputProps> = ({
    startPoint,
    destinationPoint,
    onStartChange,
    onDestinationChange,
    onClear,
    onClose,
    autoFocusDestination,
    userLocation
}) => {
    const [startQuery, setStartQuery] = useState(startPoint?.name || '');
    const [destQuery, setDestQuery] = useState(destinationPoint?.name || '');

    useEffect(() => {
        setStartQuery(startPoint?.name || '');
    }, [startPoint]);

    useEffect(() => {
        setDestQuery(destinationPoint?.name || '');
    }, [destinationPoint]);

    const handleStartSelect = (result: { name: string, coords: LatLng }) => {
        setStartQuery(result.name);
        if (onStartChange) onStartChange({ name: result.name, coords: result.coords });
    };

    const handleDestSelect = (result: { name: string, coords: LatLng }) => {
        setDestQuery(result.name);
        if (onDestinationChange) onDestinationChange({ name: result.name, coords: result.coords });
    };

    return (
        <div className="w-full flex flex-col h-full">
             <div className="flex items-center space-x-3 mb-4">
                <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                     <ArrowLeftIcon className="w-5 h-5 text-slate-700 dark:text-white" />
                </button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Plan Trip</h2>
            </div>

            <div className="relative flex-1">
                 {/* Connecting Line */}
                 <div className="absolute left-[22px] top-10 bottom-[calc(100%-110px)] w-0.5 bg-slate-200 dark:bg-slate-700 z-0" />

                <div className="space-y-3 relative z-10">
                    <GooglePlacesInput
                        value={startQuery}
                        onValueChange={setStartQuery}
                        onResultSelect={handleStartSelect}
                        placeholder="Start Location"
                        icon={<div className="w-3 h-3 rounded-full border-2 border-slate-500 bg-white dark:bg-dark-900" />}
                        userLocation={userLocation}
                    />
                    <GooglePlacesInput
                        value={destQuery}
                        onValueChange={setDestQuery}
                        onResultSelect={handleDestSelect}
                        placeholder="Choose destination"
                        icon={<MapPinIcon className="w-5 h-5 text-red-500" />}
                        autoFocus={autoFocusDestination}
                        userLocation={userLocation}
                    />
                </div>
            </div>
        </div>
    );
};

export default NavigationInput;
