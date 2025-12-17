
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const formatDistance = (km: number): string => {
  return km.toFixed(2);
};

// Haversine formula to calculate distance between two lat/lon points
export const calculateDistance = (point1: {latitude: number, longitude: number}, point2: {latitude: number, longitude: number}): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;

    const R = 6371e3; // metres
    const φ1 = toRad(point1.latitude);
    const φ2 = toRad(point2.latitude);
    const Δφ = toRad(point2.latitude - point1.latitude);
    const Δλ = toRad(point2.longitude - point1.longitude);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export const cleanRouteInstruction = (text: string): string => {
    if (!text) return "";
    
    // 1. Remove HTML tags and normalize spaces
    let clean = text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    
    // 2. Aggressive Phrase Simplification (Regex)
    const replacements: [RegExp, string][] = [
        [/^Head \w+ on/i, "Head on"], // "Head northeast on..." -> "Head on"
        [/^Take the (first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th) (left|right)/i, "Take $1 $2"],
        [/^Turn (left|right) onto/i, "Turn $1 on"],
        [/^Turn (left|right) at/i, "Turn $1 at"],
        [/^Slight (left|right)( onto)?/i, "Slight $1"],
        [/^Sharp (left|right)( onto)?/i, "Sharp $1"],
        [/^Take the ramp (onto|to)/i, "Take Ramp to"],
        [/^Merge (onto|to)/i, "Merge on"],
        [/^Keep (left|right) to (stay on|continue on)/i, "Keep $1"],
        [/^At the roundabout,? take the (\w+) exit/i, "Roundabout: $1 Exit"],
        [/^Make a U-turn/i, "U-Turn"],
        [/^Continue (straight )?(onto|on)/i, "Continue on"],
        [/^Destination is on the (left|right)/i, "Dest on $1"],
        [/^Arrive at/i, "Arrive:"],
        [/^Take the exit/i, "Take Exit"]
    ];

    replacements.forEach(([pattern, replacement]) => {
        clean = clean.replace(pattern, replacement);
    });

    // 3. Street Suffix Abbreviations (Including Australian/UK specifics)
    const abbreviations: Record<string, string> = {
        " Street": " St",
        " Road": " Rd",
        " Avenue": " Ave",
        " Drive": " Dr",
        " Boulevard": " Blvd",
        " Highway": " Hwy",
        " Freeway": " Fwy",
        " Motorway": " Mwy",
        " Expressway": " Expy",
        " Way": " Way", 
        " Lane": " Ln",
        " Terrace": " Tce",
        " Place": " Pl",
        " Court": " Ct",
        " Crescent": " Cres",
        " Parade": " Pde",
        " Circuit": " Cct",
        " Close": " Cl",
        " Esplanade": " Esp",
        " Mount": " Mt",
        " Square": " Sq",
        " North": " N",
        " South": " S",
        " East": " E",
        " West": " W",
        " Service Rd": " Svc Rd"
    };

    // Case-insensitive replacement ensuring word boundaries
    Object.keys(abbreviations).forEach(key => {
        const regex = new RegExp(`${key}\\b`, 'gi');
        clean = clean.replace(regex, abbreviations[key]);
    });

    // 4. Cleanup Double Prepositions
    clean = clean.replace(" on on ", " on "); 

    // 5. Hard Truncation to 40 chars for HUD fit
    if (clean.length > 40) {
        // Try removing " on " to save space first
        if (clean.includes(" on ")) {
            const noOn = clean.replace(" on ", " ");
            if (noOn.length <= 40) return noOn;
            clean = noOn;
        }
        // If still too long, truncate with ellipsis
        clean = clean.substring(0, 39) + "…";
    }

    // Capitalize first letter
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    return clean;
};
