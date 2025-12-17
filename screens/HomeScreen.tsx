
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTrip } from '../hooks/useTrip';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useVoiceNavigation } from '../hooks/useVoiceNavigation';
import { useWakeLock } from '../hooks/useWakeLock';
import { useNavigation } from '../context/NavigationContext';
import type { Screen, SetupMode, Route, LocationPoint, User } from '../types';
import WarningToast from '../components/WarningToast';
import MapView, { MapViewHandle } from '../components/MapView';
import NavigationInput from '../components/NavigationInput';
import SavedPlaces from '../components/SavedPlaces';
import SetupSelectionModal from '../components/SetupSelectionModal';
import RecenterFab from '../components/RecenterFab';
import { ArrowRightIcon, XIcon, VolumeUpIcon, VolumeOffIcon, SunIcon, MoonIcon, SearchIcon, ConeIcon, TrophyIcon, AlertTriangleIcon, CrosshairIcon } from '../components/icons';

interface HomeScreenProps {
    setActiveScreen: (screen: Screen) => void;
    user: User;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveScreen, user, theme, toggleTheme }) => {
    const { enterNavigation, exitNavigation, navigationActive, setFullscreen, isFullscreen } = useNavigation();
    
    const [mode, setMode] = useState<'idle' | 'searching' | 'navigating' | 'freedrive'>('idle');
    const [setupMode, setSetupMode] = useLocalStorage<SetupMode | null>('setup-mode', 'mount');
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [routeError, setRouteError] = useState<string | undefined>(undefined);
    
    // UI States
    const [isMapCentered, setIsMapCentered] = useState(true);
    const [showHazardMenu, setShowHazardMenu] = useState(false);
    const [hazardToast, setHazardToast] = useState<string | undefined>(undefined);
    const [showSaveTripModal, setShowSaveTripModal] = useState(false);
    
    const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Alert State
    const [showDistractionAlert, setShowDistractionAlert] = useState(false);

    const [startPoint, setStartPoint] = useState<LocationPoint | null>(null);
    const [destinationPoint, setDestinationPoint] = useState<LocationPoint | null>(null);
    const [allRoutes, setAllRoutes] = useState<Route[] | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const [arrivalTime, setArrivalTime] = useState<string>('--:--');
    const [timeRemaining, setTimeRemaining] = useState<string>('0 min');
    const [distanceRemaining, setDistanceRemaining] = useState<string>('0 km');
    
    const { isTripActive, location, distance, points, speedLimit, warnings, lastEvent, startTrip, stopTrip, startTracking, rewardEligible } = useTrip(setupMode, null);
    const mapViewRef = useRef<MapViewHandle>(null);

    const activeRoute = allRoutes && allRoutes.length > 0 ? allRoutes[0] : null;
    const { speak } = useVoiceNavigation({ isTripActive, activeRoute, currentLocation: location, isMuted, user });

    useWakeLock(mode === 'navigating' || mode === 'freedrive');

    // --- FULL SCREEN LOGIC ---
    const resetActivityTimer = useCallback(() => {
        if (!navigationActive) {
            setFullscreen(false);
            return;
        }
        
        setFullscreen(false); // Show UI immediately on touch
        
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        
        // Auto-hide after 5 seconds of no activity
        activityTimerRef.current = setTimeout(() => {
            setFullscreen(true);
        }, 5000);
    }, [navigationActive, setFullscreen]);

    // Initial trigger when entering nav mode
    useEffect(() => {
        if (navigationActive) {
            resetActivityTimer();
        } else {
            setFullscreen(false);
            if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        }
    }, [navigationActive, resetActivityTimer, setFullscreen]);

    // --- END FULL SCREEN LOGIC ---

    useEffect(() => {
        if (location && !startPoint) {
            setStartPoint({ name: "Current Location", coords: { lat: location.latitude, lng: location.longitude } });
        }
    }, [location, startPoint]);

    useEffect(() => {
        if (mode === 'navigating' && activeRoute && location) {
            const totalDistKm = activeRoute.summary.totalDistance / 1000;
            const remainingKm = Math.max(0, totalDistKm - distance);
            const progressPercent = distance / totalDistKm;
            const remainingSeconds = activeRoute.summary.totalTime * (1 - Math.min(1, progressPercent));
            const arrivalDate = new Date(Date.now() + remainingSeconds * 1000);
            
            setArrivalTime(arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setTimeRemaining(`${Math.ceil(remainingSeconds / 60)} min`);
            setDistanceRemaining(`${remainingKm.toFixed(1)} km`);
        }
    }, [mode, activeRoute, distance, location]);

    const lastEventTimeRef = useRef<number>(0);
    useEffect(() => {
        if (lastEvent && lastEvent.timestamp > lastEventTimeRef.current) {
            lastEventTimeRef.current = lastEvent.timestamp;
            
            if (lastEvent.type === 'PHONE_TOUCH' || lastEvent.type === 'PHONE_DISTRACTION') {
                setShowDistractionAlert(true);
                setTimeout(() => setShowDistractionAlert(false), 4000);
            }

            if ((mode === 'navigating' || mode === 'freedrive') && !isMuted) {
                speak(lastEvent.description || lastEvent.type.replace(/_/g, ' '));
            }
        }
    }, [lastEvent, speak, mode, isMuted]);

    const handleStartNavigationClick = () => {
        startTracking();
        if (!setupMode) {
             setShowSetupModal(true);
        } else {
             startTrip();
             enterNavigation(); // Update Global State
             setMode(destinationPoint ? 'navigating' : 'freedrive');
             setIsMapCentered(true);
             if (mapViewRef.current) mapViewRef.current.recenter();
        }
    };

    const handleSetupSelect = (selectedMode: SetupMode) => {
        setSetupMode(selectedMode);
        setShowSetupModal(false);
        startTrip();
        enterNavigation(); // Update Global State
        setMode(destinationPoint ? 'navigating' : 'freedrive');
        setIsMapCentered(true);
        if (mapViewRef.current) mapViewRef.current.recenter();
    };

    const handleExitClick = () => {
        setShowSaveTripModal(true);
        setFullscreen(false); // Force UI visible
    };

    const confirmEndTrip = (save: boolean) => {
        stopTrip(startPoint, destinationPoint, save);
        exitNavigation(); // Update Global State
        setShowSaveTripModal(false);
        setDestinationPoint(null);
        setAllRoutes(null);
        setStartPoint(null); // Reset start point so next trip re-initializes from current location
        setMode('idle');
        setIsMapCentered(true);
        mapViewRef.current?.recenter();
    };

    const handleRoutesFound = useCallback((routes: Route[]) => {
        setAllRoutes(routes);
        setRouteError(undefined);
    }, []);
    
    const handleRoutingError = useCallback((msg: string) => {
        setRouteError("Route Failed: " + msg);
        setTimeout(() => setRouteError(undefined), 5000);
    }, []);

    const handleSelectDestination = (point: LocationPoint | null) => {
        setDestinationPoint(point);
        if (isTripActive && location && point) {
            setStartPoint({ name: "Current Location", coords: { lat: location.latitude, lng: location.longitude } });
        }
        if (!isTripActive) {
            if (point) setMode('idle'); 
        } else if (point) {
            setMode('navigating');
        }
    };

    const handleRecenter = () => {
        if (mapViewRef.current) {
            mapViewRef.current.recenter();
            setIsMapCentered(true);
            resetActivityTimer();
        }
    };
    
    const onMapUserInteraction = useCallback(() => {
        setIsMapCentered(false);
        resetActivityTimer();
    }, [resetActivityTimer]);

    const reportHazard = (type: string) => {
        setHazardToast(`Reported: ${type}`);
        setShowHazardMenu(false);
        setTimeout(() => setHazardToast(undefined), 3000);
        resetActivityTimer();
    };

    // HUD RENDER
    const renderDrivingHUD = () => {
        const currentSpeed = location?.speed ? Math.round(location.speed) : 0;
        const isSpeeding = speedLimit !== null && currentSpeed > speedLimit + 4;

        // FADE UI based on isFullScreen from Context
        const uiOpacity = isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto';
        
        return (
            <div className="absolute inset-0 z-[900] pointer-events-none" onClick={resetActivityTimer}>
                <WarningToast warning={warnings.slice(-1)[0] || hazardToast} />
                
                {/* STRICT PHONE WARNING OVERLAY */}
                {showDistractionAlert && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[3000] w-[90%] max-w-sm animate-fade-in-up pointer-events-auto">
                        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-red-400 flex items-center space-x-3">
                            <AlertTriangleIcon className="w-10 h-10 animate-pulse" />
                            <div>
                                <h3 className="font-black uppercase tracking-wide">Phone Distraction!</h3>
                                <p className="text-xs font-bold mt-1">Points Slashed 50%</p>
                                <p className="text-[10px] opacity-90">Keep eyes on the road.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Controls Overlay */}
                <div className={`absolute top-4 left-4 right-4 flex justify-between items-start transition-opacity duration-500 ${uiOpacity}`}>
                     {/* Mode Indicator */}
                     <div className="pointer-events-auto flex items-center space-x-2">
                        {mode === 'navigating' ? (
                            <div className="bg-dark-900/90 backdrop-blur-xl border border-white/10 rounded-full px-4 py-3 shadow-lg flex items-center max-w-[200px]">
                                 <ArrowRightIcon className="w-5 h-5 mr-3 text-brand-cyan" />
                                 <span className="font-bold text-white text-sm truncate">{destinationPoint?.name}</span>
                            </div>
                        ) : (
                            <div className="bg-dark-900/90 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-lg flex items-center space-x-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                <span className="font-bold text-white text-xs uppercase tracking-wider">Free Drive</span>
                            </div>
                        )}
                     </div>

                     <div className="flex flex-col space-y-3 pointer-events-auto items-end">
                         {/* Live Score */}
                         <div className="bg-dark-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col items-center shadow-lg min-w-[70px]">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Points</span>
                            <div className={`text-2xl font-display font-black ${points >= 0 ? 'text-brand-cyan' : 'text-red-500'} ${!rewardEligible ? 'line-through opacity-50' : ''}`}>
                                {points > 0 ? '+' : ''}{points}
                            </div>
                        </div>

                         <button onClick={() => setIsMuted(!isMuted)} className="w-12 h-12 flex items-center justify-center bg-dark-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-lg text-white hover:scale-105 transition-all" data-safe="true">
                            {isMuted ? <VolumeOffIcon className="w-5 h-5 text-red-400" /> : <VolumeUpIcon className="w-5 h-5" />}
                        </button>

                        <div className="relative flex flex-col items-end">
                             {showHazardMenu && (
                                 <div className="flex flex-col space-y-2 mb-2 animate-fade-in-up">
                                     <button onClick={() => reportHazard('Pothole')} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg border border-white/10" data-safe="true">Pothole</button>
                                     <button onClick={() => reportHazard('Police')} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg border border-white/10" data-safe="true">Police</button>
                                 </div>
                             )}
                            <button 
                                onClick={() => setShowHazardMenu(!showHazardMenu)} 
                                className="w-12 h-12 flex items-center justify-center bg-orange-500 hover:bg-orange-400 border border-white/20 rounded-full shadow-lg text-white hover:scale-105 transition-all"
                                data-safe="true"
                            >
                                <ConeIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* NEW RECENTER FAB - Handles visibility and interactions internally */}
                <RecenterFab 
                    isVisible={!isMapCentered || isFullscreen} 
                    onClick={handleRecenter}
                    onModeSelect={(mode) => console.log('Mode selected:', mode)}
                />

                {/* Bottom HUD */}
                <div className={`absolute bottom-0 left-0 right-0 z-[1000] bg-white dark:bg-dark-900 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-slate-200 dark:border-slate-800 pb-safe pt-4 px-6 rounded-t-[32px] mb-[0px] transition-transform duration-500 pointer-events-auto ${isFullscreen ? 'translate-y-[150%]' : 'translate-y-0'}`}>
                    <div className="flex justify-between items-center relative pb-6">
                        <div className="flex flex-col">
                            {mode === 'navigating' ? (
                                <>
                                    <div className="flex items-baseline space-x-2">
                                        <span className="text-3xl font-bold text-green-500 font-display">{timeRemaining}</span>
                                        <span className="text-lg font-medium text-slate-400">({distanceRemaining})</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                                        Arrival <span className="text-slate-900 dark:text-white">{arrivalTime}</span>
                                    </p>
                                </>
                            ) : (
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Active Trip</h3>
                                    <p className="text-xs text-slate-500">{distance.toFixed(1)} km traveled</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <button onClick={handleExitClick} className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-sm" data-safe="true">
                                Exit
                            </button>
                        </div>
                    </div>
                </div>

                {/* INDEPENDENT FLOATING SPEEDOMETER */}
                <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-[800] transition-all duration-500 ${isFullscreen ? 'scale-125 bottom-12' : 'scale-100 bottom-[160px]'}`}>
                     <div className={`w-24 h-24 rounded-full border-4 ${isSpeeding ? 'border-red-500 bg-white' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-dark-800'} shadow-2xl flex items-center justify-center relative`}>
                        <span className={`text-4xl font-black font-display ${isSpeeding ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{currentSpeed}</span>
                        {speedLimit && (
                             <div className="absolute -bottom-3 bg-white dark:bg-slate-800 border border-red-500 px-2 py-0.5 rounded text-[10px] font-bold text-slate-900 dark:text-white shadow-sm whitespace-nowrap">
                                 LIMIT {speedLimit}
                             </div>
                        )}
                     </div>
                </div>

            </div>
        );
    };

    const renderIdleInterface = () => (
        <>
            <div className="absolute top-4 left-4 right-4 z-[1000] animate-fade-in-up flex items-start justify-between gap-3">
                 <div className="flex-1 bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-2 rounded-full shadow-xl transition-all duration-300">
                     <button onClick={() => setMode('searching')} className="flex items-center w-full px-4 py-2 bg-transparent text-left group">
                        <SearchIcon className="w-5 h-5 text-slate-400 mr-3" />
                        {destinationPoint ? <span className="font-bold text-slate-900 dark:text-white">{destinationPoint.name}</span> : <span className="font-medium text-slate-500 dark:text-slate-400">Where to?</span>}
                     </button>
                 </div>
                 
                 <div className="flex flex-col space-y-2">
                    <button onClick={handleRecenter} className={`w-12 h-12 flex items-center justify-center bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-full shadow-lg hover:scale-105 transition-all ${!isMapCentered ? 'text-brand-cyan' : 'text-slate-700 dark:text-white'}`}>
                        <CrosshairIcon className="w-5 h-5" />
                    </button>
                    <button onClick={toggleTheme} className="w-12 h-12 flex items-center justify-center bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-full shadow-lg hover:scale-105 transition-all text-slate-700 dark:text-white">
                        {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                    </button>
                 </div>
            </div>

            <WarningToast warning={routeError} />

            <div className="absolute bottom-32 left-0 right-0 z-[1000] flex flex-col gap-3 pointer-events-none px-4 pb-safe">
                {destinationPoint && activeRoute && (
                    <div className="bg-white dark:bg-dark-900 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 pointer-events-auto animate-fade-in-up">
                         <div className="space-y-4">
                             <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                                <div>
                                    <p className="font-bold text-xl text-slate-900 dark:text-white tracking-tight line-clamp-1">{destinationPoint.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {Math.ceil(activeRoute.summary.totalTime / 60)} min • {(activeRoute.summary.totalDistance / 1000).toFixed(1)} km
                                    </p>
                                </div>
                                <button 
                                    onClick={() => { setDestinationPoint(null); setAllRoutes(null); }} 
                                    className="p-3 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                             </div>

                             <button onClick={handleStartNavigationClick} className="w-full py-4 bg-gradient-aurora text-white font-display font-bold text-lg tracking-wide rounded-2xl shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center">
                                 <ArrowRightIcon className="w-6 h-6 mr-2" /> Start Navigation
                             </button>
                        </div>
                    </div>
                )}
                {!destinationPoint && (
                    <div className="pointer-events-auto animate-fade-in-up space-y-3">
                        <button 
                            onClick={handleStartNavigationClick}
                            className="w-full py-4 bg-slate-100 dark:bg-white/10 backdrop-blur-md rounded-2xl font-bold text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors border border-transparent dark:border-white/5 flex items-center justify-center"
                        >
                           Drive without Destination
                        </button>
                        <div className="px-1"><SavedPlaces onSelect={handleSelectDestination} currentLocation={location ? { lat: location.latitude, lng: location.longitude } : undefined} /></div>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div className="relative h-full w-full bg-slate-50 dark:bg-dark-950 overflow-hidden" onClick={resetActivityTimer}>
            <div className="absolute inset-0 z-0">
                <MapView 
                    ref={mapViewRef} 
                    location={location} 
                    start={startPoint?.coords} 
                    destination={destinationPoint?.coords} 
                    onRoutesFound={handleRoutesFound} 
                    onError={handleRoutingError} 
                    isNavigating={mode === 'navigating'} 
                    activeRoute={activeRoute} 
                    activeRouteIndex={0} 
                    theme={theme}
                    onUserInteraction={onMapUserInteraction}
                />
            </div>
            
            {showSaveTripModal && (
                <div className="fixed inset-0 z-[8000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up">
                    <div className="bg-dark-900 p-6 rounded-3xl border border-white/10 shadow-2xl w-full max-w-sm text-center">
                        <TrophyIcon className="w-12 h-12 text-brand-cyan mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Drive Complete</h3>
                        <p className="text-slate-400 mb-6 text-sm">Save this trip to your history?</p>
                        <div className="flex space-x-3">
                            <button 
                                onClick={() => confirmEndTrip(false)}
                                className="flex-1 py-3 bg-white/10 rounded-xl text-slate-300 font-bold hover:bg-white/20 transition-colors"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={() => confirmEndTrip(true)}
                                className="flex-1 py-3 bg-gradient-aurora text-white rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                Save Trip
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {mode === 'searching' && (
                 <div className="absolute inset-0 z-[6000] bg-slate-50/95 dark:bg-dark-950/95 backdrop-blur-xl p-4 animate-fade-in-up flex flex-col">
                     <div className="flex-1 max-w-lg mx-auto w-full pt-safe">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">Plan Trip</h2>
                            <button onClick={() => setMode(isTripActive ? 'navigating' : 'idle')} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Cancel</button>
                        </div>
                        <NavigationInput 
                            startPoint={startPoint} 
                            destinationPoint={destinationPoint} 
                            onStartChange={setStartPoint} 
                            onDestinationChange={handleSelectDestination} 
                            onClear={() => { setDestinationPoint(null); setAllRoutes(null); }} 
                            onClose={() => setMode(isTripActive ? 'navigating' : 'idle')} 
                            autoFocusDestination 
                            userLocation={location} 
                        />
                     </div>
                 </div>
            )}
            
            {showSetupModal && <SetupSelectionModal onSelect={handleSetupSelect} onCancel={() => setShowSetupModal(false)} />}
            
            {mode === 'idle' && renderIdleInterface()}
            {(mode === 'navigating' || mode === 'freedrive') && renderDrivingHUD()}
        </div>
    );
};

export default HomeScreen;
