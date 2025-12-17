
import type { LatLng } from '../types';
import { calculateDistance } from './helpers';

// Helper: Convert LatLng interface to {latitude, longitude} for helper compatibility
const toLatLon = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

// Projects point P onto the line segment defined by A and B
export const getClosestPointOnSegment = (p: LatLng, a: LatLng, b: LatLng): LatLng => {
    const atob = { x: b.lng - a.lng, y: b.lat - a.lat };
    const atop = { x: p.lng - a.lng, y: p.lat - a.lat };
    
    const len2 = atob.x * atob.x + atob.y * atob.y;
    if (len2 === 0) return a; // a and b are the same point

    let t = (atop.x * atob.x + atop.y * atob.y) / len2;
    
    // Clamp t to the segment [0, 1]
    t = Math.max(0, Math.min(1, t));
    
    return {
        lat: a.lat + t * atob.y,
        lng: a.lng + t * atob.x
    };
};

// Finds the closest point on the entire route polyline relative to the user's current index
// Returns extended metadata for navigation logic
export const getSnapToRoute = (
    position: LatLng, 
    routeCoords: LatLng[], 
    currentIndex: number, 
    searchWindow: number = 8
): { snappedPoint: LatLng, distanceToSnap: number, matchedIndex: number } | null => {
    
    if (!routeCoords || routeCoords.length < 2) return null;

    let minDistance = Infinity;
    let bestPoint = position;
    let bestIndex = currentIndex;

    // Optimization: Only search a window around the current estimated position
    // We search slightly backwards (in case of GPS lag) and forwards
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(routeCoords.length - 1, currentIndex + searchWindow);

    for (let i = start; i < end; i++) {
        const p1 = routeCoords[i];
        const p2 = routeCoords[i + 1];
        
        if (!p1 || !p2) continue;

        const projected = getClosestPointOnSegment(position, p1, p2);
        
        // Use the existing calculateDistance helper
        const dist = calculateDistance(toLatLon(position), toLatLon(projected));

        if (dist < minDistance) {
            minDistance = dist;
            bestPoint = projected;
            bestIndex = i;
        }
    }

    return {
        snappedPoint: bestPoint,
        distanceToSnap: minDistance,
        matchedIndex: bestIndex
    };
};

// --- DSA: Ramer-Douglas-Peucker (RDP) Algorithm ---
// Purpose: Compress route path to save 90% storage while preserving shape.
const perpendicularDistance = (point: LatLng, lineStart: LatLng, lineEnd: LatLng): number => {
    const x = point.lng;
    const y = point.lat;
    const x1 = lineStart.lng;
    const y1 = lineStart.lat;
    const x2 = lineEnd.lng;
    const y2 = lineEnd.lat;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    
    // Roughly convert degrees to meters for tolerance check (approximate)
    // 1 deg ~= 111km. 0.00001 ~= 1.1m
    return Math.sqrt(dx * dx + dy * dy); 
};

export const simplifyPath = (points: LatLng[], toleranceInMeters: number): LatLng[] => {
    if (points.length <= 2) return points;

    // Convert meters to rough degrees
    const tolerance = toleranceInMeters * 0.000009;

    let maxDist = 0;
    let index = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const dist = perpendicularDistance(points[i], start, end);
        if (dist > maxDist) {
            maxDist = dist;
            index = i;
        }
    }

    if (maxDist > tolerance) {
        const left = simplifyPath(points.slice(0, index + 1), toleranceInMeters);
        const right = simplifyPath(points.slice(index), toleranceInMeters);
        return [...left.slice(0, left.length - 1), ...right];
    } else {
        return [start, end];
    }
};

// --- DSA: Geohashing (Base32) ---
// Purpose: Efficient spatial indexing strings
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export const encodeGeohash = (lat: number, lng: number, precision: number = 7): string => {
    let idx = 0;
    let bit = 0;
    let evenBit = true;
    let geohash = '';

    let latMin = -90, latMax = 90;
    let lonMin = -180, lonMax = 180;

    while (geohash.length < precision) {
        if (evenBit) {
            const lonMid = (lonMin + lonMax) / 2;
            if (lng >= lonMid) {
                idx = idx * 2 + 1;
                lonMin = lonMid;
            } else {
                idx = idx * 2;
                lonMax = lonMid;
            }
        } else {
            const latMid = (latMin + latMax) / 2;
            if (lat >= latMid) {
                idx = idx * 2 + 1;
                latMin = latMid;
            } else {
                idx = idx * 2;
                latMax = latMid;
            }
        }

        evenBit = !evenBit;

        if (++bit === 5) {
            geohash += BASE32.charAt(idx);
            bit = 0;
            idx = 0;
        }
    }

    return geohash;
};