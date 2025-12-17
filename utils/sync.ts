
import { auth, db, storage } from './firebase';
import { collection, doc, addDoc, setDoc, onSnapshot, query, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect, useRef } from 'react';
import type { FileMetadata } from '../types';

// Recursive Helper to remove undefined fields and circular references
const sanitizeData = (data: any, depth = 0, seen = new WeakSet()): any => {
    // 1. Depth Limit to prevent stack overflow on deep trees
    if (depth > 20) return undefined;

    // 2. Primitives and Null checks
    if (data === undefined) return undefined;
    if (data === null) return null;
    
    // 3. Pass through Date objects (Firestore supports them)
    if (data instanceof Date) return data;
    
    // 4. Handle Circular References
    if (typeof data === 'object') {
        if (seen.has(data)) return undefined; // Circular ref found
        seen.add(data);
    } else {
        return data; // Primitive value
    }
    
    // 5. Arrays
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item, depth + 1, seen)).filter(item => item !== undefined);
    }
    
    // 6. Objects
    // Check for specific Firestore types or non-plain objects to preserve
    // If it's a DOM node or complex external instance (like Google Maps object), ignore it or strip it down.
    if (data.nodeType || (data.constructor && data.constructor.name !== 'Object' && data.constructor.name !== 'Date')) {
        // Attempt to extract own properties if it's not a plain object, 
        // effectively converting class instances to plain objects for storage.
        // If it fails (e.g. strict mode proxy), we catch below.
    }

    const clean: any = {};
    try {
        Object.keys(data).forEach(key => {
            // Skip functions
            if (typeof data[key] === 'function') return;

            const val = sanitizeData(data[key], depth + 1, seen);
            if (val !== undefined) {
                clean[key] = val;
            }
        });
    } catch (e) {
        console.warn("Sanitization skipped for property", e);
    }
    return clean;
};

export const syncService = {
    // --- GENERIC FIRESTORE CRUD ---
    
    async add<T>(collectionName: string, data: T, customId?: string): Promise<string> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        // Try to ensure parent exists, but don't fail the operation if this specific write is denied
        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });
        } catch (e) {
            console.warn("Could not update parent user doc, proceeding with child write.");
        }

        // Determine Path: Root vs Nested
        const ROOT_COLLECTIONS = ['feedback', 'safetyCircles', 'publicInvites', 'circles'];
        const isRoot = ROOT_COLLECTIONS.includes(collectionName);

        const path = isRoot ? collectionName : `users/${user.uid}/${collectionName}`;
        
        // Remove 'id' from data to avoid duplicating it in the field
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = data as any;

        // Prepare payload with strict security fields
        const payload = sanitizeData({
            ...rest,
            userId: user.uid, // CRITICAL: Must match request.auth.uid for rules
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        if (customId) {
            const docRef = doc(db, path, customId);
            await setDoc(docRef, payload);
            return customId;
        } else {
            const colRef = collection(db, path);
            const docRef = await addDoc(colRef, payload);
            return docRef.id;
        }
    },

    // SOFT DELETE
    async delete(collectionName: string, docId: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        if (!docId) throw new Error("Invalid ID for delete");
        
        // Determine Path
        const ROOT_COLLECTIONS = ['feedback', 'safetyCircles', 'publicInvites', 'circles'];
        const isRoot = ROOT_COLLECTIONS.includes(collectionName);
        const path = isRoot ? collectionName : `users/${user.uid}/${collectionName}`;
        
        const docRef = doc(db, path, docId);
        
        await updateDoc(docRef, { 
            deletedAt: Date.now(),
            updatedAt: serverTimestamp(),
            userId: user.uid 
        });
    },

    async update<T>(collectionName: string, docId: string, data: Partial<T>): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        if (!docId) throw new Error("Invalid ID for update");
        
        // Determine Path
        const ROOT_COLLECTIONS = ['feedback', 'safetyCircles', 'publicInvites', 'circles'];
        const isRoot = ROOT_COLLECTIONS.includes(collectionName);
        const path = isRoot ? collectionName : `users/${user.uid}/${collectionName}`;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = data as any;

        const payload = sanitizeData({
            ...rest,
            userId: user.uid,
            updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, path, docId), payload, { merge: true });
    },

    // --- FILE UPLOAD & SYNC ---

    async uploadFile(file: File, folder: string, metadata?: Partial<FileMetadata>): Promise<FileMetadata> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const storagePath = `user_uploads/${user.uid}/${folder}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        const fileData = sanitizeData({
            name: file.name,
            downloadUrl,
            path: storagePath,
            type: file.type,
            size: file.size,
            uploadedAt: Date.now(),
            notes: metadata?.notes,
            aiSummary: metadata?.aiSummary,
            relatedTripId: metadata?.relatedTripId,
            userId: user.uid,
            createdAt: serverTimestamp()
        });

        const docRef = await addDoc(collection(db, `users/${user.uid}/files`), fileData);
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        
        return { ...fileData, id: docRef.id, uploadedAt: Date.now() } as unknown as FileMetadata;
    }
};

// --- CUSTOM HOOK FOR REAL-TIME SYNC ---

export function useFirestoreCollection<T>(collectionName: string, queryConstraints: any[] = [], localCacheKey?: string) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    const unsubscribeSnapshotRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        let isMounted = true;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!isMounted) return;

            if (unsubscribeSnapshotRef.current) {
                unsubscribeSnapshotRef.current();
                unsubscribeSnapshotRef.current = null;
            }

            if (user) {
                setLoading(true);
                try {
                    // Determine Path
                    const ROOT_COLLECTIONS = ['feedback', 'safetyCircles', 'publicInvites', 'circles'];
                    const isRoot = ROOT_COLLECTIONS.includes(collectionName);
                    const path = isRoot ? collectionName : `users/${user.uid}/${collectionName}`;

                    const q = query(
                        collection(db, path), 
                        where('userId', '==', user.uid), 
                        ...queryConstraints
                    );

                    unsubscribeSnapshotRef.current = onSnapshot(q, (snapshot) => {
                        if (!isMounted) return;
                        const items = snapshot.docs
                            .map(doc => ({ ...doc.data(), id: doc.id }))
                            .filter((item: any) => !item.deletedAt) as unknown as T[];
                        
                        setData(items);
                        setLoading(false);
                        setError(null);
                    }, (err) => {
                        if (!isMounted) return;
                        console.error(`Firestore Error (${collectionName}):`, err);
                        
                        // Fallback to local storage if permissions fail
                        if (localCacheKey || localStorage.getItem(collectionName)) {
                            try {
                                const key = localCacheKey || collectionName;
                                const localData = localStorage.getItem(key);
                                if (localData) {
                                    setData(JSON.parse(localData));
                                }
                            } catch (e) { /* ignore */ }
                        }

                        setError(err);
                        setLoading(false);
                    });
                } catch (err: any) {
                    console.error("Query creation error", err);
                    setError(err);
                    setLoading(false);
                }
            } else {
                // Fallback for Guest Mode
                try {
                    const key = localCacheKey || collectionName;
                    const localData = localStorage.getItem(key);
                    if (localData) {
                        setData(JSON.parse(localData));
                    } else {
                        setData([]);
                    }
                } catch (e) {
                    console.error("Local storage read error", e);
                }
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribeAuth();
            if (unsubscribeSnapshotRef.current) {
                unsubscribeSnapshotRef.current();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectionName]); 

    return { data, loading, error };
}
