
import { useState, useEffect, useRef, useCallback } from 'react';
import type { POI, POIType } from '../types';

// Cache to store fetched POIs to avoid redundant API calls
const cache = new Map<string, POI[]>();

const OVERPASS_API_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter", // A reliable alternative instance
    "https://overpass-api.de/api/interpreter", // The main instance
    "https://z.overpass-api.de/api/interpreter" // Another official mirror
];

const fetchPOIs = async (bounds: { north: number, south: number, east: number, west: number }): Promise<POI[]> => {
    const boundsStr = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    const cacheKey = boundsStr;

    if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
    }

    const query = `
        [out:json][timeout:25];
        (
          node["amenity"="cafe"](${boundsStr});
          node["amenity"="restaurant"](${boundsStr});
          node["tourism"="attraction"](${boundsStr});
        );
        out body;
        >;
        out skel qt;
    `;

    for (const url of OVERPASS_API_ENDPOINTS) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
            });
            
            if (!response.ok) {
                 // For server errors, it's worth trying another mirror.
                if (response.status >= 500) {
                    console.warn(`Overpass API endpoint ${url} failed with status ${response.status}. Trying next...`);
                    continue; // Try next URL in the list
                }
                // For other errors (like 4xx), it's probably a client-side issue, but we'll still try the next for robustness.
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            const pois: POI[] = data.elements.map((el: any) => {
                let type: POIType = 'generic';
                if (el.tags.amenity === 'cafe') type = 'cafe';
                else if (el.tags.amenity === 'restaurant') type = 'restaurant';
                else if (el.tags.tourism === 'attraction') type = 'attraction';

                return {
                    id: el.id,
                    lat: el.lat,
                    lng: el.lon,
                    name: el.tags.name || 'Unnamed Place',
                    type,
                };
            }).filter((poi: POI) => poi.name !== 'Unnamed Place'); // Filter out places without names

            cache.set(cacheKey, pois);
            return pois; // Success! Return the data.

        } catch (error) {
            console.warn(`Failed to fetch from Overpass API endpoint ${url}:`, error);
            // The loop will automatically continue to the next endpoint.
        }
    }

    // If all endpoints failed
    console.error("Failed to fetch POIs from all Overpass API endpoints.");
    return [];
};

export const useNearbyPOIs = (bounds: any) => {
    const [pois, setPois] = useState<POI[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadPOIs = useCallback(async (currentBounds: any) => {
        if (!currentBounds) return;
        setIsLoading(true);
        const fetchedPois = await fetchPOIs(currentBounds);
        setPois(fetchedPois);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            loadPOIs(bounds);
        }, 500); // Debounce API calls by 500ms

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [bounds, loadPOIs]);

    return { pois, isLoading };
};
