import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    writeBatch,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface IncomingRequestNotification {
    requestId: string;
    fromId: string;
    toId: string;
    status: string;
    createdAt?: any;
    senderName: string;
    senderAvatar?: string;
    senderRole?: string;
}

interface NotificationContextType {
    incomingRequests: IncomingRequestNotification[];
    activeToasts: IncomingRequestNotification[];
    acceptRequest: (request: IncomingRequestNotification) => Promise<void>;
    declineRequest: (requestId: string) => Promise<void>;
    dismissToast: (requestId: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
    incomingRequests: [],
    activeToasts: [],
    acceptRequest: async () => {},
    declineRequest: async () => {},
    dismissToast: () => {}
});

export const useNotificationContext = () => useContext(NotificationContext);

// Web Audio API synth sound effect for incoming notification
const playNotificationSound = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // Soft dual sine tone chime (E5 -> A5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now); // E5
        gain1.gain.setValueAtTime(0.08, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.1); // A5
        gain2.gain.setValueAtTime(0.1, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.45);
    } catch (e) {
        console.warn("Could not play notification sound:", e);
    }
};

// Vibration trigger for mobile devices
const triggerVibration = () => {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate([80, 50, 80]);
        } catch (e) {
            // Ignored if device/browser doesn't permit
        }
    }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [incomingRequests, setIncomingRequests] = useState<IncomingRequestNotification[]>([]);
    const [activeToasts, setActiveToasts] = useState<IncomingRequestNotification[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setIncomingRequests([]);
            setActiveToasts([]);
            setIsInitialLoad(true);
            return;
        }

        setIsInitialLoad(true);

        const inQuery = query(
            collection(db, 'friend_requests'),
            where('toId', '==', user.uid),
            where('status', '==', 'pending')
        );

        let initialSnapshotHandled = false;

        const unsub = onSnapshot(inQuery, async (snapshot) => {
            const reqPromises = snapshot.docs.map(async (d) => {
                const data = d.data();
                let senderName = 'Атлет Спарта';
                let senderAvatar = undefined;
                let senderRole = undefined;

                try {
                    const userSnap = await getDoc(doc(db, 'users', data.fromId));
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        senderName = `${uData.childFirstName || uData.firstName || ''} ${uData.childLastName || uData.lastName || ''}`.trim() || uData.displayName || uData.full_name || 'Атлет Спарта';
                        senderAvatar = uData.photoURL || uData.avatarUrl;
                        senderRole = uData.role;
                    }
                } catch (e) {
                    console.error("Error fetching request sender profile:", e);
                }

                return {
                    requestId: d.id,
                    fromId: data.fromId,
                    toId: data.toId,
                    status: data.status,
                    createdAt: data.createdAt,
                    senderName,
                    senderAvatar,
                    senderRole
                } as IncomingRequestNotification;
            });

            const loadedRequests = await Promise.all(reqPromises);
            setIncomingRequests(loadedRequests);

            if (!initialSnapshotHandled) {
                initialSnapshotHandled = false;
                // Detect newly added requests after initial load
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' && !isInitialLoad) {
                        const newReq = loadedRequests.find(r => r.requestId === change.doc.id);
                        if (newReq) {
                            triggerNotificationEvent(newReq);
                        }
                    }
                });
            }

            // On initial subscription run
            if (isInitialLoad) {
                setIsInitialLoad(false);
                initialSnapshotHandled = true;
            } else {
                // Subsequent real-time updates
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const newReq = loadedRequests.find(r => r.requestId === change.doc.id);
                        if (newReq) {
                            triggerNotificationEvent(newReq);
                        }
                    }
                });
            }
        });

        return () => unsub();
    }, [user?.uid]);

    const triggerNotificationEvent = useCallback((req: IncomingRequestNotification) => {
        playNotificationSound();
        triggerVibration();
        setActiveToasts(prev => {
            if (prev.some(t => t.requestId === req.requestId)) return prev;
            return [...prev, req];
        });
    }, []);

    const dismissToast = useCallback((requestId: string) => {
        setActiveToasts(prev => prev.filter(t => t.requestId !== requestId));
    }, []);

    const acceptRequest = useCallback(async (request: IncomingRequestNotification) => {
        if (!user?.uid) return;
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'friend_requests', request.requestId), { status: 'accepted' });
            batch.set(doc(collection(db, 'friendships')), {
                users: [user.uid, request.fromId],
                createdAt: serverTimestamp()
            });
            await batch.commit();

            dismissToast(request.requestId);
            setIncomingRequests(prev => prev.filter(r => r.requestId !== request.requestId));
        } catch (e) {
            console.error("Error accepting request in NotificationContext:", e);
        }
    }, [user?.uid, dismissToast]);

    const declineRequest = useCallback(async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'friend_requests', requestId));
            dismissToast(requestId);
            setIncomingRequests(prev => prev.filter(r => r.requestId !== requestId));
        } catch (e) {
            console.error("Error declining request in NotificationContext:", e);
        }
    }, [dismissToast]);

    const contextValue = React.useMemo(() => ({
        incomingRequests,
        activeToasts,
        acceptRequest,
        declineRequest,
        dismissToast
    }), [
        incomingRequests,
        activeToasts,
        acceptRequest,
        declineRequest,
        dismissToast
    ]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
};
