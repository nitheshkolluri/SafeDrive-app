
import { GOOGLE_MAPS_API_KEY } from './config';

declare global {
  interface Window {
    google: any;
    googleMapsCallback: () => void;
  }
}

let loaderPromise: Promise<void> | null = null;

export const loadGoogleMaps = (): Promise<void> => {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return;
    
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const apiKey = GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      const error = new Error("Google Maps API Key is missing. Please set GOOGLE_MAPS_API_KEY in utils/config.ts");
      console.error(error);
      reject(error);
      return;
    }

    // Define the callback function globally
    const callbackName = "googleMapsCallback";
    window.googleMapsCallback = () => {
        resolve();
    };

    const script = document.createElement('script');
    // Add explicit libraries and language param. 
    // loading=async is required to remove the warning.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&language=en&v=weekly&callback=${callbackName}&libraries=places,geometry,marker`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return loaderPromise;
};
