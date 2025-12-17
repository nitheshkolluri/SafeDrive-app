

// Utility to fetch real-world road data using Overpass API

interface OverpassElement {
    type: string;
    id: number;
    tags?: {
        maxspeed?: string;
        highway?: string;
        name?: string;
        amenity?: string; // Check for school
        [key: string]: string | undefined;
    };
}

const OVERPASS_API_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://z.overpass-api.de/api/interpreter"
];

// Heuristics for speed limits in Australia/General (in km/h) if maxspeed tag is missing
const HIGHWAY_SPEEDS: Record<string, number> = {
    'motorway': 110,
    'motorway_link': 80,
    'trunk': 100,
    'primary': 80,
    'secondary': 60,
    'tertiary': 60,
    'residential': 50,
    'living_street': 20,
    'service': 20,
    'unclassified': 80
};

export const fetchRoadData = async (lat: number, lng: number): Promise<{ maxSpeed: number | null, roadName: string | null, isSchoolZone: boolean }> => {
    // Query for ways (roads) AND schools within range
    // Schools: Scan 80m radius (amenity=school) on nodes and ways
    // Roads: Scan 20m radius
    const query = `
        [out:json][timeout:5];
        (
          way(around:20, ${lat}, ${lng})["highway"];
          node(around:80, ${lat}, ${lng})["amenity"="school"];
          way(around:80, ${lat}, ${lng})["amenity"="school"];
        );
        out tags;
    `;

    for (const url of OVERPASS_API_ENDPOINTS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const response = await fetch(url, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const data = await response.json();
            
            let maxSpeed = null;
            let roadName = null;
            let isSchoolZone = false;

            if (data.elements && data.elements.length > 0) {
                
                // 1. Check for School Zone presence
                const schoolElement = data.elements.find((el: OverpassElement) => el.tags?.amenity === 'school');
                if (schoolElement) {
                    isSchoolZone = true;
                }

                // 2. Find Best Road
                let bestRoad = data.elements.find((el: OverpassElement) => el.tags?.maxspeed);
                // If no maxspeed, prioritize highways over schools in the list for speed limit logic
                if (!bestRoad) {
                    bestRoad = data.elements.find((el: OverpassElement) => el.tags?.highway);
                }

                if (bestRoad && bestRoad.tags) {
                    // Parse maxspeed tag
                    if (bestRoad.tags.maxspeed) {
                        const parsed = parseInt(bestRoad.tags.maxspeed, 10);
                        if (!isNaN(parsed)) maxSpeed = parsed;
                    } 
                    
                    // Fallback to heuristics
                    if (!maxSpeed && bestRoad.tags.highway && HIGHWAY_SPEEDS[bestRoad.tags.highway]) {
                        maxSpeed = HIGHWAY_SPEEDS[bestRoad.tags.highway];
                    }

                    roadName = bestRoad.tags.name || null;
                }
            }
            
            return { maxSpeed, roadName, isSchoolZone };

        } catch (error) {
            // Try next endpoint
            continue;
        }
    }
    return { maxSpeed: null, roadName: null, isSchoolZone: false };
};
