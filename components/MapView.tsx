
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import type { GeolocationData, LatLng, Route } from '../types';
import { loadGoogleMaps } from '../utils/mapLoader';
import { lerp, lerpAngle } from '../utils/smoothing';

declare var google: any;

interface MapViewProps {
    location: GeolocationData | null;
    start: LatLng | null;
    destination: LatLng | null;
    onRoutesFound: (routes: Route[]) => void;
    onError?: (message: string) => void;
    isNavigating: boolean;
    activeRoute: Route | null;
    activeRouteIndex?: number;
    theme?: 'light' | 'dark';
    onUserInteraction?: () => void;
}

export interface MapViewHandle {
    zoomIn: () => void;
    zoomOut: () => void;
    recenter: () => void;
    recalculateRoute: () => void;
}

const createNavigationArrow = (rotation: number) => {
    const container = document.createElement('div');
    container.className = "nav-puck-container";
    container.innerHTML = `
        <div style="will-change: transform; transform: translate(-50%, -50%);">
            <div style="
                width: 44px; height: 44px; background: white; border-radius: 50%; 
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; border: 3px solid #fff;
            ">
                <div id="arrow-icon" style="
                    width: 0; height: 0; 
                    border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 22px solid #4285F4;
                    transform: translateY(-2px) rotate(${rotation}deg);
                "></div>
            </div>
        </div>
    `;
    return container;
};

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ location, start, destination, onRoutesFound, onError, isNavigating, activeRoute, activeRouteIndex = 0, theme = 'dark', onUserInteraction }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const directionsRendererRef = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const hasCenteredRef = useRef(false);
    
    // Smart Recenter
    const [isManualMode, setIsManualMode] = useState(false);
    const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Animation Refs
    const requestRef = useRef<number | null>(null);
    
    // Render State (Current vs Target)
    const currentRenderState = useRef({ lat: 0, lng: 0, heading: 0, zoom: 17, bearing: 0 }); 
    const targetState = useRef({ lat: 0, lng: 0, heading: 0, zoom: 17, bearing: 0 }); 
    
    const [isMapVisible, setIsMapVisible] = useState(false);

    // Reset manual mode when navigation starts
    useEffect(() => {
        if (isNavigating) handleResumeFollowing();
    }, [isNavigating]);

    const handleUserInteraction = () => {
        setIsManualMode(true);
        if (onUserInteraction) onUserInteraction();
        if (isNavigating) {
            if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
            interactionTimeoutRef.current = setTimeout(() => handleResumeFollowing(), 15000); 
        }
    };

    const handleResumeFollowing = () => {
        setIsManualMode(false);
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };

    // Initialize Map
    useEffect(() => {
        loadGoogleMaps().then(() => {
            if (mapRef.current && !googleMapRef.current) {
                const mapOptions = {
                    center: { lat: -33.8688, lng: 151.2093 }, 
                    zoom: 17,
                    disableDefaultUI: true,
                    backgroundColor: '#0F172A',
                    gestureHandling: 'greedy',
                    mapId: "SAFE_DRIVE_MAP_ID" 
                };

                googleMapRef.current = new google.maps.Map(mapRef.current, mapOptions);
                const DirectionsService = new google.maps.DirectionsService();
                
                directionsRendererRef.current = new google.maps.DirectionsRenderer({
                    map: googleMapRef.current,
                    suppressMarkers: true, 
                    preserveViewport: true, 
                    polylineOptions: { strokeColor: "#4285F4", strokeWeight: 6, strokeOpacity: 0.9, zIndex: 100 }
                });

                // Detect Manual Interaction
                googleMapRef.current.addListener('dragstart', handleUserInteraction);

                // --- CUSTOM HTML MARKER SETUP ---
                class HTMLMarker extends google.maps.OverlayView {
                    position: any;
                    div: HTMLElement | null;
                    rotation: number;

                    constructor(position: any) {
                        super();
                        this.position = position;
                        this.div = null;
                        this.rotation = 0;
                    }

                    onAdd() {
                        this.div = createNavigationArrow(0);
                        const panes = (this as any).getPanes();
                        if (panes && this.div) panes.overlayMouseTarget.appendChild(this.div);
                    }

                    draw() {
                        if (!this.div) return;
                        const overlayProjection = this.getProjection();
                        const point = overlayProjection.fromLatLngToDivPixel(this.position);
                        if (point) {
                            this.div.style.position = 'absolute';
                            this.div.style.left = point.x + 'px';
                            this.div.style.top = point.y + 'px';
                            // Direct DOM manipulation for high-performance rotation
                            const arrow = this.div.querySelector('#arrow-icon') as HTMLElement;
                            if (arrow) arrow.style.transform = `translateY(-2px) rotate(${this.rotation}deg)`;
                        }
                    }

                    onRemove() {
                        if (this.div && this.div.parentNode) {
                            this.div.parentNode.removeChild(this.div);
                            this.div = null;
                        }
                    }

                    updateState(lat: number, lng: number, rotation: number) {
                        this.position = new google.maps.LatLng(lat, lng);
                        this.rotation = rotation;
                        this.draw(); 
                    }
                }

                userMarkerRef.current = new HTMLMarker(mapOptions.center);
                userMarkerRef.current.setMap(googleMapRef.current);
                
                // Expose Directions Service via closure for calculating routes
                (window as any).safeDriveDirectionsService = DirectionsService;
            }
        });
    }, [theme]);

    // --- 60 FPS RENDER LOOP ---
    const animate = () => {
        // Tuned smoothing factors
        const smoothPos = 0.15; 
        const smoothAngle = 0.1; // Balanced for smoothness vs responsiveness

        // 1. Interpolate Values
        const lat = lerp(currentRenderState.current.lat, targetState.current.lat, smoothPos);
        const lng = lerp(currentRenderState.current.lng, targetState.current.lng, smoothPos);
        const heading = lerpAngle(currentRenderState.current.heading, targetState.current.heading, smoothAngle); // User True Heading
        
        // Target Camera Bearing: If navigating and following, match heading. If manual/idle, 0 (North Up).
        const targetBearing = (isNavigating && !isManualMode) ? targetState.current.heading : 0;
        const bearing = lerpAngle(currentRenderState.current.bearing, targetBearing, smoothAngle);

        currentRenderState.current = { lat, lng, heading, zoom: 17, bearing };

        if (userMarkerRef.current && googleMapRef.current) {
            
            // LOGIC:
            // 1. Navigation Mode (Follow): Map rotates (Bearing = User Heading). Marker points UP (0 deg relative to screen).
            // 2. Free Drive / Manual: Map Fixed (Bearing = 0). Marker rotates (Rotation = User Heading).
            
            if (isNavigating && !isManualMode) {
                // FOLLOW MODE (Map Rotates)
                googleMapRef.current.moveCamera({
                    center: { lat, lng },
                    heading: bearing, 
                    tilt: 60,
                    zoom: 18
                });
                
                // Marker stays pointing UP relative to screen because the map is rotated to match the heading.
                userMarkerRef.current.updateState(lat, lng, 0); 

            } else {
                // NORTH UP / MANUAL (Map Static)
                if (!isManualMode) {
                    googleMapRef.current.moveCamera({ center: { lat, lng }, heading: 0, tilt: 0 });
                }
                // Marker rotates to show compass direction relative to North-Up map
                userMarkerRef.current.updateState(lat, lng, heading);
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isNavigating, isManualMode]); 

    // Handle GPS/Compass Updates
    useEffect(() => {
        if (location) {
            // New heading from useGeolocation (already fused with Compass if moving slowly)
            const newHeading = location.heading || targetState.current.heading;
            
            targetState.current = {
                lat: location.latitude,
                lng: location.longitude,
                heading: newHeading,
                zoom: 17,
                bearing: 0 // Not used directly, calculated in animate loop based on mode
            };

            // Initial Snap
            if (!hasCenteredRef.current && googleMapRef.current) {
                currentRenderState.current = { ...targetState.current };
                googleMapRef.current.setCenter({ lat: location.latitude, lng: location.longitude });
                hasCenteredRef.current = true;
                setTimeout(() => setIsMapVisible(true), 500);
            }
        }
    }, [location]);

    // Route Rendering
    useEffect(() => {
        if (!directionsRendererRef.current) return;

        if (start && destination && (window as any).safeDriveDirectionsService) {
            (window as any).safeDriveDirectionsService.route(
                {
                    origin: start,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (result: any, status: any) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        directionsRendererRef.current.setDirections(result);
                        
                        const routes = result.routes.map((r: any) => ({
                            summaryText: r.summary,
                            summary: {
                                totalDistance: r.legs.reduce((acc: number, leg: any) => acc + leg.distance.value, 0),
                                totalTime: r.legs.reduce((acc: number, leg: any) => acc + leg.duration.value, 0),
                            },
                            coordinates: r.overview_path.map((p: any) => ({ lat: p.lat(), lng: p.lng() })),
                            instructions: r.legs[0].steps.map((s: any, idx: number) => ({
                                text: s.instructions,
                                distance: s.distance.value,
                                index: idx
                            }))
                        }));
                        onRoutesFound(routes);
                    } else {
                        if (onError) onError("Could not calculate route.");
                    }
                }
            );
        } else {
            // Clear the map if destination or start is removed
            directionsRendererRef.current.setDirections({ routes: [] });
        }
    }, [start, destination]);

    useImperativeHandle(ref, () => ({
        zoomIn: () => googleMapRef.current?.setZoom(googleMapRef.current.getZoom() + 1),
        zoomOut: () => googleMapRef.current?.setZoom(googleMapRef.current.getZoom() - 1),
        recenter: () => {
            handleResumeFollowing();
            if (location) {
                // Snap immediately
                currentRenderState.current.lat = location.latitude;
                currentRenderState.current.lng = location.longitude;
                targetState.current.lat = location.latitude;
                targetState.current.lng = location.longitude;
            }
        },
        recalculateRoute: () => {
            // Trigger route calc again with current state logic
        }
    }));

    return (
        <div className="relative w-full h-full bg-slate-900">
            <div ref={mapRef} className={`w-full h-full transition-opacity duration-1000 ${isMapVisible ? 'opacity-100' : 'opacity-0'}`} />
        </div>
    );
});

export default MapView;
