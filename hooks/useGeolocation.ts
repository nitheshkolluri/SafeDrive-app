
import { useState, useRef, useCallback, useEffect } from 'react';
import type { GeolocationData, DeviceMotionData, DeviceOrientationData } from '../types';
import { SpeedEstimator, HeadingEstimator } from '../utils/smoothing';
import { NAV_CONFIG } from '../utils/config';

const getPlatformSpecificInstructions = (): string => {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "Go to Settings > Privacy > Location Services.";
  return "Please enable location services in your browser settings.";
};

export const useGeolocation = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<GeolocationData | null>(null); 
  const [motion, setMotion] = useState<DeviceMotionData | null>(null);
  const [orientation, setOrientation] = useState<DeviceOrientationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSignalLost, setIsSignalLost] = useState(false);

  const lastUpdateRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const compassHeadingRef = useRef<number | null>(null);
  
  // Screen Orientation for Compass Compensation
  const screenOrientationRef = useRef<number>(0);

  // Estimators
  const speedEstimatorRef = useRef(new SpeedEstimator(NAV_CONFIG.SPEED_SMOOTHING_FACTOR));
  const headingEstimatorRef = useRef(new HeadingEstimator(NAV_CONFIG.HEADING_SMOOTHING_FACTOR));

  // --- 1. GPS Handler ---
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, speed, accuracy, heading } = position.coords;
    const now = Date.now();
    
    lastUpdateRef.current = now;
    if (isSignalLost) setIsSignalLost(false);

    // Filter massive jumps (bad GPS glitch)
    if (location && accuracy > 200) return;

    // A. Calibrate Speed
    const fusedSpeedKmh = speedEstimatorRef.current.update(latitude, longitude, speed, accuracy);

    // B. Calibrate Heading (Fuse GPS Course + Compass)
    // If moving fast (>5kmh), GPS heading is trusted. 
    // If slow, we rely on the compass updates below, but we sync the estimator here too.
    const fusedHeading = headingEstimatorRef.current.update(heading, compassHeadingRef.current, fusedSpeedKmh);

    setLocation(prev => ({
      latitude,
      longitude,
      speed: fusedSpeedKmh,
      accuracy,
      heading: fusedHeading,
    }));
    setError(null);
  }, [location, isSignalLost]); 

  const handleError = useCallback((err: GeolocationPositionError) => {
    let message = "Could not retrieve your location.";
    if (err.code === err.PERMISSION_DENIED) message = getPlatformSpecificInstructions();
    else if (err.code === err.POSITION_UNAVAILABLE) message = "Location unavailable.";
    else if (err.code === err.TIMEOUT) message = "Location request timed out.";
    setError(message);
  }, []);

  // --- 2. GPS Signal Monitor ---
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (isTracking) {
          interval = setInterval(() => {
              if (lastUpdateRef.current > 0 && (Date.now() - lastUpdateRef.current > NAV_CONFIG.GPS_TIMEOUT_MS)) {
                  setIsSignalLost(true);
              }
          }, 2000);
      }
      return () => clearInterval(interval);
  }, [isTracking]);

  const requestLocation = useCallback(() => {
    if (navigator.geolocation) {
      setError(null);
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 0, 
      });
    }
  }, [handleSuccess, handleError]);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  // --- 3. Motion & Orientation Handlers ---
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    setMotion({ acceleration: event.acceleration, rotationRate: event.rotationRate });
  }, []);

  // Update screen orientation reference
  useEffect(() => {
      const updateScreenOrientation = () => {
          // Modern API vs Legacy
          if (screen.orientation) {
              screenOrientationRef.current = screen.orientation.angle;
          } else if (window.orientation !== undefined) {
              screenOrientationRef.current = Number(window.orientation);
          }
      };
      window.addEventListener('orientationchange', updateScreenOrientation);
      updateScreenOrientation();
      return () => window.removeEventListener('orientationchange', updateScreenOrientation);
  }, []);

  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!isTracking) return;

    let heading: number | null = null;
    
    // Calculate Compass Heading relative to True North
    // iOS (WebKit)
    if ((event as any).webkitCompassHeading) {
        heading = (event as any).webkitCompassHeading;
    } 
    // Android / Standard (absolute alpha)
    else if (event.absolute && event.alpha !== null) {
        heading = 360 - event.alpha;
    }

    // Compensate for Screen Orientation (Landscape/Portrait)
    if (heading !== null) {
        heading = (heading + screenOrientationRef.current) % 360;
        compassHeadingRef.current = heading;
    }

    setOrientation({ alpha: event.alpha, beta: event.beta, gamma: event.gamma });

    // --- LOW SPEED COMPASS OVERRIDE ---
    // If user is stopped or walking (< 5km/h), update UI heading immediately from compass
    // This allows the map to rotate smoothly as the user turns the phone, without waiting for GPS.
    setLocation(prev => {
        if (!prev) return null;
        // Check speed from previous state. 
        // If speed < 5km/h, we force the heading estimator to accept the compass heading (pass speed 0)
        if ((prev.speed || 0) < 5 && heading !== null) {
            const smoothHeading = headingEstimatorRef.current.update(null, heading, 0);
            return { ...prev, heading: smoothHeading };
        }
        return prev;
    });

  }, [isTracking]);

  const startTracking = useCallback(() => {
    if (navigator.geolocation) {
        if(isTracking) return;
        
        speedEstimatorRef.current.reset();
        headingEstimatorRef.current.reset();

        setIsTracking(true);
        setError(null);
        lastUpdateRef.current = Date.now();
        
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess, handleError,
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
        window.addEventListener('devicemotion', handleDeviceMotion);
        window.addEventListener('deviceorientation', handleDeviceOrientation);

    } else {
        setError("Geolocation is not supported.");
    }
  }, [isTracking, handleSuccess, handleError, handleDeviceMotion, handleDeviceOrientation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    window.removeEventListener('devicemotion', handleDeviceMotion);
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    setIsTracking(false);
    setIsSignalLost(false);
    setLocation(prev => prev ? { ...prev, speed: 0 } : null);
  }, [handleDeviceMotion, handleDeviceOrientation]);

  useEffect(() => {
    return () => { 
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      window.removeEventListener('devicemotion', handleDeviceMotion);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [handleDeviceMotion, handleDeviceOrientation]);

  return { isTracking, location, motion, orientation, error, startTracking, stopTracking, requestLocation, isSignalLost };
};
