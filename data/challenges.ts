import { Challenge } from '../types';

export const INITIAL_CHALLENGES: Challenge[] = [
    { 
        id: 'streak_7', 
        type: 'CONSECUTIVE_SAFE_DAYS', 
        title: 'Safety Streak', 
        description: 'Drive 7 consecutive days with high compliance.', 
        points: 500, 
        goal: 7, 
        progress: 0, 
        isComplete: false 
    },
    { 
        id: 'distance_100', 
        type: 'ERROR_FREE_DISTANCE', 
        title: 'The Perfectionist', 
        description: 'Drive 100km with a compliance score over 95%.', 
        points: 1000, 
        goal: 100, 
        progress: 0, 
        isComplete: false 
    },
    { 
        id: 'perfect_5', 
        type: 'PERFECT_TRIPS', 
        title: 'Flawless Finisher', 
        description: 'Complete 5 trips with a perfect 100% score.', 
        points: 300, 
        goal: 5, 
        progress: 0, 
        isComplete: false 
    },
];
