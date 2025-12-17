
# Circles V2 Migration Guide

## Overview
SafeDrive is moving from a simple `memberIds` array in `safetyCircles` documents to a robust `members` subcollection. This enables metadata per member (roles, join date, location sharing preferences) without hitting Firestore document size limits.

## Strategy: Double Write, Read V2 w/ Fallback
1.  **Writes:** All new joins/creates write to *both* the `memberIds` array (legacy) and the `members` subcollection (v2).
2.  **Reads:** V2 Clients prefer the `members` subcollection. If empty (unmigrated circle), they can fall back to fetching user profiles based on `memberIds`.

## Automated Migration Script
A Cloud Function (or client-side admin script) can perform the backfill:

```typescript
// Pseudocode for Migration Cloud Function
export const migrateCircleMembers = onCall(async (request) => {
    const circles = await db.collection('safetyCircles').where('v2_enabled', '!=', true).get();
    
    for (const circle of circles.docs) {
        const data = circle.data();
        const memberIds = data.memberIds || [];
        const ownerId = data.ownerId;

        const batch = db.batch();
        
        memberIds.forEach(uid => {
            const ref = circle.ref.collection('members').doc(uid);
            batch.set(ref, {
                uid,
                role: uid === ownerId ? 'OWNER' : 'MEMBER',
                joinedAt: data.createdAt || Date.now(),
                shareLocation: false,
                lastActiveAt: Date.now()
            }, { merge: true });
        });

        batch.update(circle.ref, { v2_enabled: true });
        await batch.commit();
    }
});
```

## Privacy Note
By default, the migration script sets `shareLocation: false` for all existing members. This ensures we do not expose location data without explicit V2 opt-in.
