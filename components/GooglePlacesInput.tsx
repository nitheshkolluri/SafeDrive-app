
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LatLng, GeolocationData } from '../types';
import { MapPinIcon, XIcon, MicIcon } from './icons';
import { GOOGLE_MAPS_API_KEY } from '../utils/config';

interface GooglePlacesInputProps {
    value: string;
    onValueChange: (value: string) => void;
    onResultSelect: (result: { name: string, coords: LatLng }) => void;
    placeholder: string;
    icon?: React.ReactNode;
    autoFocus?: boolean;
    userLocation: GeolocationData | null;
    className?: string;
}

const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({ 
    value, 
    onValueChange, 
    onResultSelect, 
    placeholder, 
    icon, 
    autoFocus = false, 
    userLocation,
    className
}) => {
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const startVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                if (onValueChange) onValueChange(transcript);
                search(transcript); 
            }
        };

        recognition.start();
    };

    const search = useCallback(async (query: string) => {
        if (!query || !query.trim()) {
            setResults([]);
            return;
        }
        
        const apiKey = GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error("Missing Google Maps API Key in env.");
            return;
        }

        setIsLoading(true);

        try {
            const requestBody: any = {
                input: query,
                languageCode: "en-US" // Explicitly request English results
            };

            if (userLocation) {
                requestBody.locationBias = {
                    circle: {
                        center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
                        radius: 50000 
                    }
                };
            }

            const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            if (data.suggestions) {
                setResults(data.suggestions.map((s: any) => s.placePrediction));
            } else {
                setResults([]);
            }
        } catch (e) {
            console.error("Places API Error:", e);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [userLocation]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        if (onValueChange) {
            onValueChange(query);
        }
        const timer = setTimeout(() => search(query), 300);
        return () => clearTimeout(timer);
    };

    const handleClear = () => {
        if (onValueChange) onValueChange('');
        setResults([]);
        inputRef.current?.focus();
    };

    const handleSelect = async (prediction: any) => {
        try {
            const apiKey = GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) return;

            const placeId = prediction.placeId;
            // Use languageCode in header to ensure details (including name) are in English
            const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=location,displayName&languageCode=en-US`, {
                headers: {
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'location,displayName'
                }
            });
            
            const place = await response.json();

            if (place.location) {
                const name = place.displayName?.text || prediction.structuredFormat?.mainText?.text || "Selected Location";
                
                if (onValueChange) onValueChange(name);
                
                onResultSelect({
                    name: name,
                    coords: { 
                        lat: place.location.latitude, 
                        lng: place.location.longitude 
                    }
                });
                setResults([]);
                setIsFocused(false);
            }
        } catch (e) {
            console.error("Place Details Error:", e);
        }
    };

    return (
        <div className={`relative w-full ${className}`}>
            <div className="flex items-center w-full bg-white dark:bg-dark-900/80 rounded-md border border-slate-200 dark:border-slate-700 transition-colors">
                {icon && <div className="absolute left-3 text-slate-400 flex items-center justify-center w-5 h-5">{icon}</div>}
                <input
                    ref={inputRef}
                    type="text"
                    value={value || ''}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder={placeholder}
                    className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-10 py-3 bg-transparent rounded-md outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white placeholder-slate-400`}
                />
                <div className="absolute right-2 flex items-center space-x-1">
                    {value ? (
                        <button 
                            onClick={handleClear}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    ) : (
                         <button 
                            onClick={startVoiceInput}
                            className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-cyan-500'}`}
                        >
                            <MicIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            {isFocused && (results.length > 0 || isLoading) && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-800 rounded-md shadow-lg max-h-60 overflow-y-auto z-[10005] border border-slate-200 dark:border-slate-700">
                    {results.map(result => (
                        <li 
                            key={result.placeId}
                            onMouseDown={() => handleSelect(result)}
                            className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-none transition-colors"
                        >
                             <div className="flex items-start">
                                <div className="mt-0.5 mr-3 text-slate-400">
                                    <MapPinIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-slate-900 dark:text-white leading-snug">
                                        {result.structuredFormat?.mainText?.text || result.text?.text}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {result.structuredFormat?.secondaryText?.text}
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                     {isLoading && (
                        <li className="px-4 py-3 text-center text-sm text-slate-500">Loading...</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default GooglePlacesInput;
