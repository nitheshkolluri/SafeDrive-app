
import { db, auth } from './firebase';
import { 
    doc, getDoc, setDoc, updateDoc, collection, 
    query, where, getDocs, serverTimestamp, 
    arrayUnion, arrayRemove, runTransaction, deleteDoc
} from 'firebase/firestore';
import type { Circle, CircleMember, CircleRole, CircleInvite, CircleSettings } from '../types';

export const circleRepository = {
    
    /**
     * Create a new V2 Circle
     */
    async createCircle(name: string, description?: string): Promise<string> {
        if (!auth.currentUser) throw new Error("Must be logged in");
        
        const uid = auth.currentUser.uid;
        const circleRef = doc(collection(db, 'safetyCircles'));
        
        // Firestore rejects 'undefined' fields. 
        // We construct the object and conditionally add optional fields or ensure they are null.
        const newCircle: any = {
            id: circleRef.id,
            ownerId: uid,
            name,
            inviteCode: 'N/A', // Legacy placeholder
            memberIds: [uid],
            createdAt: Date.now(),
            v2_enabled: true,
            settings: {
                autoJoin: false,
                requireApproval: true,
                shareLocationDefault: 'opt-out',
                poolingEnabled: true,
                challengesEnabled: true
            },
            analyticsSummary: {
                avgSafetyScore: 100,
                totalPoints: 0,
                overspeedCount: 0,
                lastUpdated: Date.now()
            }
        };

        if (description) {
            newCircle.description = description;
        }

        // Batch write: Circle Doc + Member Doc + User Profile Update
        await runTransaction(db, async (transaction) => {
            // 1. Create Circle
            transaction.set(circleRef, newCircle);

            // 2. Create Owner Member Record
            const memberRef = doc(db, `safetyCircles/${circleRef.id}/members/${uid}`);
            
            const userProfile = {
                name: auth.currentUser?.displayName || 'Owner',
                photoUrl: auth.currentUser?.photoURL || null // Firestore needs null, not undefined
            };

            const memberData: CircleMember = {
                uid,
                role: 'OWNER',
                joinedAt: Date.now(),
                shareLocation: false,
                lastActiveAt: Date.now(),
                userProfile
            };
            transaction.set(memberRef, memberData);

            // 3. Update User's Circle List
            const userRef = doc(db, 'users', uid);
            // Use set with merge: true instead of update. 
            // Update fails if the user document doesn't exist yet (possible race condition on signup).
            transaction.set(userRef, {
                circleIds: arrayUnion(circleRef.id),
                circleId: circleRef.id // Set as primary for legacy compat
            }, { merge: true });
        });

        return circleRef.id;
    },

    /**
     * Generate a Shareable Invite
     */
    async createInvite(circleId: string, maxUses: number = 10, daysValid: number = 7): Promise<string> {
        if (!auth.currentUser) throw new Error("Auth required");

        // Simple token generation (In prod, use Cloud Function for crypto security)
        const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        
        const inviteRef = doc(collection(db, `safetyCircles/${circleId}/invites`));
        const publicLookupRef = doc(db, `publicInvites/${token}`);

        const inviteData: CircleInvite = {
            id: inviteRef.id,
            circleId,
            token,
            createdBy: auth.currentUser.uid,
            expiresAt: Date.now() + (daysValid * 86400000),
            maxUses,
            uses: 0,
            requireApproval: false // Configurable in UI later
        };

        await runTransaction(db, async (transaction) => {
            transaction.set(inviteRef, inviteData);
            // Index for lookup by token
            transaction.set(publicLookupRef, { circleId, expiresAt: inviteData.expiresAt });
        });

        return `https://safedrive.app/join/${token}`;
    },

    /**
     * Join via Token
     */
    async joinCircleByToken(token: string): Promise<{ success: boolean, circleId?: string, message: string }> {
        if (!auth.currentUser) throw new Error("Must login to join");
        const uid = auth.currentUser.uid;

        // 1. Resolve Token
        const publicRef = doc(db, 'publicInvites', token);
        const publicSnap = await getDoc(publicRef);
        
        if (!publicSnap.exists()) return { success: false, message: "Invalid invite link." };
        
        const { circleId, expiresAt } = publicSnap.data();
        if (Date.now() > expiresAt) return { success: false, message: "Invite link expired." };

        // 2. Perform Join
        try {
            await runTransaction(db, async (transaction) => {
                const circleRef = doc(db, 'safetyCircles', circleId);
                const circleSnap = await transaction.get(circleRef);
                if (!circleSnap.exists()) throw new Error("Circle not found");

                const currentMembers = circleSnap.data().memberIds || [];
                if (currentMembers.includes(uid)) throw new Error("Already a member");

                // Add Member Doc
                const memberRef = doc(db, `safetyCircles/${circleId}/members/${uid}`);
                
                const userProfile = {
                    name: auth.currentUser?.displayName || 'Member',
                    photoUrl: auth.currentUser?.photoURL || null
                };

                transaction.set(memberRef, {
                    uid,
                    role: 'MEMBER',
                    joinedAt: Date.now(),
                    shareLocation: false, // Default privacy
                    lastActiveAt: Date.now(),
                    userProfile
                });

                // Update Circle Arrays
                transaction.update(circleRef, {
                    memberIds: arrayUnion(uid)
                });

                // Update User
                const userRef = doc(db, 'users', uid);
                // Use set merge to be safe
                transaction.set(userRef, {
                    circleIds: arrayUnion(circleId),
                    circleId: circleId // Set as primary if none
                }, { merge: true });
            });
            return { success: true, circleId, message: "Joined successfully!" };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    /**
     * Fetch User's Circles
     */
    async getMyCircles(uid: string): Promise<Circle[]> {
        // Query circles where memberIds contains uid
        const q = query(collection(db, 'safetyCircles'), where('memberIds', 'array-contains', uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Circle));
    },

    /**
     * Toggle Location Sharing
     */
    async toggleLocationSharing(circleId: string, enabled: boolean): Promise<void> {
        if (!auth.currentUser) return;
        const ref = doc(db, `safetyCircles/${circleId}/members/${auth.currentUser.uid}`);
        await updateDoc(ref, { shareLocation: enabled });
    },

    // --- Admin Functions ---

    async removeMember(circleId: string, memberUid: string): Promise<void> {
        if (!auth.currentUser) return;
        
        // 1. Remove from Members subcollection
        await deleteDoc(doc(db, `safetyCircles/${circleId}/members/${memberUid}`));

        // 2. Remove from Circle Array
        await updateDoc(doc(db, 'safetyCircles', circleId), {
            memberIds: arrayRemove(memberUid)
        });

        // 3. Update User Doc (ONLY if removing self)
        // If an Admin is kicking someone else, we CANNOT update the victim's private profile 
        // due to security rules. The victim will just lose access via the circle check.
        if (memberUid === auth.currentUser.uid) {
            try {
                await updateDoc(doc(db, 'users', memberUid), {
                    circleIds: arrayRemove(circleId)
                });
            } catch (e) {
                console.warn("Could not update user profile on remove (non-critical)", e);
            }
        }
    },

    async updateMemberRole(circleId: string, memberUid: string, role: CircleRole): Promise<void> {
        const ref = doc(db, `safetyCircles/${circleId}/members/${memberUid}`);
        await updateDoc(ref, { role });
    },

    async updateCircleSettings(circleId: string, settings: Partial<CircleSettings>): Promise<void> {
        if (!auth.currentUser) return;
        const circleRef = doc(db, 'safetyCircles', circleId);
        
        // Map settings to dot notation for update
        const updateData: any = {};
        if (settings.requireApproval !== undefined) updateData['settings.requireApproval'] = settings.requireApproval;
        if (settings.poolingEnabled !== undefined) updateData['settings.poolingEnabled'] = settings.poolingEnabled;
        if (settings.autoJoin !== undefined) updateData['settings.autoJoin'] = settings.autoJoin;
        if (settings.challengesEnabled !== undefined) updateData['settings.challengesEnabled'] = settings.challengesEnabled;
        if (settings.shareLocationDefault !== undefined) updateData['settings.shareLocationDefault'] = settings.shareLocationDefault;

        await updateDoc(circleRef, updateData);
    },

    async deleteCircle(circleId: string): Promise<void> {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        
        const circleRef = doc(db, 'safetyCircles', circleId);
        const snap = await getDoc(circleRef);
        if (!snap.exists()) throw new Error("Circle not found");
        
        const data = snap.data();
        
        // 1. Check Permissions
        if (data.ownerId !== uid) {
            // Check if user is an ADMIN in members subcollection
            const memberRef = doc(db, `safetyCircles/${circleId}/members/${uid}`);
            const memberSnap = await getDoc(memberRef);
            
            if (!memberSnap.exists() || memberSnap.data().role !== 'ADMIN') {
                throw new Error("Insufficient permissions: Only Owner or Admin can delete");
            }
        }

        // 2. Try to update the user profile to remove the ID (for self only)
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                circleIds: arrayRemove(circleId)
            });
        } catch (e) {
            console.warn("User profile update failed during circle delete (non-fatal)", e);
        }

        // 3. Delete the Circle Document
        await deleteDoc(circleRef);
    }
};
