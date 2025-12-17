
import { calculateDistance } from './helpers';

// Helper: Linear Interpolation
export const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

// Helper: Shortest path angle interpolation (0-360)
// Critical for map rotation to avoid spinning 360 degrees when going 359 -> 1
export const lerpAngle = (start: number, end: number, t: number) => {
    const d = end - start;
    const delta = (d + 540) % 360 - 180;
    return (start + delta * t + 360) % 360;
};

// --- DSA: Ring Buffer (Circular Buffer) ---
// Complexity: O(1) insertion, O(1) average calculation
// Replaces standard Array shift/push (O(n)) to reduce GC stutters
export class MovingAverage {
  private buffer: Float64Array; // Typed array for performance
  private size: number;
  private pointer: number = 0;
  private count: number = 0;
  private sum: number = 0;

  constructor(size: number = 5) {
    this.size = Math.max(1, size);
    this.buffer = new Float64Array(this.size);
  }

  public add(value: number): number {
    // If buffer is full, subtract the value we are about to overwrite from sum
    if (this.count === this.size) {
      this.sum -= this.buffer[this.pointer];
    } else {
      this.count++;
    }

    // Overwrite old value
    this.buffer[this.pointer] = value;
    this.sum += value;

    // Move pointer circularly
    this.pointer = (this.pointer + 1) % this.size;

    return this.getAverage();
  }

  public getAverage(): number {
    if (this.count === 0) return 0;
    return this.sum / this.count;
  }
  
  public reset() {
      this.count = 0;
      this.sum = 0;
      this.pointer = 0;
      this.buffer.fill(0);
  }
}

export class SpeedEstimator {
    private smoothedSpeed: number = 0;
    private lastPos: { lat: number; lng: number; time: number } | null = null;
    private alpha: number;

    constructor(smoothingFactor: number = 0.3) {
        this.alpha = smoothingFactor;
    }

    public update(lat: number, lng: number, rawSpeedMps: number | null, accuracy: number): number {
        const now = Date.now();
        let computedSpeedKmh = 0;
        let gpsSpeedKmh = (rawSpeedMps || 0) * 3.6;

        // 1. Calculate Computed Speed (Distance / Time)
        if (this.lastPos) {
            const dt = (now - this.lastPos.time) / 1000; // seconds
            if (dt > 0.5) { 
                const distMeters = calculateDistance(
                    { latitude: this.lastPos.lat, longitude: this.lastPos.lng },
                    { latitude: lat, longitude: lng }
                );
                computedSpeedKmh = (distMeters / dt) * 3.6;
            }
        }

        // 2. Sensor Fusion logic
        let targetSpeed = 0;

        // If GPS reports speed and is accurate, trust it heavily
        if (rawSpeedMps !== null && accuracy < 20) {
            targetSpeed = gpsSpeedKmh;
        } 
        // Fallback: If GPS speed is 0 but we moved > 10m, it's likely drift or sudden start
        else if (gpsSpeedKmh < 3 && computedSpeedKmh > 15) {
            targetSpeed = 0; // Filter jumps
        }
        else {
            // Blend based on reliability
            const weight = accuracy < 50 ? 0.7 : 0.3;
            targetSpeed = (gpsSpeedKmh * weight) + (computedSpeedKmh * (1 - weight));
        }

        this.lastPos = { lat, lng, time: now };

        // 3. Low Pass Filter (EMA)
        if (Math.abs(targetSpeed - this.smoothedSpeed) > 30) {
            this.smoothedSpeed = targetSpeed; // Snap on huge delta
        } else {
            this.smoothedSpeed = this.smoothedSpeed + this.alpha * (targetSpeed - this.smoothedSpeed);
        }

        // Hard clamp low speeds to 0 to prevent UI creep
        return this.smoothedSpeed < 2.0 ? 0 : this.smoothedSpeed;
    }
    
    public reset() {
        this.smoothedSpeed = 0;
        this.lastPos = null;
    }
}

export class HeadingEstimator {
    private smoothedHeading: number = 0;
    private alpha: number;

    constructor(smoothingFactor: number = 0.12) {
        this.alpha = smoothingFactor;
    }

    public update(gpsHeading: number | null, compassHeading: number | null, speedKmh: number): number {
        let targetHeading = this.smoothedHeading;

        // Validations
        const hasGpsHeading = gpsHeading !== null && !isNaN(gpsHeading) && gpsHeading !== 0; 
        const hasCompass = compassHeading !== null && !isNaN(compassHeading);

        // STRATEGY:
        // Speed >= 5 km/h: Trust GPS Course (Vehicle Vector) absolutely.
        // Speed < 5 km/h: Trust Compass (Device Orientation) absolutely.
        
        if (speedKmh >= 5 && hasGpsHeading) {
            targetHeading = gpsHeading!;
        } else if (hasCompass) {
            targetHeading = compassHeading!;
        } else if (hasGpsHeading) {
            // Fallback if no compass but we have GPS heading (rare case of slow movement with good GPS)
            targetHeading = gpsHeading!;
        }

        // Apply Circular Smoothing
        this.smoothedHeading = lerpAngle(this.smoothedHeading, targetHeading, this.alpha);
        return this.smoothedHeading;
    }
    
    public reset() {
        this.smoothedHeading = 0;
    }
}