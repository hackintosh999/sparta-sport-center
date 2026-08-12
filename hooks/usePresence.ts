import { useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export const usePresence = () => {
    const { user } = useAuth();
    const lastStateRef = useRef<boolean | null>(null);

    const updatePresence = useCallback(async (isOnline: boolean) => {
        if (!user?.uid || !db) return;

        // Skip redundant updates if status hasn't changed within short period
        if (lastStateRef.current === isOnline && isOnline === false) {
            return;
        }

        try {
            lastStateRef.current = isOnline;
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                isOnline,
                lastSeen: serverTimestamp()
            });
        } catch (e) {
            // Silently handle offline/permission errors
            console.warn("Could not update presence:", e);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        // Set online on mount / login
        updatePresence(true);

        // Heartbeat every 2 minutes
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                updatePresence(true);
            }
        }, HEARTBEAT_INTERVAL_MS);

        // Visibility change listener
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                updatePresence(false);
            } else if (document.visibilityState === 'visible') {
                updatePresence(true);
            }
        };

        // Window unload listener
        const handleBeforeUnload = () => {
            updatePresence(false);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            updatePresence(false);
        };
    }, [user?.uid, updatePresence]);
};
