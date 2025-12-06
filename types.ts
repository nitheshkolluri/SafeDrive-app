
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


export type DrivingEventType = 
    | 'SPEEDING' 
    | 'HARSH_BRAKING' 
    | 'HARSH_ACCELERATION' 
    | 'SHARP_TURN' 
    | 'PHONE_DISTRACTION' 
    | 'PHONE_NOT_STABLE' 
    | 'SMOOTH_BRAKING' 
    | 'SAFE_DISTANCE' 
    | 'CRASH' 
    | 'PASSENGER_DETECTED'
    | 'SCHOOL_ZONE_SPEEDING'
    | 'WEATHER_UNSAFE_SPEED'
    | 'PHONE_TOUCH'
    | 'TRIP_INVALIDATED_PHONE_USE'
    | 'UNSAFE_CORNERING'
    | 'AGGRESSIVE_LANE_CHANGE';

export type SeverityLevel = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface DrivingEvent {
    type: DrivingEventType;
    timestamp: number;
    value?: number;
    points: number; 
    severity?: number; // 0.0 - 1.0 (Legacy numeric)
    severityLevel?: SeverityLevel; // New text classification
    description?: string;
    disputed?: boolean; 
    disputeEvidence?: string;
    // New context fields for violations
    lat?: number;
    lng?: number;
    speed?: number;
    roadSpeedLimit?: number;
}

export type TripValidity = 'VALID' | 'INVALID_TRAIN' | 'INVALID_BUS' | 'INVALID_PASSENGER' | 'INVALID_HANDHELD';

export interface Trip {
  id: string;
  vehicleId?: string;
  userId?: string;
  startTime: number;
  endTime: number;
  distance: number; // in km
  duration: number; // in seconds
  points: number;
  maxSpeed: number; // km/h
  complianceScore: number; // 0-100
  events: DrivingEvent[];
  path?: LatLng[]; // Compressed route history (RDP)
  startName: string;
  endName?: string; 
  validity: TripValidity;
  passengerConfidence?: number; 
  purpose?: 'Business' | 'Personal'; 
  notes?: string; 
  deletedAt?: number;
  
  // NEW FIELDS
  rewardEligible: boolean;
  driverConfidence: number; // 0.0 - 1.0
  modeOfTransport: 'car' | 'bus' | 'train' | 'walk' | 'unknown';
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


export type Screen = 'home' | 'profile' | 'rewards' | 'support' | 'circles';

export type SetupMode = 'mount' | 'carplay' | 'passenger';

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
    summaryText: string;
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
    userId?: string; 
    name: string; 
    address: string;
    coords: LatLng;
    icon: string; 
    deletedAt?: number;
}

export interface User {
    id?: string;
    name: string;
    email?: string;
    contact?: string;
    photoUrl?: string;
    isGuest: boolean;
    theme?: 'light' | 'dark';
    isPremium?: boolean;
    circleId?: string; // Legacy field
    circleIds?: string[]; // V2: Multi-circle support
    currentScore?: number; 
    lastActive?: number; 
}

// --- CIRCLES V2 TYPES ---

export type CircleRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'READ_ONLY';

export interface CircleSettings {
    autoJoin: boolean;
    requireApproval: boolean;
    shareLocationDefault: 'opt-out' | 'opt-in';
    poolingEnabled: boolean;
    challengesEnabled: boolean;
}

export interface CircleAnalyticsSummary {
    avgSafetyScore: number;
    totalPoints: number;
    overspeedCount: number;
    lastUpdated: number; // timestamp
}

export interface Circle {
    id: string;
    ownerId: string;
    name: string;
    inviteCode: string; // Legacy
    memberIds: string[]; // Legacy & V2 (Syncd)
    createdAt: number;
    
    // V2 Fields
    description?: string;
    avatarUrl?: string;
    settings?: CircleSettings;
    analyticsSummary?: CircleAnalyticsSummary;
    v2_enabled?: boolean;
}

export interface CircleMember {
    uid: string;
    role: CircleRole;
    joinedAt: number;
    shareLocation: boolean;
    lastActiveAt: number;
    // Client-side joins
    userProfile?: Partial<User>; 
}

export interface CircleInvite {
    id: string;
    circleId: string;
    token: string; // Hashed in DB, plain in Link
    createdBy: string;
    expiresAt: number;
    maxUses: number;
    uses: number;
    requireApproval: boolean;
}

// ------------------------

export type WeatherCondition = 'clear' | 'rain' | 'snow' | 'unknown';

export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: string;
    odometer: number; 
    lastServiceDate?: number;
    nextServiceDueKm?: number;
    lastOilChangeKm?: number;
    lastTireRotationKm?: number;
    deletedAt?: number;
    permanentDeleteDue?: number; 
}

export interface SafetyCircleMember {
    id: string;
    name: string;
    avatar?: string;
    safetyScore: number;
    lastActive: number;
    status: 'driving' | 'idle' | 'offline';
    location?: LatLng; 
}

export interface HazardReport {
    id: string;
    type: 'pothole' | 'accident' | 'traffic' | 'weather' | 'police';
    lat: number;
    lng: number;
    timestamp: number;
    reporterId: string;
}

export interface FileMetadata {
    id: string;
    name: string;
    downloadUrl: string;
    path: string; 
    type: string; 
    size: number;
    uploadedAt: number;
    relatedTripId?: string;
    notes?: string;
    aiSummary?: string;
    deletedAt?: number;
}

export interface Feedback {
    id: string;
    category: 'bug' | 'feature' | 'general';
    message: string;
    timestamp: number;
    status: 'new' | 'read' | 'resolved';
    userEmail?: string;
}

export interface Reward {
    id: string;
    name: string;
    points: number;
    partner: string;
    icon: string;
    description: string;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    isSponsored?: boolean;
    isLimited?: boolean;
    comingSoon?: boolean;
    expiry?: number;
}

export interface Redemption {
    id: string;
    rewardId: string;
    userId: string;
    code: string;
    timestamp: number;
    status: 'active' | 'used' | 'expired';
}