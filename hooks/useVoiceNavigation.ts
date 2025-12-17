
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Route, GeolocationData, User, LatLng } from '../types';
import { calculateDistance, cleanRouteInstruction } from '../utils/helpers';
import { getSnapToRoute } from '../utils/geometry';
import { NAV_CONFIG } from '../utils/config';

interface UseVoiceNavigationProps {
    isTripActive: boolean;
    activeRoute: Route | null;
    currentLocation: GeolocationData | null;
    isMuted: boolean;
    user: User;
    onReroute?: () => void;
}

export const useVoiceNavigation = ({
    isTripActive,
    activeRoute,
    currentLocation,
    isMuted,
    onReroute
}: UseVoiceNavigationProps) => {
    const currentInstructionIndexRef = useRef(0);
    const [spokenInstruction, setSpokenInstruction] = useState<string | null>(null);
    const [isOffRoute, setIsOffRoute] = useState(false);
    
    // Reroute Refs
    const offRouteStartTimeRef = useRef<number | null>(null);
    const lastSpokenIdRef = useRef<string | null>(null);

    // Voice Synthesis
    const speak = useCallback((text: string, force: boolean = false) => {
        if (isMuted || !text || !('speechSynthesis' in window)) return;
        if (window.speechSynthesis.speaking && !force) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05; 
        window.speechSynthesis.speak(utterance);
    }, [isMuted]);

    // Cleanup
    useEffect(() => {
        if (!isTripActive) {
            window.speechSynthesis.cancel();
            currentInstructionIndexRef.current = 0;
            setSpokenInstruction(null);
            setIsOffRoute(false);
        }
    }, [isTripActive]);

    // Navigation Loop
    useEffect(() => {
        if (!isTripActive || !currentLocation || !activeRoute) return;
        
        const rawUserPos: LatLng = { lat: currentLocation.latitude, lng: currentLocation.longitude };
        
        // 1. SNAP TO ROUTE (Fixes "Atrocious Accuracy")
        // Instead of using raw GPS distance, we find where the user *actually* is on the line string.
        const snapResult = getSnapToRoute(rawUserPos, activeRoute.coordinates, currentInstructionIndexRef.current);
        
        let effectivePos = rawUserPos;
        let distanceToSnap = 0;

        if (snapResult) {
            effectivePos = snapResult.snappedPoint;
            distanceToSnap = snapResult.distanceToSnap;
        }

        // 2. Off-Route Detection Logic
        const now = Date.now();
        if (distanceToSnap > NAV_CONFIG.OFF_ROUTE_THRESHOLD_M) {
             if (!offRouteStartTimeRef.current) {
                 offRouteStartTimeRef.current = now;
             } 
             // If off-route for more than 3 seconds (filter GPS jumps), trigger logic
             else if (now - offRouteStartTimeRef.current > 3000) {
                 if (!isOffRoute) {
                     setIsOffRoute(true);
                     speak("Recalculating route.", true);
                     if (onReroute) onReroute();
                 }
             }
             // If off-route, we pause instruction processing until new route comes in
             return; 
        } else {
             if (isOffRoute) {
                 setIsOffRoute(false);
                 // speak("Back on route.");
             }
             offRouteStartTimeRef.current = null;
        }

        // 3. Update Instruction Index
        // Find the next instruction relative to our snapped position
        const instructions = activeRoute.instructions;
        
        // Logic: If we passed the coordinate of the current instruction, move to next.
        if (snapResult && snapResult.matchedIndex > activeRoute.instructions[currentInstructionIndexRef.current]?.index) {
             // Advance instruction if we are physically past the node index of the current instruction
             const nextInstr = activeRoute.instructions.find(i => i.index > snapResult.matchedIndex);
             if (nextInstr) {
                 const newIndex = activeRoute.instructions.indexOf(nextInstr);
                 if (newIndex > -1) currentInstructionIndexRef.current = newIndex;
             }
        }

        const currentInstr = instructions[currentInstructionIndexRef.current];
        if (!currentInstr) return;

        // 4. Calculate Distance to Turn (Using Route Geometry)
        const turnCoord = activeRoute.coordinates[currentInstr.index];
        const distToTurn = calculateDistance(
            { latitude: effectivePos.lat, longitude: effectivePos.lng },
            { latitude: turnCoord.lat, longitude: turnCoord.lng }
        );
        
        const text = cleanRouteInstruction(currentInstr.text);
        if (distToTurn < 5000) setSpokenInstruction(text);

        // 5. Checkpoints & Announce
        let phase: string | null = null;
        let speechText = "";

        if (distToTurn > 1900 && distToTurn < 2100) { phase = 'PREP'; speechText = `In 2 kilometers, ${text}`; }
        else if (distToTurn > 950 && distToTurn < 1050) { phase = 'PREP_1'; speechText = `In 1 kilometer, ${text}`; }
        else if (distToTurn > 450 && distToTurn < 550) { phase = 'APPROACH'; speechText = `In 500 meters, ${text}`; }
        else if (distToTurn > 180 && distToTurn < 220) { phase = 'NEAR'; speechText = `In 200 meters, ${text}`; }
        else if (distToTurn < NAV_CONFIG.VOICE_EXECUTE_DIST) { phase = 'EXECUTE'; speechText = text; }

        if (phase) {
            const id = `${currentInstructionIndexRef.current}_${phase}`;
            if (lastSpokenIdRef.current !== id) {
                // Force speech only on EXECUTE (immediate turn)
                speak(speechText, phase === 'EXECUTE');
                lastSpokenIdRef.current = id;
            }
        }

    }, [currentLocation, isTripActive, activeRoute, speak, isOffRoute, onReroute]);

    return { spokenInstruction, isOffRoute, speak };
};
