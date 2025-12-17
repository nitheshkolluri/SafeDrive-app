
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGeolocation } from './useGeolocation';
import { useDrivingAnalytics } from './useDrivingAnalytics';
import type { Trip, GeolocationData, DrivingEvent, SetupMode, LocationPoint, UserStats, Challenge, DeviceOrientationData, TripValidity, LatLng } from '../types';
import { calculateDistance } from '../utils/helpers';
import { useLocalStorage } from './useLocalStorage';
import { processTripForChallenges } from '../utils/challengeProcessor';
import { INITIAL_CHALLENGES } from '../data/challenges';
import { syncService } from '../utils/sync';
import { auth } from '../utils/firebase';
import { userRepository } from '../utils/userRepository';
import { simplifyPath } from '../utils/geometry'; // RDP Algorithm

const POINTS_PER_KM_SAFE = 15; 
const MIN_SPEED_FOR_POINTS = 15; 
const MAX_VALID_SPEED = 200; 

export const useTrip = (setupMode: SetupMode | null, calibratedOrientation: DeviceOrientationData | null) => {
  const { isTracking: isGeolocationActive, location, motion, orientation, error: geolocationError, startTracking, stopTracking, requestLocation, isSignalLost } = useGeolocation();
  
  const { 
      points: eventPoints, 
      demerits, 
      warnings, 
      lastEvent, 
      speedLimit, 
      isPassenger, 
      driverConfidence,
      weather,
      isSchoolZone,
      activeSchoolTime
  } = useDrivingAnalytics({ 
      location, 
      motion, 
      orientation,
      isTripActive: isGeolocationActive, 
      setupMode,
      baseOrientation: calibratedOrientation 
  });
  
  const [isTripActive, setIsTripActive] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [accumulatedPoints, setAccumulatedPoints] = useState(0);
  
  // NEW STATE: Reward Eligibility
  const [rewardEligible, setRewardEligible] = useState(true);
  
  const [recentTrips, setRecentTrips] = useLocalStorage<Trip[]>('recent-trips', []);
  const [stats, setStats] = useLocalStorage<UserStats>('user-stats', { points: 0, streak: 0, complianceScore: 100, totalDistance: 0, totalTrips: 0 });
  const [userChallenges, setUserChallenges] = useLocalStorage<Challenge[]>('user-challenges', INITIAL_CHALLENGES);

  const prevLocationRef = useRef<GeolocationData | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxSpeedRef = useRef<number>(0);
  const eventsRef = useRef<DrivingEvent[]>([]);
  const pathRef = useRef<LatLng[]>([]); // Route History
  const distractionCountRef = useRef(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTripActive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTripActive]);

  useEffect(() => {
      if (lastEvent) {
          eventsRef.current.push(lastEvent);
          
          if (lastEvent.type === 'PHONE_TOUCH' || lastEvent.type === 'PHONE_DISTRACTION') {
              distractionCountRef.current += 1;
              
              if (distractionCountRef.current === 1) {
                  // 1st OFFENSE: 50% Penalty
                  setAccumulatedPoints(prev => Math.floor(prev * 0.5));
              } else if (distractionCountRef.current >= 2) {
                  // 2nd OFFENSE: Invalidate
                  setRewardEligible(false);
                  if (distractionCountRef.current === 2) {
                      eventsRef.current.push({
                          type: 'TRIP_INVALIDATED_PHONE_USE',
                          timestamp: Date.now(),
                          points: 0,
                          description: 'Trip Invalidated: Repeated Phone Use'
                      });
                  }
              }
          } else {
              setAccumulatedPoints(prev => prev + lastEvent.points);
          }
      }
  }, [lastEvent]);

  useEffect(() => {
    if (isTripActive && location) {
      if (prevLocationRef.current) {
        const distDelta = calculateDistance(
          { latitude: prevLocationRef.current.latitude, longitude: prevLocationRef.current.longitude },
          { latitude: location.latitude, longitude: location.longitude }
        );
        
        if (location.accuracy < 40) {
             setDistance(prev => prev + (distDelta / 1000)); 
             
             // --- PATH COLLECTION ---
             // Optimization: Only record point if moved > 5 meters to reduce raw noise
             if (distDelta > 5) {
                 pathRef.current.push({ lat: location.latitude, lng: location.longitude });
             }
             
             // Only accumulate points if trip is still eligible
             if (rewardEligible && location.speed && location.speed > MIN_SPEED_FOR_POINTS) {
                 const pointsEarned = (distDelta / 1000) * POINTS_PER_KM_SAFE;
                 setAccumulatedPoints(prev => prev + pointsEarned);
             }
        }
      }
      
      if (location.speed && location.speed > maxSpeedRef.current && location.speed < MAX_VALID_SPEED) {
          maxSpeedRef.current = location.speed;
      }
      
      prevLocationRef.current = location;
    }
  }, [location, isTripActive, rewardEligible]);

  const startTrip = useCallback(() => {
    setIsTripActive(true);
    setDistance(0);
    setDuration(0);
    setAccumulatedPoints(0);
    setRewardEligible(true);
    eventsRef.current = [];
    pathRef.current = []; // Reset Path
    maxSpeedRef.current = 0;
    distractionCountRef.current = 0;
    startTimeRef.current = Date.now();
    startTracking();
    prevLocationRef.current = null;
  }, [startTracking]);

  const stopTrip = useCallback(async (startPoint: LocationPoint | null, endPoint: LocationPoint | null, shouldSave: boolean = true) => {
    setIsTripActive(false);
    stopTracking();
    
    if (!shouldSave) {
        setDistance(0);
        setDuration(0);
        setAccumulatedPoints(0);
        eventsRef.current = [];
        pathRef.current = [];
        return;
    }

    // Determine Mode based on confidence and speed
    let mode: 'car' | 'bus' | 'train' | 'walk' | 'unknown' = 'car';
    if (maxSpeedRef.current > 180) mode = 'train';
    else if (maxSpeedRef.current < 20) mode = 'walk';
    
    let validity: TripValidity = 'VALID';
    if (!rewardEligible) validity = 'INVALID_HANDHELD';
    else if (driverConfidence < 0.4) validity = 'INVALID_PASSENGER';
    else if (mode === 'train') validity = 'INVALID_TRAIN';

    // Calculate final scores
    const negativeEventsCount = eventsRef.current.filter(e => e.points < 0).length;
    const safetyScore = Math.max(0, 100 - (negativeEventsCount * 5));
    
    // Zero out points if invalid
    let finalPoints = (validity === 'VALID') ? Math.floor(accumulatedPoints) : 0;

    // --- COMPRESSION ---
    // Apply RDP algorithm to reduce point count (5 meter tolerance)
    // This reduces storage size by ~90% while keeping visual fidelity
    const compressedPath = simplifyPath(pathRef.current, 5);

    const newTrip: Trip = {
        id: Date.now().toString(),
        startTime: startTimeRef.current,
        endTime: Date.now(),
        distance: distance,
        duration: duration,
        points: finalPoints,
        maxSpeed: maxSpeedRef.current,
        complianceScore: safetyScore,
        events: eventsRef.current,
        path: compressedPath, // Save optimized path
        startName: startPoint?.name || "Unknown Location",
        endName: endPoint?.name || "Free Drive",
        validity: validity,
        
        // Save new strict fields
        rewardEligible: rewardEligible && validity === 'VALID',
        driverConfidence: driverConfidence,
        modeOfTransport: mode
    };

    setRecentTrips(prev => [newTrip, ...prev].slice(0, 50));

    if (auth.currentUser) {
        try {
            await syncService.add('trips', newTrip, newTrip.id);
            await userRepository.updateUser(auth.currentUser.uid, {
                currentScore: safetyScore,
                lastActive: Date.now()
            });
        } catch (e) {
            console.error("Failed to sync trip to cloud:", e);
        }
    }

    if (validity === 'VALID') {
        const { updatedChallenges, awardedPoints } = processTripForChallenges(newTrip, userChallenges, stats);
        setUserChallenges(updatedChallenges);

        setStats(prev => ({
            points: prev.points + finalPoints + awardedPoints,
            streak: safetyScore >= 95 ? prev.streak + 1 : 0, 
            complianceScore: Math.round((prev.complianceScore * prev.totalTrips + safetyScore) / (prev.totalTrips + 1)),
            totalDistance: prev.totalDistance + distance,
            totalTrips: prev.totalTrips + 1
        }));
    }

  }, [distance, duration, accumulatedPoints, rewardEligible, driverConfidence, userChallenges, stats, setRecentTrips, setStats, setUserChallenges, stopTracking]);

  return { 
      isTripActive, 
      location, 
      motion, 
      orientation, 
      distance, 
      duration, 
      points: Math.floor(accumulatedPoints), 
      speedLimit, 
      warnings, 
      lastEvent, 
      startTrip, 
      stopTrip, 
      startTracking, 
      isPassenger, 
      weather, 
      isSchoolZone, 
      activeSchoolTime,
      isSignalLost,
      driverConfidence,
      rewardEligible
  };
};