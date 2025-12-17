import type { Trip, Challenge, UserStats } from '../types';

export const processTripForChallenges = (
    trip: Trip, 
    currentChallenges: Challenge[],
    userStats: UserStats
): { updatedChallenges: Challenge[], awardedPoints: number, completedTitles: string[] } => {
    
    let awardedPoints = 0;
    const completedTitles: string[] = [];

    const updatedChallenges = currentChallenges.map(challenge => {
        if (challenge.isComplete) {
            return challenge;
        }

        const newChallenge = { ...challenge };
        let progressMade = false;

        switch (newChallenge.type) {
            case 'CONSECUTIVE_SAFE_DAYS':
                // This is based on the user's overall streak, updated after the trip
                newChallenge.progress = userStats.streak;
                progressMade = true;
                break;
            
            case 'ERROR_FREE_DISTANCE':
                // Add distance to progress only if the trip was high compliance
                if (trip.complianceScore > 95) {
                    newChallenge.progress += trip.distance;
                    progressMade = true;
                }
                break;
            
            case 'PERFECT_TRIPS':
                // Increment if the trip was flawless
                if (trip.complianceScore === 100) {
                    newChallenge.progress += 1;
                    progressMade = true;
                }
                break;
        }

        // Check for completion
        if (progressMade && newChallenge.progress >= newChallenge.goal) {
            newChallenge.isComplete = true;
            newChallenge.progress = newChallenge.goal; // Cap progress at goal
            awardedPoints += newChallenge.points;
            completedTitles.push(newChallenge.title);
        }

        return newChallenge;
    });

    return { updatedChallenges, awardedPoints, completedTitles };
};
