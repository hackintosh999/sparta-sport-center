import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, getRedirectResult, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth, googleProvider, db, messaging } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp, increment, query, collection, where, getDocs, deleteDoc, arrayUnion } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';

import { safeLocalStorage, performEmergencyCleanup } from '../utils/storage';

export const SUPER_DEVELOPER_EMAILS = [
    'nfisah7139@gmail.com',
    'psiphonvpn37@gmail.com',
    'bugrova.k@bk.ru',
    'nfisah159@gmail.com',
    'nfisah/159@gmail.com'
];

export const isSuperDeveloper = (email?: string | null): boolean => {
    if (!email) return false;
    const lower = email.toLowerCase().trim();
    return SUPER_DEVELOPER_EMAILS.some(e => e.toLowerCase() === lower) || lower.includes('nfisah');
};

interface AuthContextType {
    user: User | null;
    userProfile: any | null;
    banDetails: any | null;
    loading: boolean;
    logout: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    confirmReset: (code: string, newPassword: string) => Promise<void>;
    verifyCode: (code: string) => Promise<string>;
    requestedGroupIds: string[];
    setRequestedGroupIds: (ids: string[]) => void;
    refreshTrialStatus: () => Promise<void>;
    deviceId: string | null;
    requestPushPermission: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    banDetails: null,
    loading: true,
    logout: async () => { },
    signInWithGoogle: async () => { },
    resetPassword: async () => { },
    confirmReset: async () => { },
    verifyCode: async () => "",
    requestedGroupIds: [],
    setRequestedGroupIds: () => { },
    refreshTrialStatus: async () => { },
    deviceId: null,
    requestPushPermission: async () => null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [banDetails, setBanDetails] = useState<any | null>(null);
    const [requestedGroupIds, setRequestedGroupIds] = useState<string[]>([]);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const initialIpRef = React.useRef<string | null>(null);

