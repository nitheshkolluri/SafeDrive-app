import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import type { User, Circle } from '../types';

export const userRepository = {
    async syncUser(user: User): Promise<User> {
        if (!user.id) return user;
        
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const firestoreData = userSnap.data();
            return {
                ...user,
                ...firestoreData,
                id: user.id
            } as User;
        } else {
            const newUserProfile = {
                id: user.id,
                name: user.name,
                email: user.email,
                contact: user.contact || '',
                photoUrl: user.photoUrl || '',
                createdAt: serverTimestamp(),
                theme: user.theme || 'dark',
                isGuest: user.isGuest,
                isPremium: false,
                currentScore: 100,
                lastActive: serverTimestamp()
            };
            await setDoc(userRef, newUserProfile);
            // Return with local timestamps for immediate UI use
            return { ...newUserProfile, createdAt: Date.now(), lastActive: Date.now() } as unknown as User;
        }
    },

    async updateUser(uid: string, data: Partial<User>): Promise<void> {
        const userRef = doc(db, 'users', uid);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...updateData } = data; 
        await setDoc(userRef, { ...updateData, updatedAt: serverTimestamp() }, { merge: true });
    },

    async setPremiumStatus(uid: string, status: boolean): Promise<void> {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { isPremium: status, updatedAt: serverTimestamp() }, { merge: true });
    },

    async createCircle(uid: string, circleName: string): Promise<Circle> {
        try {
            if (!auth.currentUser || auth.currentUser.uid !== uid) {
                 throw new Error("Unauthorized");
            }

            // 1. Ensure User Profile Exists (Critical for "Insufficient Permissions" fix)
            // Rules often require the user doc to exist before allowing updates to it.
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await this.syncUser({
                    id: uid,
                    name: auth.currentUser.displayName || 'Driver',
                    email: auth.currentUser.email || undefined,
                    isGuest: false
                } as User);
            }

            // 2. Generate new Circle
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const newCircleRef = doc(collection(db, 'circles'));
            const circleId = newCircleRef.id;

            const newCircle = {
                id: circleId,
                ownerId: uid,
                name: circleName,
                inviteCode,
                memberIds: [uid],
                createdAt: serverTimestamp()
            };

            await setDoc(newCircleRef, newCircle);

            // 3. Link back to User
            // We include 'id' and 'updatedAt' to satisfy strict validation rules
            await setDoc(userRef, { 
                circleId: circleId,
                id: uid, // Re-assert ownership in payload
                updatedAt: serverTimestamp()
            }, { merge: true });

            return {
                id: circleId,
                ownerId: uid,
                name: circleName,
                inviteCode,
                memberIds: [uid],
                createdAt: Date.now()
            };
        } catch (error: any) {
            console.error("Repository: Create Circle Failed", error);
            throw new Error(`Failed to create circle: ${error.message}`);
        }
    },

    async joinCircleByCode(uid: string, code: string): Promise<Circle> {
        const q = query(collection(db, 'circles'), where('inviteCode', '==', code.toUpperCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error("Invalid invite code");
        }

        const circleDoc = snapshot.docs[0];
        const circleData = circleDoc.data();
        const circleId = circleDoc.id;

        // Ensure user doc exists before linking
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
             if (auth.currentUser) {
                 await this.syncUser({ id: uid, name: auth.currentUser.displayName || 'User', isGuest: false } as User);
             }
        }

        // Link User
        await setDoc(userRef, { 
            circleId: circleId,
            id: uid,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Add user to circle members array
        const circleRef = doc(db, 'circles', circleId);
        await updateDoc(circleRef, {
            memberIds: arrayUnion(uid)
        });

        // Handle legacy data that might have 'members' instead of 'memberIds'
        const currentMemberIds = circleData.memberIds || circleData.members || [];

        return { 
            id: circleId, 
            ...circleData, 
            memberIds: [...currentMemberIds, uid] 
        } as unknown as Circle;
    },

    async getCircleDetails(circleId: string): Promise<{ circle: Circle, members: User[] }> {
        const circleRef = doc(db, 'circles', circleId);
        const circleSnap = await getDoc(circleRef);
        if (!circleSnap.exists()) throw new Error("Circle not found");
        
        const data = circleSnap.data();
        // Map data to Circle type (handling legacy 'members' field)
        const circle = {
            ...data,
            memberIds: data.memberIds || data.members || []
        } as Circle;

        const memberPromises = circle.memberIds.map(uid => getDoc(doc(db, 'users', uid)));
        const memberSnaps = await Promise.all(memberPromises);
        
        const members = memberSnaps
            .filter(snap => snap.exists())
            .map(snap => ({ ...snap.data(), id: snap.id } as User));

        return { circle, members };
    },

    async deleteAccount(uid: string): Promise<void> {
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
        const user = auth.currentUser;
        if (user && user.uid === uid) {
            await deleteUser(user);
        }
    }
};