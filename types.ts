
export interface GeolocationData {
    latitude: number;
    longitude: number;
    speed: number | null; // km/h
    accuracy: number;
    heading: number | null; // degrees from north
}

export interface DeviceMotionData {
    acceleration: {
        x: number | null;
        y: number | null;
        z: number | null;
    };
    rotationRate: {
        alpha: number | null; // z-axis
        beta: number | null;  // x-axis
        gamma: number | null; // y-axis
    };
}

export interface DeviceOrientationData {
    alpha: number | null; // Z-axis rotation (yaw)
    beta: number | null;  // X-axis rotation (pitch)
    gamma: number | null; // Y-axis rotation (roll)
}


export type DrivingEventType = 'SPEEDING' | 'HARSH_BRAKING' | 'HARSH_ACCELERATION' | 'SHARP_TURN' | 'PHONE_DISTRACTION' | 'PHONE_NOT_STABLE' | 'SMOOTH_BRAKING' | 'SAFE_DISTANCE' | 'CRASH' | 'POTHOLE';

export interface DrivingEvent {
    type: DrivingEventType;
    timestamp: number;
    value?: number;
    points: number; // Negative for demerits, positive for rewards
}

export interface Trip {
    id: string;
    startTime: number;
    endTime: number;
    distance: number; // in km
    duration: number; // in seconds
    points: number;
    maxSpeed: number; // km/h
    complianceScore: number; // 0-100
    events: DrivingEvent[];
    startName: string;
    endName?: string; // Optional for Free Drive
}

export interface UserStats {
    points: number;
    streak: number;
    complianceScore: number;
    totalDistance: number;
    totalTrips: number;
}

export interface Booster {
    id: string;
    name: string;
    multiplier: number;
    expires: number; // timestamp
}

export type ChallengeType = 'CONSECUTIVE_SAFE_DAYS' | 'ERROR_FREE_DISTANCE' | 'PERFECT_TRIPS';

export interface Challenge {
    id: string;
    type: ChallengeType;
    title: string;
    description: string;
    points: number;
    goal: number; // e.g., 7 days, 100 km
    progress: number; // current value, not percentage
    isComplete: boolean;
}


export type Screen = 'home' | 'profile' | 'rewards' | 'support' | 'potholes';

export type SetupMode = 'mount' | 'carplay' | 'handheld';

export interface LatLng {
    lat: number;
    lng: number;
}

export interface RouteInstruction {
    text: string;
    distance: number; // in meters
    index: number; // start index in the route's coordinate array
}

export interface Route {
    instructions: RouteInstruction[];
    coordinates: LatLng[];
    summary: {
        totalDistance: number; // meters
        totalTime: number; // seconds
    };
}

export type POIType = 'cafe' | 'restaurant' | 'attraction' | 'generic';

export interface POI {
    id: number;
    lat: number;
    lng: number;
    name: string;
    type: POIType;
}

export interface LocationPoint {
    name: string;
    coords: LatLng;
}

export interface SavedPlace {
    id: string;
    name: string; // e.g. "Home", "Work", "Gym"
    address: string;
    coords: LatLng;
    icon: string; // Emoji or icon name
}

export interface User {
    id?: string;
    name: string;
    email?: string;
    contact?: string;
    isGuest: boolean;
    theme?: 'light' | 'dark';
}