    // Deterministic Browser Fingerprinting
    const getBrowserFingerprint = () => {
        try {
            const components = [
                navigator.userAgent, // Browser & OS
                navigator.language, // Language
                window.screen.colorDepth,
                window.screen.width + 'x' + window.screen.height, // Resolution
                new Date().getTimezoneOffset(), // Timezone
                (navigator as any).hardwareConcurrency || 'unknown', // CPU Cores
                (navigator as any).deviceMemory || 'unknown', // RAM (approx)
            ];

            const str = components.join('###');

            // Simple Hash Function (DJB2 variant)
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }

            return 'fp_' + Math.abs(hash).toString(36);
        } catch (e) {
            // Fallback for very old browsers or errors
            console.error("Fingerprint error", e);
            let fallback = safeLocalStorage.getItem('sparta_device_id');
            if (!fallback) {
                fallback = 'dev_' + Math.random().toString(36).substr(2, 9);
                safeLocalStorage.setItem('sparta_device_id', fallback);
            }
            return fallback;
        }
    };


    useEffect(() => {
        let isMounted = true;
        let unsubscribeProfile: () => void;
        let unsubscribeSession: () => void;
        let unsubscribeAllSessions: () => void;
        let unsubscribeDeviceBan: () => void;
        let unsubscribeIpBan: () => void;

        // 1. Global Ban Check (IP & Device) - Runs for EVERYONE (Auth or Guest)
        const setupGlobalBans = async () => {
            try {
                const deviceId = getBrowserFingerprint();
                let ip = 'unknown';
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    const ipRes = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (ipRes.ok) {
                        const data = await ipRes.json();
                        ip = data.ip || 'unknown';
                    }
                } catch (e) {
                    console.log("Could not fetch IP, using fallback", e);
                }

                if (!isMounted) return; // Stop if unmounted during await

                // Set for polling reference
                initialIpRef.current = ip;
                setDeviceId(deviceId);

                // EMERGENCY WHITELIST
                const isImmune = (ip === '176.226.225.210');

                if (isImmune) {
                    console.log("🛡️ Admin Immunity Active: Whitelisted IP detected. Skipping ban checks.");
                    if (isMounted) setBanDetails(null);
                } else {
                    // Listen for Device Ban
                    unsubscribeDeviceBan = onSnapshot(doc(db, "banned_devices", deviceId), (docSnap) => {
                        if (!isMounted) return;
                        if (docSnap.exists()) {
                            const ban = docSnap.data();
                            if (!ban.expiresAt || ban.expiresAt > Date.now()) {
                                setBanDetails({ ...ban, type: 'device', isBanned: true });
                            }
                        }
                    });

                    // Listen for IP Ban
                    if (ip !== 'unknown') {
                        unsubscribeIpBan = onSnapshot(doc(db, "banned_ips", ip.replace(/\./g, '_')), (docSnap) => {
                            if (!isMounted) return;
                            if (docSnap.exists()) {
                                const ban = docSnap.data();
                                if (!ban.expiresAt || ban.expiresAt > Date.now()) {
                                    setBanDetails({ ...ban, type: 'ip', isBanned: true });
                                }
                            }
                        });
                    }
                }

                // 2. Auth Logic
                const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
                    if (!isMounted) return;

                    // Ensure we clean up previous listeners if auth state changes
                    if (unsubscribeProfile) unsubscribeProfile();
                    if (unsubscribeSession) unsubscribeSession();
                    if (unsubscribeAllSessions) unsubscribeAllSessions();

                    setUser(authUser);

                    if (authUser) {
                        // Purge cached session if it belonged to a different account
                        const savedStaffSession = safeLocalStorage.getItem('sparta_auth_user');
                        if (savedStaffSession) {
                            try {
                                const parsed = JSON.parse(savedStaffSession);
                                if (parsed && parsed.uid && parsed.uid !== authUser.uid) {
                                    safeLocalStorage.removeItem('sparta_auth_user');
                                }
                            } catch {
                                safeLocalStorage.removeItem('sparta_auth_user');
                            }
                        }

                        // Update user info (Fire & Forget)
                        updateDoc(doc(db, "users", authUser.uid), {
                            lastDeviceId: deviceId,
                            lastIp: ip,
                            lastLogin: serverTimestamp(),
                            lastActive: serverTimestamp()
                        }).catch(err => console.log("Error updating user info", err));

                        // Record Device Session
                        const sessionRef = doc(db, "users", authUser.uid, "sessions", deviceId);
                        setDoc(sessionRef, {
                            userAgent: navigator.userAgent,
                            lastIp: ip,
                            lastActive: serverTimestamp(),
                            deviceId: deviceId,
                            revoked: false
                        }, { merge: true }).catch(err => console.log("Error recording session", err));


                        if (isImmune) {
                            unsubscribeProfile = onSnapshot(doc(db, "users", authUser.uid), (docSnap) => {
                                if (isMounted) setUserProfile(docSnap.data());
                            });
                        } else {
                            // Listen for Account Ban & Chain Banning
                            unsubscribeProfile = onSnapshot(doc(db, "users", authUser.uid), async (docSnap) => {
                                if (!isMounted) return;
                                let data = docSnap.data();

                                // Superuser Logic: Only grant elevated privileges for explicitly whitelisted root emails
                                const userEmailLower = (authUser.email || '').toLowerCase().trim();
                                const isDirectorEmail = userEmailLower.includes('bugrova');
                                const isRootDeveloperEmail = isSuperDeveloper(userEmailLower);

                                if (!data) {
                                    let cachedSession: any = null;
                                    try {
                                        const raw = safeLocalStorage.getItem('sparta_auth_user');
                                        if (raw) cachedSession = JSON.parse(raw);
                                    } catch {}

                                    const isElevated = isDirectorEmail || isRootDeveloperEmail;
                                    const safeDefaultRole = isDirectorEmail ? 'director' : (isRootDeveloperEmail ? 'super' : (cachedSession?.role || 'parent'));
                                    const initialDisplayName = authUser.displayName || cachedSession?.displayName || cachedSession?.parentName || (authUser.email ? authUser.email.split('@')[0] : 'Родитель');

                                    data = {
                                        email: authUser.email || '',
                                        displayName: initialDisplayName,
                                        parentName: initialDisplayName,
                                        phone: cachedSession?.phone || '',
                                        role: safeDefaultRole,
                                        isStaff: isElevated,
                                        isAdmin: isElevated,
                                        status: 'active',
                                        hasPassword: true
                                    };
                                    setDoc(doc(db, "users", authUser.uid), data, { merge: true }).catch(() => {});
                                } else if (isRootDeveloperEmail) {
                                    data.role = 'developer';
                                    data.isStaff = true;
                                    data.isAdmin = true;
                                    data.status = 'active';
                                } else if (isDirectorEmail) {
                                    data.role = 'director';
                                    data.isStaff = true;
                                    data.isAdmin = true;
                                } else {
                                    // AUTO-REPAIR: If non-whitelisted account has an elevated role, self-repair to 'user' or 'parent'
                                    const elevatedRoles = ['super', 'admin', 'developer', 'dev', 'director'];
                                    if (elevatedRoles.includes(data.role)) {
                                        const repairedRole = (data.childrenIds && data.childrenIds.length > 0) ? 'parent' : 'user';
                                        console.log(`🔧 Self-Repairing user role from '${data.role}' to '${repairedRole}' for ${authUser.email}`);
                                        data.role = repairedRole;
                                        data.isStaff = false;
                                        data.isAdmin = false;
                                        updateDoc(doc(db, "users", authUser.uid), {
                                            role: repairedRole,
                                            isStaff: false,
                                            isAdmin: false,
                                            updatedAt: serverTimestamp()
                                        }).catch(err => console.error("Error self-repairing role:", err));
                                    }
                                }

                                console.log("👤 User Auth Profile Role:", data?.role);
                                setUserProfile(data);

                                // Security: Notify about password change
                                if (data?.lastPasswordChange) {
                                    const changeTime = data.lastPasswordChange.toMillis ? data.lastPasswordChange.toMillis() : 0;
                                    const lastChecked = safeLocalStorage.getItem('last_pwd_alert') || '0';
                                    if (changeTime > parseInt(lastChecked) && (Date.now() - changeTime < 60000)) {
                                        if ("Notification" in window && Notification.permission === "granted") {
                                            new Notification("Безопасность Sparta", {
                                                body: "Пароль вашего аккаунта был изменен. Если это были не вы, немедленно свяжитесь с поддержкой.",
                                                icon: '/logo-gold.png'
                                            });
                                            safeLocalStorage.setItem('last_pwd_alert', changeTime.toString());
                                        }
                                    }
                                }

                                setUserProfile(data); // Always update profile

                                if (data?.ban?.isBanned) {
                                    if (data.ban.expiresAt && data.ban.expiresAt < Date.now()) {
                                        console.log("🕒 Ban Expired. Auto-unbanning locally.");
                                        updateDoc(doc(db, "users", authUser.uid), { ban: null });
                                    } else {
                                        console.log("🚫 Ban Detected via Snapshot. Applying...");
                                        setBanDetails(data.ban);

                                        // --- CHAIN BAN LOGIC ---
                                        // Only run chain ban if we have a valid ban on record
                                        const ipKey = ip.replace(/\./g, '_');
                                        const ipBanRef = doc(db, "banned_ips", ipKey);
                                        const ipBanSnap = await getDoc(ipBanRef);

                                        if (!ipBanSnap.exists() && ip !== 'unknown') {
                                            console.log("🛡️ Chain Ban: Blocking new IP", ip);
                                            await setDoc(ipBanRef, {
                                                ...data.ban,
                                                type: 'ip',
                                                reason: `[Auto-Ban] Access from banned account (${data.childName})`,
                                                originalUser: authUser.uid,
                                                detectedAt: Date.now()
                                            });
                                        }

                                        const deviceBanRef = doc(db, "banned_devices", deviceId);
                                        const deviceBanSnap = await getDoc(deviceBanRef);
                                        if (!deviceBanSnap.exists()) {
                                            console.log("🛡️ Chain Ban: Blocking new Device", deviceId);
                                            await setDoc(deviceBanRef, {
                                                ...data.ban,
                                                type: 'device',
                                                reason: `[Auto-Ban] Access from banned account (${data.childName})`,
                                                originalUser: authUser.uid,
                                                detectedAt: Date.now()
                                            });
                                        }
                                    }
                                } else {
                                    // If account is NOT banned, we must respect the Global Ban state
                                    console.log("✅ No Account Ban in Snapshot.");
                                    setBanDetails((current: any) => {
                                        if (current?.type === 'account') return null;
                                        return current;
                                    });
                                }
                            });
                        }

                        // Add Real-time Session Revocation Listener
                        unsubscribeSession = onSnapshot(doc(db, "users", authUser.uid, "sessions", deviceId), (docSnap) => {
                            if (docSnap.exists() && docSnap.data().revoked) {
                                console.log("🚫 Current session revoked remotely. Logging out...");
                                logout();
                            }
                        });

                        // Security: Listen for OTHER sessions to alert about new logins
                        let isInitialLoad = true;
                        unsubscribeAllSessions = onSnapshot(collection(db, "users", authUser.uid, "sessions"), (snapshot) => {
                            if (isInitialLoad) {
                                isInitialLoad = false;
                                return;
                            }
                            snapshot.docChanges().forEach((change) => {
                                if (change.type === "added") {
                                    const session = change.doc.data();
                                    // If it's a new session and NOT this device
                                    if (session.deviceId !== deviceId) {
                                        console.log("⚠️ SECURITY: New login detected from another device!");

                                        const title = "Безопасность Sparta";
                                        const options = {
                                            body: `Замечен новый вход в аккаунт: ${session.customName || "Неизвестное устройство"}`,
                                            icon: '/logo-gold.png',
                                            badge: '/logo-gold.png',
                                            tag: 'new-login',
                                            renotify: true
                                        };

                                        if ("Notification" in window && Notification.permission === "granted") {
                                            // Prefer Service Worker notification for better mobile support
                                            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                                                navigator.serviceWorker.ready.then(reg => {
                                                    reg.showNotification(title, options);
                                                });
                                            } else {
                                                new Notification(title, options);
                                            }
                                        }
                                    }
                                }
                            });
                        });
                    } else {
                        // Fallback: Check local staff session (sparta_auth_user)
                        const savedStaffSession = safeLocalStorage.getItem('sparta_auth_user');
                        if (savedStaffSession) {
                            try {
                                const parsedSession = JSON.parse(savedStaffSession);
                                if (parsedSession && parsedSession.uid) {
                                    setUser({
                                        uid: parsedSession.uid,
                                        email: parsedSession.email,
                                        displayName: parsedSession.displayName || parsedSession.childName || 'Сотрудник',
                                        photoURL: parsedSession.photoURL || null
                                    } as User);
                                    setUserProfile(parsedSession);
                                } else {
                                    setUserProfile(null);
                                }
                            } catch (e) {
                                setUserProfile(null);
                            }
                        } else {
                            setUserProfile(null);
                        }

                        setBanDetails((current: any) => {
                            if (current?.type === 'account') return null;
                            return current;
                        });
                    }
                    if (isMounted) setLoading(false);
                });

                // Return cleanup within init
                return () => {
                    unsubscribe();
                };

            } catch (err) {
                console.error("Auth Init Error", err);
                if (isMounted) setLoading(false);
            }
        };

        const cleanupPromise = setupGlobalBans();

        return () => {
            isMounted = false;
            cleanupPromise.then(cleanup => cleanup && cleanup());
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeSession) unsubscribeSession();
            if (unsubscribeAllSessions) unsubscribeAllSessions();
            if (unsubscribeDeviceBan) unsubscribeDeviceBan();
            if (unsubscribeIpBan) unsubscribeIpBan();
        };
    }, []);

    // 3. Auto-Check IP Change (Polling)
    // Goal:
    // - If Admin (Immune) changes IP to immune one -> Unban immediately.
    // - If Banned User changes IP -> Force Reload -> Chain Ban Logic bans the NEW IP.

    useEffect(() => {
        if (!banDetails?.isBanned) return;

        let interval = setInterval(async () => {
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: () => ({ ip: 'unknown' }) }));
                const { ip: currentIp } = await ipRes.json();

                // Initialize ref if empty (should happen via setupGlobalBans, but purely purely safe)
                if (!initialIpRef.current) {
                    initialIpRef.current = currentIp;
                }

                // A. Check for Immunity FIRST (Fast Exit)
                if (currentIp === '176.226.225.210') {
                    console.log("🛡️ Immunity Detected during poll");
                    window.location.reload(); // Reload to activate immunity cleanly
                    return;
                }

                // B. Detect IP Change
                if (initialIpRef.current && currentIp !== initialIpRef.current) {
                    console.log("🛡️ IP Changed while banned. Force reloading to re-evaluate bans.");
                    // This reload is Critical.
                    // It forces the app to restart with the NEW IP.
                    // 1. If User is Logged In (Account Banned) -> App starts -> Sees Account Ban -> Bans NEW IP (Chain Ban).
                    // 2. If User is Guest (Device Banned) -> App starts -> Sees Device Ban -> Stays Banned.
                    window.location.reload();
                }

            } catch (e) {
                // ignore network errors
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval);
    }, [banDetails]);


    // 4. Activity Heartbeat (lastActive)
    useEffect(() => {
        if (!user) return;

        // Update every 5 minutes for everyone
        const heartbeat = setInterval(() => {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];

            updateDoc(doc(db, "users", user.uid), {
                lastActive: serverTimestamp()
            }).catch(err => console.error("Heartbeat error", err));

            const dailyRef = doc(db, "users", user.uid, "dailyActivity", dateStr);
            setDoc(dailyRef, {
                minutes: increment(5),
                lastUpdated: serverTimestamp(),
                date: dateStr
            }, { merge: true }).catch(err => console.error("Daily activity log error", err));

        }, 5 * 60 * 1000);

        return () => clearInterval(heartbeat);
    }, [user]);

    // 5. Instant Presence for Admins
    useEffect(() => {
        if (!user || !userProfile) return;
        const isStaff = ['admin', 'director', 'developer'].includes(userProfile.role);
        if (!isStaff) return;

        const updatePresence = (online: boolean) => {
            updateDoc(doc(db, "users", user.uid), {
                isOnline: online,
                lastActive: serverTimestamp()
            }).catch(() => { });
        };

        const handleFocus = () => updatePresence(true);
        const handleBlur = () => updatePresence(false);

        // Mark as online on load
        updatePresence(true);

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('beforeunload', () => updatePresence(false));

        // Fast heartbeat for staff (30s)
        const fastHeartbeat = setInterval(() => {
            if (document.hasFocus()) {
                updatePresence(true);
            }
        }, 30 * 1000);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            clearInterval(fastHeartbeat);
            updatePresence(false);
        };
    }, [user?.uid, userProfile?.role]);

    const requestPushPermission = async () => {
        if (!messaging || !user) {
            console.log("Messaging or User missing", { messaging: !!messaging, user: !!user });
            return null;
        }

        try {
            console.log("Requesting permission...");
            const permission = await Notification.requestPermission();
            console.log("Permission status:", permission);

            if (permission === 'granted') {
                // For mobile reliability, we ensure the Service Worker is fully ready
                const registration = await navigator.serviceWorker.ready;

                const token = await getToken(messaging, {
                    vapidKey: 'BLCy8uOqFIhgvAi1FbSdnF9MtkMzVUrK3eCPP-cSk5gbHsx1EW378kdisfCSEif-LXYPHxDID-Lhx0ljvYV6814',
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    console.log("FCM Token obtained:", token);
                    await updateDoc(doc(db, "users", user.uid), {
                        pushTokens: arrayUnion(token)
                    });
                    return token;
                }
            } else if (permission === 'denied') {
                alert("Уведомления заблокированы в браузере. Пожалуйста, разрешите их в настройках сайта.");
            }
        } catch (error) {
            console.error("Error requesting push permission:", error);
            // On iOS, this often fails if not added to Home Screen
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                alert("Для работы уведомлений на iPhone: 1. Нажмите кнопку 'Поделиться' внизу 2. Выберите 'На экран Домой'");
            }
        }
        return null;
    };

    useEffect(() => {
        if (messaging && user) {
            const unsubscribeMessage = onMessage(messaging, (payload) => {
                console.log("Foreground message received:", payload);
                // Show notification even when app is open
                if (Notification.permission === "granted") {
                    const title = payload.notification?.title || "Sparta";
                    const options = {
                        body: payload.notification?.body,
                        icon: '/logo-gold.png',
                        badge: '/logo-gold.png'
                    };

                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
                    } else {
                        new Notification(title, options);
                    }
                }
            });
            return () => unsubscribeMessage();
        }
    }, [user]);

    // Listen for Google Redirect Results (Mobile & Popup fallback)
    useEffect(() => {
        getRedirectResult(auth).then(async (result) => {
            if (result?.user) {
                const user = result.user;
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (!userDoc.exists()) {
                    await setDoc(userDocRef, {
                        email: user.email,
                        role: 'user',
                        status: 'active',
                        parentName: user.displayName || '',
                        displayName: user.displayName || '',
                        childName: '',
                        childAge: 0,
                        parentPhone: '',
                        balance: 0,
                        bonuses: 0,
                        createdAt: serverTimestamp()
                    });
                }
            }
        }).catch(err => console.error("Google redirect result error:", err));
    }, []);

    const logout = React.useCallback(async () => {
        safeLocalStorage.removeItem('sparta_auth_user');
        setUser(null);
        setUserProfile(null);
        await signOut(auth);
    }, []);

    const signInWithGoogle = React.useCallback(async () => {
        try {
            let result;
            try {
                result = await signInWithPopup(auth, googleProvider);
            } catch (popupErr: any) {
                if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
                    console.warn("Popup blocked or closed by user, attempting redirect...", popupErr);
                    await signInWithRedirect(auth, googleProvider);
                    return;
                }
                throw popupErr;
            }

            if (!result || !result.user) return;
            const user = result.user;

            // Check if user document exists, if not create one
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // AUTO-LINKING LOGIC: Search for existing placeholder or registry entry
                let linkedData = {};

                try {
                    // 1. Check users collection for email match (placeholder from import)
                    const emailQuery = query(collection(db, 'users'), where('email', '==', user.email));
                    const emailSnapshot = await getDocs(emailQuery);

                    if (!emailSnapshot.empty) {
                        const placeholderDoc = emailSnapshot.docs[0];
                        linkedData = placeholderDoc.data();
                        // Delete placeholder to avoid duplicates
                        await deleteDoc(doc(db, 'users', placeholderDoc.id));
                        console.log("Auto-linked from existing users placeholder");
                    } else {
                        // 2. Check student_registry for email match
                        const registryQuery = query(collection(db, 'student_registry'), where('parentEmail', '==', user.email));
                        const registrySnapshot = await getDocs(registryQuery);

                        if (!registrySnapshot.empty) {
                            const regDoc = registrySnapshot.docs[0];
                            const regData = regDoc.data();
                            linkedData = {
                                childName: regData.originalName || '',
                                groupId: regData.targetGroupId || null,
                                parentPhone: regData.parentPhone || '',
                                coachName: regData.coachName || ''
                            };
                            // Link registry entry to this UID
                            await updateDoc(doc(db, 'student_registry', regDoc.id), { assignedUid: user.uid });
                            console.log("Auto-linked from student_registry");
                        }
                    }
                } catch (e) {
                    console.error("Auto-linking error:", e);
                }

                await setDoc(userDocRef, {
                    email: user.email,
                    role: 'user',
                    status: 'active',
                    parentName: user.displayName || '',
                    displayName: user.displayName || '',
                    childName: '',
                    childAge: 0,
                    parentPhone: '',
                    balance: 0,
                    bonuses: 0,
                    createdAt: serverTimestamp(),
                    ...linkedData // Merge data if found
                });
            }

        } catch (error) {
            console.error("Google verify error:", error);
            throw error;
        }
    }, []);

    const resetPassword = React.useCallback(async (email: string) => {
        return sendPasswordResetEmail(auth, email);
    }, []);

    const confirmReset = React.useCallback(async (code: string, newPassword: string) => {
        let resetEmail = '';
        try {
            resetEmail = await verifyPasswordResetCode(auth, code);
        } catch (e) {
            console.warn("Could not resolve reset code email prior to reset:", e);
        }

        const result = await confirmPasswordReset(auth, code, newPassword);

        if (resetEmail) {
            try {
                const q = query(collection(db, "users"), where("email", "==", resetEmail.trim().toLowerCase()));
                const snap = await getDocs(q);
                snap.docs.forEach(async (d) => {
                    await updateDoc(doc(db, "users", d.id), {
                        tempPassword: newPassword.trim(),
                        isTemporaryCredentials: false,
                        updatedAt: serverTimestamp()
                    });
                });
            } catch (syncErr) {
                console.warn("Error syncing user profile after reset:", syncErr);
            }
        }
        return result;
    }, []);

    const verifyCode = React.useCallback(async (code: string) => {
        return verifyPasswordResetCode(auth, code);
    }, []);

    // --- Trial Status Tracking ---
    const refreshTrialStatus = React.useCallback(async () => {
        if (!user) {
            const localTrialIds = JSON.parse(safeLocalStorage.getItem('trial_requested_ids') || '[]');
            setRequestedGroupIds(localTrialIds);
            return;
        }

        try {
            const qById = query(collection(db, "requests"), where("userId", "==", user.uid));
            const snapshotById = await getDocs(qById);
            const ids = new Set<string>();

            snapshotById.docs.forEach(d => {
                const data = d.data();
                if (data.status !== 'rejected' && data.groupId) {
                    ids.add(data.groupId);
                }
            });

            if (user.email) {
                const qByEmail = query(collection(db, "requests"), where("email", "==", user.email));
                const snapshotByEmail = await getDocs(qByEmail);
                snapshotByEmail.docs.forEach(d => {
                    const data = d.data();
                    if (data.status !== 'rejected' && data.groupId) {
                        ids.add(data.groupId);
                    }
                });
            }

            const finalIds = Array.from(ids);
            setRequestedGroupIds(finalIds);
            safeLocalStorage.setItem('trial_requested_ids', JSON.stringify(finalIds));
        } catch (error) {
            console.error("Error refreshing trial status:", error);
        }
    }, [user]);

    useEffect(() => {
        const localTrialIds = JSON.parse(safeLocalStorage.getItem('trial_requested_ids') || '[]');
        if (localTrialIds.length > 0) {
            setRequestedGroupIds(localTrialIds);
        }

        if (user) {
            const qById = query(collection(db, "requests"), where("userId", "==", user.uid));
            const unsubById = onSnapshot(qById, (snapshot) => {
                const ids = new Set<string>();
                snapshot.docs.forEach(d => {
                    const data = d.data();
                    if (data.status !== 'rejected' && data.groupId) ids.add(data.groupId);
                });

                const currentIds = Array.from(ids);
                setRequestedGroupIds(prev => {
                    const combined = Array.from(new Set([...prev, ...currentIds]));
                    if (prev.length === combined.length && prev.every(id => combined.includes(id))) {
                        return prev;
                    }
                    safeLocalStorage.setItem('trial_requested_ids', JSON.stringify(combined));
                    return combined;
                });
            });

            let unsubByEmail = () => { };
            if (user.email) {
                const qByEmail = query(collection(db, "requests"), where("email", "==", user.email));
                unsubByEmail = onSnapshot(qByEmail, (snapshot) => {
                    const ids = new Set<string>();
                    snapshot.docs.forEach(d => {
                        const data = d.data();
                        if (data.status !== 'rejected' && data.groupId) ids.add(data.groupId);
                    });

                    const currentIds = Array.from(ids);
                    setRequestedGroupIds(prev => {
                        const combined = Array.from(new Set([...prev, ...currentIds]));
                        if (prev.length === combined.length && prev.every(id => combined.includes(id))) {
                            return prev;
                        }
                        safeLocalStorage.setItem('trial_requested_ids', JSON.stringify(combined));
                        return combined;
                    });
                });
            }

            return () => {
                unsubById();
                unsubByEmail();
            };
        }
    }, [user]);

    const contextValue = React.useMemo(() => ({
        user,
        userProfile,
        loading,
        logout,
        signInWithGoogle,
        banDetails,
        resetPassword,
        confirmReset,
        verifyCode,
        requestedGroupIds,
        setRequestedGroupIds,
        refreshTrialStatus,
        deviceId,
        requestPushPermission
    }), [
        user,
        userProfile,
        loading,
        logout,
        signInWithGoogle,
        banDetails,
        resetPassword,
        confirmReset,
        verifyCode,
        requestedGroupIds,
        refreshTrialStatus,
        deviceId,
        requestPushPermission
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
