
import { WeatherCondition } from '../types';

export const fetchLocalWeather = async (lat: number, lng: number): Promise<WeatherCondition> => {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
        );
        
        if (!response.ok) return 'unknown';

        const data = await response.json();
        const code = data.current_weather?.weathercode;

        // WMO Weather interpretation codes (WW)
        // 0-3: Clear/Cloudy
        // 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82: Rain
        // 71, 73, 75, 77, 85, 86: Snow
        
        if (code === undefined) return 'unknown';

        if (code <= 3) return 'clear';
        
        if (
            (code >= 51 && code <= 67) || 
            (code >= 80 && code <= 82)
        ) {
            return 'rain';
        }

        if (
            (code >= 71 && code <= 77) || 
            (code >= 85 && code <= 86)
        ) {
            return 'snow';
        }

        return 'unknown';

    } catch (error) {
        console.warn("Weather fetch failed:", error);
        return 'unknown';
    }
};
