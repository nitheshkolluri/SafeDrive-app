
import { useState, useEffect, useRef } from 'react';
import type { GeolocationData, DeviceMotionData, DrivingEvent, SetupMode, DeviceOrientationData, WeatherCondition, SeverityLevel } from '../types';
import { fetchRoadData } from '../utils/osm';
import { MovingAverage } from '../utils/smoothing';
import { NAV_CONFIG, VIOLATION_CONFIG } from '../utils/config';

interface UseDrivingAnalyticsProps {
    location: GeolocationData | null;
    motion: DeviceMotionData | null;
    orientation: DeviceOrientationData | null;
    isTripActive: boolean;
    setupMode: SetupMode | null;
    baseOrientation: DeviceOrientationData | null; 
    isSignalLost?: boolean; // Injected from useGeolocation
}

export const useDrivingAnalytics = ({ location, motion, orientation, isTripActive, setupMode, isSignalLost = false }: UseDrivingAnalyticsProps) => {
    const [points, setPoints] = useState(0); // This is DELTA points to apply (usually negative)
    const [demerits, setDemerits] = useState(0);
    const [warnings, setWarnings] = useState<{message: string, severity: SeverityLevel}[]>([]);
    const [lastEvent, setLastEvent] = useState<DrivingEvent | null>(null);
    const [speedLimit, setSpeedLimit] = useState<number | null>(null);
    const [isPassenger, setIsPassenger] = useState(false);
    
    // Context States
    const [weather, setWeather] = useState<WeatherCondition>('unknown');
    const [isSchoolZone, setIsSchoolZone] = useState(false);
    const [activeSchoolTime, setActiveSchoolTime] = useState(false);

    // Logic States
    const isVehicleStoppedRef = useRef(true); 
    const stopTimerRef = useRef<number | null>(null);
    const [driverConfidence, setDriverConfidence] = useState(0.5);
    
    const lastWarningTimeRef = useRef(0);
    const lastRewardTimeRef = useRef(0);
    
    // OVERSPEED STATE MACHINE
    const speedingStartTimeRef = useRef<number | null>(null);
    const isSpeedingEventActiveRef = useRef(false);
    const lastSpeedingPenaltyTimeRef = useRef<number>(0);
    
    // API Throttling
    const lastOsmCallTimeRef = useRef(0);
    const lastApiCoordsRef = useRef<{lat: number, lng: number} | null>(null);
    
    // Smoothers
    const accelXRef = useRef(new MovingAverage(10));
    const accelYRef = useRef(new MovingAverage(10));
    const accelZRef = useRef(new MovingAverage(10));
    
    // Reset state
    useEffect(() => {
        if (!isTripActive) {
            setIsPassenger(false);
            isVehicleStoppedRef.current = true;
            stopTimerRef.current = Date.now();
            setWeather('unknown');
            setIsSchoolZone(false);
            speedingStartTimeRef.current = null;
            isSpeedingEventActiveRef.current = false;
            setDriverConfidence(0.5);
        } else {
            let confidence = 0.5;
            if (setupMode === 'mount') confidence += 0.3; 
            if (setupMode === 'passenger') confidence = 0.1;
            setDriverConfidence(confidence);
            setIsPassenger(setupMode === 'passenger');
        }
    }, [isTripActive, setupMode]);

    // --- ZERO-SPEED SAFE MODE LOGIC ---
    // Rule: Speed must be < 1.5 km/h for 4 seconds to be "Safe".
    // Exit Safe Mode only when Speed > 5 km/h (Hysteresis to prevent flicking at traffic lights).
    useEffect(() => {
        if (!isTripActive || !location) return;

        const speed = location.speed || 0;
        const now = Date.now();

        if (isVehicleStoppedRef.current) {
            // Logic to EXIT stopped state
            if (speed > SAFE_RESUME_SPEED_THRESHOLD) {
                isVehicleStoppedRef.current = false;
                stopTimerRef.current = null;
            }
        } else {
            // Logic to ENTER stopped state
            if (speed < SAFE_STOP_SPEED_THRESHOLD) {
                if (!stopTimerRef.current) {
                    stopTimerRef.current = now;
                } else if (now - stopTimerRef.current > VIOLATION_CONFIG.SAFE_STOP.DURATION_MS) {
                    isVehicleStoppedRef.current = true;
                }
            } else {
                stopTimerRef.current = null;
            }
        }
    }, [location, isTripActive]);

    const SAFE_STOP_SPEED_THRESHOLD = VIOLATION_CONFIG.SAFE_STOP.SPEED_THRESHOLD;
    const SAFE_RESUME_SPEED_THRESHOLD = 5.0;

    // --- PHONE INTERACTION MONITORING ---
    useEffect(() => {
        if (!isTripActive || setupMode === 'passenger') return;

        const handleInteraction = (e: Event) => {
            // 1. Safe Harbor: Vehicle is confirmed stopped
            if (isVehicleStoppedRef.current) return;

            // 2. Safe Harbor: Explicit safe zones (UI buttons)
            const target = e.target as HTMLElement;
            if (target && (target.closest('[data-safe="true"]') || target.closest('.gm-style') || target.tagName === 'CANVAS')) {
                return;
            }

            // 3. Penalty Logic
            let isViolation = false;
            let description = '';

            // Handle Backgrounding
            if (e.type === 'visibilitychange') {
                if (document.hidden) {
                    // CRITICAL FIX: Only penalize backgrounding if speed > 0 AND Signal is NOT Lost.
                    // This prevents penalties during tunnels/GPS loss where speed might freeze.
                    const currentSpeed = location?.speed || 0;
                    if (currentSpeed > 5 && !isSignalLost) { 
                        isViolation = true;
                        description = 'App Backgrounded while Driving';
                    }
                }
            } 
            // Handle Touches
            else if (e.type === 'touchstart' || e.type === 'click') {
                isViolation = true;
                description = 'Phone Interaction while Driving';
            }

            if (isViolation) {
                const now = Date.now();
                // Debounce slightly
                if (now - lastWarningTimeRef.current < 2000) return;

                const event: DrivingEvent = { 
                    type: 'PHONE_TOUCH', 
                    timestamp: now, 
                    points: -30, 
                    severity: 0.8,
                    severityLevel: 'SEVERE',
                    value: location?.speed || 0,
                    description,
                    lat: location?.latitude,
                    lng: location?.longitude,
                    speed: location?.speed || 0
                };
                
                setLastEvent(event);
                // We don't set Points directly here, we let the hook consumer handle the 'event'
                // But for compatibility with existing useTrip, we set points state which triggers accumulation
                setPoints(-30);
                setWarnings(prev => [...prev.slice(-2), { message: "⚠️ Distraction (-30 pts)", severity: 'SEVERE' }]);
                setDriverConfidence(prev => Math.max(0, prev - 0.25));
                lastWarningTimeRef.current = now;
                
                if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
            }
        };

        window.addEventListener('touchstart', handleInteraction, { passive: true });
        document.addEventListener('visibilitychange', handleInteraction);
        return () => {
            window.removeEventListener('touchstart', handleInteraction);
            document.removeEventListener('visibilitychange', handleInteraction);
        };
    }, [isTripActive, location, setupMode, isSignalLost]);

    // --- MAIN LOOP (Speeding + G-Force) ---
    useEffect(() => {
        setPoints(0); // Reset points delta each tick to avoid infinite accumulation loop
        
        if (!isTripActive || !location || !motion) return;
        
        const now = Date.now();
        const rawX = motion.acceleration.x || 0;
        const rawY = motion.acceleration.y || 0;
        const rawZ = motion.acceleration.z || 0;
        
        const smoothX = accelXRef.current.add(rawX);
        const smoothY = accelYRef.current.add(rawY);
        const smoothZ = accelZRef.current.add(rawZ);

        // Fetch Road Data
        const shouldFetchOsm = !lastApiCoordsRef.current || (now - lastOsmCallTimeRef.current > 30000) || (Math.abs(location.latitude - lastApiCoordsRef.current.lat) > 0.005); 
        if (shouldFetchOsm) {
            lastOsmCallTimeRef.current = now;
            lastApiCoordsRef.current = { lat: location.latitude, lng: location.longitude };
            fetchRoadData(location.latitude, location.longitude).then(data => {
                setIsSchoolZone(data.isSchoolZone);
                // Simple Time Check for School Zone
                const date = new Date();
                const h = date.getHours() + (date.getMinutes()/60);
                const isTime = (date.getDay() >= 1 && date.getDay() <= 5) && ((h >= 8 && h <= 9.5) || (h >= 14.5 && h <= 16));
                setActiveSchoolTime(isTime);
                setSpeedLimit(data.isSchoolZone && isTime ? 40 : data.maxSpeed);
            });
        }

        // --- SPEEDING LOGIC ---
        if (!isPassenger && setupMode !== 'passenger') {
            const currentSpeed = location.speed || 0;
            const accuracy = location.accuracy;

            // Only enforce if GPS is reliable
            if (speedLimit && accuracy < NAV_CONFIG.GPS_ACCURACY_THRESHOLD_M) {
                if (currentSpeed > speedLimit + NAV_CONFIG.SPEED_TOLERANCE_KMH) {
                    if (!speedingStartTimeRef.current) {
                        speedingStartTimeRef.current = now;
                    } 
                    
                    const duration = now - speedingStartTimeRef.current;
                    const overSpeed = currentSpeed - speedLimit;

                    // Trigger penalty if sustained > 3s
                    if (duration > NAV_CONFIG.SPEED_SUSTAIN_TIME_MS) {
                        // Check if we need to apply a NEW penalty (Recurring every 5s)
                        if (!isSpeedingEventActiveRef.current || (now - lastSpeedingPenaltyTimeRef.current > VIOLATION_CONFIG.SPEEDING.RECURRING_PENALTY_SECONDS * 1000)) {
                            
                            isSpeedingEventActiveRef.current = true;
                            lastSpeedingPenaltyTimeRef.current = now;

                            // Determine Severity
                            let penaltyPoints = VIOLATION_CONFIG.SPEEDING.POINTS.MINOR;
                            let severityVal = 0.3;
                            let level: SeverityLevel = 'MINOR';

                            if (overSpeed > VIOLATION_CONFIG.SPEEDING.CRITICAL_THRESHOLD) {
                                penaltyPoints = VIOLATION_CONFIG.SPEEDING.POINTS.CRITICAL;
                                level = 'CRITICAL';
                            } else if (overSpeed > VIOLATION_CONFIG.SPEEDING.SERIOUS_THRESHOLD) {
                                penaltyPoints = VIOLATION_CONFIG.SPEEDING.POINTS.SERIOUS;
                                level = 'SEVERE';
                            } else if (overSpeed > VIOLATION_CONFIG.SPEEDING.MODERATE_THRESHOLD) {
                                penaltyPoints = VIOLATION_CONFIG.SPEEDING.POINTS.MODERATE;
                                level = 'MODERATE';
                            }

                            // Ongoing Penalty (Reduced points for subsequent ticks to avoid draining score too fast)
                            if (duration > 5000) {
                                penaltyPoints = VIOLATION_CONFIG.SPEEDING.POINTS.RECURRING;
                            }

                            if (isSchoolZone && activeSchoolTime) {
                                penaltyPoints *= 2;
                                level = 'CRITICAL';
                            }
                            
                            const event: DrivingEvent = { 
                                type: isSchoolZone ? 'SCHOOL_ZONE_SPEEDING' : 'SPEEDING', 
                                timestamp: now, 
                                value: currentSpeed, 
                                points: penaltyPoints,
                                severity: severityVal,
                                severityLevel: level,
                                description: `Speeding: ${Math.round(currentSpeed)} in ${speedLimit}`,
                                lat: location.latitude,
                                lng: location.longitude,
                                speed: currentSpeed,
                                roadSpeedLimit: speedLimit
                            };
                            
                            setPoints(penaltyPoints); // Trigger point reduction in parent hook
                            setDemerits(prev => prev + Math.abs(penaltyPoints));
                            setLastEvent(event);
                            setWarnings(prev => [...prev.slice(-2), { message: `⚠️ Speeding ${Math.round(overSpeed)}km/h over`, severity: level }]);
                            
                            if ('vibrate' in navigator) navigator.vibrate(200);
                        }
                    }
                } else {
                    // Reset if speed drops below limit
                    speedingStartTimeRef.current = null;
                    isSpeedingEventActiveRef.current = false;
                    
                    // Reward Safe Driving
                    if (currentSpeed > 20 && currentSpeed < speedLimit && !isSchoolZone) {
                         if (now - lastRewardTimeRef.current > 60000) { 
                             setLastEvent({ 
                                 type: 'SAFE_DISTANCE', 
                                 timestamp: now, 
                                 value: currentSpeed, 
                                 points: 5, 
                                 severityLevel: 'MINOR',
                                 description: 'Safe Driving Bonus'
                             }); 
                             setPoints(5);
                             lastRewardTimeRef.current = now;
                         }
                    }
                }
            } else {
                // If GPS bad or no limit, reset timers
                speedingStartTimeRef.current = null;
                isSpeedingEventActiveRef.current = false;
            }
        }

        // --- G-FORCE LOGIC ---
        if (now - lastWarningTimeRef.current > 3000 && !isVehicleStoppedRef.current && !isSpeedingEventActiveRef.current) {
             const totalG = Math.sqrt(smoothX*smoothX + smoothY*smoothY + smoothZ*smoothZ);
             let gEvent: DrivingEvent | null = null;

             if (smoothY < VIOLATION_CONFIG.G_FORCE.HARSH_BRAKING) {
                 gEvent = { type: 'HARSH_BRAKING', points: -7, severityLevel: 'MODERATE', description: 'Harsh Braking' } as any;
             } else if (smoothY > VIOLATION_CONFIG.G_FORCE.HARSH_ACCEL) {
                 gEvent = { type: 'HARSH_ACCELERATION', points: -7, severityLevel: 'MODERATE', description: 'Aggressive Acceleration' } as any;
             } else if (Math.abs(smoothX) > VIOLATION_CONFIG.G_FORCE.CORNERING) {
                 gEvent = { type: 'UNSAFE_CORNERING', points: -15, severityLevel: 'SEVERE', description: 'Unsafe Cornering' } as any;
             }

             if (gEvent) {
                 setLastEvent({ ...gEvent, timestamp: now, value: totalG });
                 setPoints(gEvent.points);
                 setWarnings(prev => [...prev.slice(-2), { message: gEvent!.description!, severity: gEvent!.severityLevel }]);
                 lastWarningTimeRef.current = now;
             }
        }

    }, [location, motion, speedLimit, isTripActive, setupMode]);

    return { points, demerits, warnings, lastEvent, speedLimit, isPassenger, driverConfidence, weather, isSchoolZone, activeSchoolTime };
};
