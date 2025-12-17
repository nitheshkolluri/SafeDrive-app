
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export const FEATURE_FLAGS = {
    USE_FUSED_HEADING: true,
    USE_SPEED_CALIBRATION: true,
    STRICT_SPEEDING_CHECK: true
};

export const NAV_CONFIG = {
    // Sensor Fusion & Smoothing
    HEADING_SMOOTHING_FACTOR: 0.08, // Lower = Smoother, Higher = More Responsive
    SPEED_SMOOTHING_FACTOR: 0.15,

    // GPS Signal Health
    GPS_TIMEOUT_MS: 10000, // 10s without update = Signal Lost
    GPS_ACCURACY_THRESHOLD_M: 40, // Ignore speeding/penalties if accuracy is worse than this

    // Rerouting & Guidance
    OFF_ROUTE_THRESHOLD_M: 25, // Strict reroute trigger
    SNAP_TO_ROUTE_THRESHOLD_M: 30, // Distance to snap location for visual/calc

    // Speeding Logic
    SPEED_TOLERANCE_KMH: 4,
    SPEED_SUSTAIN_TIME_MS: 3000,

    // Voice Guidance Thresholds (Meters)
    VOICE_PREP_DIST: 2000,
    VOICE_APPROACH_DIST: 500,
    VOICE_NEAR_DIST: 200,
    VOICE_EXECUTE_DIST: 40
};

export const VIOLATION_CONFIG = {
    SPEEDING: {
        BUFFER_SECONDS: 3,
        RECURRING_PENALTY_SECONDS: 5, // Deduct points every 5s if still speeding
        MINOR_THRESHOLD: 5,
        MODERATE_THRESHOLD: 10,
        SERIOUS_THRESHOLD: 20,
        CRITICAL_THRESHOLD: 30,
        POINTS: {
            MINOR: -3,
            MODERATE: -7,
            SERIOUS: -15,
            CRITICAL: -30,
            RECURRING: -5
        }
    },
    G_FORCE: {
        HARSH_BRAKING: -8.5,
        HARSH_ACCEL: 8.5,
        CORNERING: 5.5,
        LANE_CHANGE: 3.5,
        CRASH: 18.0
    },
    SAFE_STOP: {
        SPEED_THRESHOLD: 1.5, // km/h
        DURATION_MS: 4000 // Time required to be stopped before phone touch is allowed
    }
};
