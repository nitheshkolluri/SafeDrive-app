
import { User } from '../types';

const USERS_DB_KEY = 'safe_drive_users_db';

interface StoredUser extends User {
    passwordHash: string; 
    id: string;
    phone?: string;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// OTP Storage (In-memory for session)
const otpStorage: Map<string, { code: string, expires: number }> = new Map();

// Helper to get DB safely
const getDb = (): StoredUser[] => {
    try {
        const dbStr = localStorage.getItem(USERS_DB_KEY);
        return dbStr ? JSON.parse(dbStr) : [];
    } catch (e) {
        return [];
    }
};

// Helper to save DB safely
const saveDb = (db: StoredUser[]) => {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
};

export const mockAuth = {
    async checkUsernameAvailability(username: string): Promise<boolean> {
        await delay(300);
        const db = getDb();
        return !db.some(u => u.name.toLowerCase() === username.trim().toLowerCase());
    },

    async generateOtp(contact: string): Promise<string> {
        await delay(1000);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // Store OTP with 5 minute expiration
        otpStorage.set(contact, { code, expires: Date.now() + 5 * 60 * 1000 });
        console.log(`[MockAuth] Generated OTP for ${contact}: ${code}`);
        return code;
    },

    async verifyOtp(contact: string, code: string): Promise<boolean> {
        await delay(800);
        const record = otpStorage.get(contact);
        
        if (!record) {
            throw new Error("OTP expired or not requested.");
        }
        
        if (Date.now() > record.expires) {
            otpStorage.delete(contact);
            throw new Error("OTP has expired.");
        }

        if (record.code !== code) {
            throw new Error("Invalid verification code.");
        }

        // Consume OTP
        otpStorage.delete(contact);
        return true;
    },

    async login(email: string, password: string): Promise<User> {
        await delay(800); 
        const db = getDb();
        
        const user = db.find(u => (u.email?.toLowerCase() === email.toLowerCase() || u.name.toLowerCase() === email.toLowerCase()) && u.passwordHash === btoa(password)); 
        
        if (!user) throw new Error("Invalid credentials.");
        
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    },

    async register(email: string, password: string, name: string, phone: string): Promise<User> {
        await delay(1000);
        const db = getDb();
        
        if (db.find(u => u.email?.toLowerCase() === email.toLowerCase())) {
            throw new Error("User already exists with this email.");
        }
        
        if (db.find(u => u.name.toLowerCase() === name.toLowerCase())) {
             throw new Error("Username is already taken.");
        }
        
        const newUser: StoredUser = {
            id: Date.now().toString(),
            name,
            email,
            phone,
            isGuest: false,
            passwordHash: btoa(password), 
            theme: 'dark'
        };
        
        db.push(newUser);
        saveDb(db);
        
        const { passwordHash, ...safeUser } = newUser;
        return safeUser;
    },

    async upgradeGuest(guestId: string, email: string, password: string, name: string, phone: string): Promise<User> {
        await delay(1000);
        const db = getDb();

        if (db.find(u => u.email?.toLowerCase() === email.toLowerCase())) {
            throw new Error("Email already associated with another account.");
        }
        
        // Check if username is taken by SOMEONE ELSE
        if (db.find(u => u.name.toLowerCase() === name.toLowerCase() && u.id !== guestId)) {
             throw new Error("Username is already taken.");
        }

        const newUser: StoredUser = {
            id: guestId, // Keep the ID to link data if we were using a real backend, but here we rely on local storage keys being consistent
            name,
            email,
            phone,
            isGuest: false,
            passwordHash: btoa(password),
            theme: 'dark'
        };

        // For this mock, we just add them to the DB as a new entry or merge if logic existed.
        // In a real app, we'd patch the existing record. Here we append.
        db.push(newUser);
        saveDb(db);

        const { passwordHash, ...safeUser } = newUser;
        return safeUser;
    },
    
    async guest(name: string): Promise<User> {
        await delay(500);
        const db = getDb();
        if (db.find(u => u.name.toLowerCase() === name.toLowerCase())) {
            throw new Error("Username taken. Please choose another.");
        }

        return {
            id: `guest_${Date.now()}`,
            name,
            isGuest: true,
            theme: 'dark'
        };
    },

    // New method to reserve a username without creating a full mock user (for Firebase Integration)
    async reserveUsername(name: string): Promise<void> {
        const db = getDb();
        const normalized = name.trim().toLowerCase();
        
        if (!db.some(u => u.name.toLowerCase() === normalized)) {
            db.push({
                id: `firebase_reserved_${Date.now()}`,
                name: name.trim(),
                isGuest: false,
                passwordHash: 'reserved_firebase',
                theme: 'dark'
            } as StoredUser);
            saveDb(db);
        }
    }
};
