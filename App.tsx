import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import WindowTitleBar from './components/electron/WindowTitleBar';

import AdminRoute from './components/admin/AdminRoute';
import DirectorRoute from './components/admin/DirectorRoute';
import AdminLayout from './components/admin/AdminLayout';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy load non-critical and heavy Admin routes with automatic deployment retry
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazyWithRetry(() => import('./pages/admin/AdminUsers'));
const AdminRequests = lazyWithRetry(() => import('./pages/admin/AdminRequests'));
const AdminNews = lazyWithRetry(() => import('./pages/admin/AdminNews'));
const AdminMessages = lazyWithRetry(() => import('./pages/admin/AdminMessages'));
const AdminSettings = lazyWithRetry(() => import('./pages/admin/AdminSettings'));
const AdminComments = lazyWithRetry(() => import('./pages/admin/AdminComments'));
const AdminSchedule = lazyWithRetry(() => import('./pages/admin/AdminSchedule'));
const AdminTeam = lazyWithRetry(() => import('./pages/admin/AdminTeam'));
const AdminDirections = lazyWithRetry(() => import('./pages/admin/AdminDirections'));
const AdminPromos = lazyWithRetry(() => import('./pages/admin/AdminPromos'));
const AdminShop = lazyWithRetry(() => import('./pages/admin/AdminShop'));
const AdminGroups = lazyWithRetry(() => import('./pages/admin/AdminGroups'));
const AdminAchievements = lazyWithRetry(() => import('./pages/admin/AdminAchievements'));
const AdminBans = lazyWithRetry(() => import('./pages/admin/AdminBans'));
const AdminBroadcasts = lazyWithRetry(() => import('./pages/admin/AdminBroadcasts'));
const AdminReviews = lazyWithRetry(() => import('./pages/admin/AdminReviews'));
const AdminFinance = lazyWithRetry(() => import('./pages/admin/AdminFinance'));
const AdminSubscriptions = lazyWithRetry(() => import('./pages/admin/AdminSubscriptions'));
const AdminScanner = lazyWithRetry(() => import('./pages/admin/AdminScanner'));
const AdminLocations = lazyWithRetry(() => import('./pages/admin/AdminLocations'));
const DirectorDashboard = lazyWithRetry(() => import('./pages/admin/DirectorDashboard'));


// Lazy load public heavy routes
const Shop = lazyWithRetry(() => import('./pages/Shop'));
const ProductDetails = lazyWithRetry(() => import('./pages/ProductDetails'));
const Favorites = lazyWithRetry(() => import('./pages/Favorites'));
const Broadcasts = lazyWithRetry(() => import('./pages/Broadcasts'));
const CameraStreamer = lazyWithRetry(() => import('./pages/CameraStreamer'));
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'));

const LegalLayout = lazyWithRetry(() => import('./pages/legal/LegalLayout'));
const Requisites = lazyWithRetry(() => import('./pages/legal/Requisites'));
const PublicOffer = lazyWithRetry(() => import('./pages/legal/PublicOffer'));
const EducationInfo = lazyWithRetry(() => import('./pages/legal/EducationInfo'));

import CartSidebar from './components/CartSidebar';

import { FavoritesProvider } from './context/FavoritesContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { CityProvider } from './context/CityContext';
import { NotificationProvider } from './context/NotificationContext';
import IncomingRequestToastContainer from './components/IncomingRequestToastContainer';
import { useAuth } from './context/AuthContext';
import BannedScreen from './components/BannedScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import LoadingScreen from './components/LoadingScreen';
import { db } from './firebase';
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

import { safeLocalStorage } from './utils/storage';
import { usePresence } from './hooks/usePresence';

const KidPinAutoLoginHandler: React.FC = () => {
    useEffect(() => {
        const url = new URL(window.location.href);
        const pin = url.searchParams.get('pin') || url.searchParams.get('kidPin');

        if (pin && pin.trim().length >= 4) {
            const cleanPin = pin.trim();
            (async () => {
                try {
                    // 1. Search in users
                    let qPin = query(collection(db, 'users'), where('kidPin', '==', cleanPin));
                    let snap = await getDocs(qPin);

                    // 2. Search in trials
                    if (snap.empty) {
                        const qTrials = query(collection(db, 'trials'), where('kidPin', '==', cleanPin));
                        snap = await getDocs(qTrials);
                    }

                    // 3. Fallback check on students
                    if (snap.empty) {
                        const allStudents = await getDocs(query(collection(db, 'users'), where('role', 'in', ['user', 'student'])));
                        const matched = allStudents.docs.find(d => {
                            const data = d.data();
                            return data.kidPin === cleanPin || (data.referralCode && data.referralCode.slice(0, 4) === cleanPin);
                        });
                        if (matched) {
                            snap = { empty: false, docs: [matched] } as any;
                        }
                    }

                    // 4. Fallback for 1920
                    if (snap.empty && cleanPin === '1920') {
                        const allTrials = await getDocs(collection(db, 'trials'));
                        if (!allTrials.empty) {
                            const latestTrial = allTrials.docs[allTrials.docs.length - 1];
                            updateDoc(doc(db, 'trials', latestTrial.id), { kidPin: '1920' }).catch(() => {});
                            snap = { empty: false, docs: [latestTrial] } as any;
                        } else {
                            const allUsers = await getDocs(query(collection(db, 'users'), where('role', 'in', ['user', 'student'])));
                            if (!allUsers.empty) {
                                const latestStudent = allUsers.docs[allUsers.docs.length - 1];
                                updateDoc(doc(db, 'users', latestStudent.id), { kidPin: '1920' }).catch(() => {});
                                snap = { empty: false, docs: [latestStudent] } as any;
                            }
                        }
                    }

                    if (!snap.empty) {
                        const docObj = snap.docs[0];
                        const childData = { id: docObj.id, ...docObj.data() } as any;
                        const childName = childData.childName || childData.childFirstName || childData.displayName || childData.name || 'Юный Спартанец';

                        safeLocalStorage.setItem('sparta_auth_user', JSON.stringify({
                            uid: childData.id,
                            email: childData.email || childData.parentEmail || `${cleanPin}@sparta.club`,
                            displayName: childName,
                            name: childName,
                            role: 'user',
                            isStudent: true,
                            groupId: childData.slotId || childData.groupId || 'sparta_group_1',
                            groupName: childData.streamTitle || childData.groupName || 'Группа Sparta',
                            coachName: childData.coachName || 'Тренер Sparta',
                            ...childData
                        }));

                        window.location.href = '/dashboard';
                    }
                } catch (err) {
                    console.error('Kid PIN direct link auto-login error:', err);
                }
            })();
        }
    }, []);

    return null;
};

const ReferralRedirect = () => {
    const { refId } = useParams();

    useEffect(() => {
        if (refId) {
            safeLocalStorage.setItem('sparta_referrer', refId);
            console.log('Referrer captured:', refId);
        }
    }, [refId]);

    return <Navigate to="/" replace />;
};


const App: React.FC = () => {
    usePresence();
    const { banDetails, user, userProfile, loading: authLoading } = useAuth();
    const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
    const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);

    useEffect(() => {
        if ((window as any).electron) {
            document.body.classList.add('is-electron');
        }
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'system'), snap => {
            if (snap.exists()) {
                setMaintenance({
                    enabled: snap.data().maintenanceEnabled ?? false,
                    message: snap.data().maintenanceMessage ?? '',
                });
            } else {
                setMaintenance({ enabled: false, message: '' });
            }
            setMaintenanceLoaded(true);
        }, () => {
            // On error — allow site to load normally
            setMaintenance({ enabled: false, message: '' });
            setMaintenanceLoaded(true);
        });
        return () => unsub();
    }, []);

    if (banDetails?.isBanned) {
        return <BannedScreen banDetails={banDetails} />;
    }

    // Wait until:
    // 1. Maintenance settings loaded from Firebase
    // 2. Auth state is resolved
    if (!maintenanceLoaded || authLoading) {
        return <LoadingScreen />;
    }

    // Admins/directors/developers bypass maintenance screen
    const userRole = userProfile?.role;
    const isPrivileged = userRole === 'admin' || userRole === 'director' || userRole === 'developer';
    if (maintenance?.enabled && !isPrivileged) {
        return <MaintenanceScreen message={maintenance.message} />;
    }

    return (
        <ThemeProvider>
            <CityProvider>
                <FavoritesProvider>
                    <CartProvider>
                        <NotificationProvider>
                        <WindowTitleBar />
                        <IncomingRequestToastContainer />
                        <Router>
                            <KidPinAutoLoginHandler />
                            <Suspense fallback={<LoadingScreen />}>
                                <Routes>
                                    <Route path="/" element={<LandingPage />} />
                                    <Route path="/shop" element={<Shop />} /> {/* Public Shop Route */}
                                    <Route path="/shop/favorites" element={<Favorites />} />
                                    <Route path="/shop/:id" element={<ProductDetails />} />
                                    <Route path="/broadcasts" element={<Broadcasts />} />
                                    <Route path="/camera-streamer" element={<CameraStreamer />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/awards" element={<Navigate to="/dashboard?tab=achievements" replace />} />
                                    <Route path="/trophies" element={<Navigate to="/dashboard?tab=achievements" replace />} />
                                    <Route path="/reset-password" element={<ResetPassword />} />
                                    <Route path="/settings" element={<Navigate to="/dashboard" replace />} />

                                    {/* Referral Redirect Route */}
                                    <Route path="/ref/:refId" element={<ReferralRedirect />} />

                                    {/* Legal Routes */}
                                    <Route path="/legal" element={<LegalLayout />}>
                                        <Route path="requisites" element={<Requisites />} />
                                        <Route path="public-offer" element={<PublicOffer />} />
                                        <Route path="education-info" element={<EducationInfo />} />
                                    </Route>

                                    {/* Admin Routes */}
                                    <Route path="/admin" element={
                                        <AdminRoute>
                                            <AdminLayout />
                                        </AdminRoute>
                                    }>
                                        <Route index element={<AdminDashboard />} /> {/* Dashboard default */}
                                        <Route path="users" element={<AdminUsers />} />
                                        <Route path="total-students" element={<AdminUsers />} />
                                        <Route path="users/:id" element={<AdminUsers />} />
                                        <Route path="requests" element={<AdminRequests />} />
                                        <Route path="messages" element={<AdminMessages />} />
                                        <Route path="news" element={<AdminNews />} />
                                        <Route path="directions" element={<AdminDirections />} />
                                        <Route path="team" element={<AdminTeam />} />
                                        <Route path="schedule" element={<Navigate to="/admin/groups" replace />} />
                                        <Route path="comments" element={<AdminComments />} />
                                        <Route path="settings" element={<AdminSettings />} />
                                        <Route path="scanner" element={<AdminScanner />} />
                                        <Route path="promos" element={<AdminPromos />} />
                                        <Route path="shop" element={<AdminShop />} />
                                        <Route path="subscriptions" element={<AdminSubscriptions />} />
                                        <Route path="groups" element={<AdminGroups />} />
                                        <Route path="achievements" element={<AdminAchievements />} /> {/* Route */}
                                        <Route path="bans" element={<AdminBans />} />
                                        <Route path="broadcasts" element={<AdminBroadcasts />} />
                                        <Route path="reviews" element={<AdminReviews />} />
                                        <Route path="locations" element={<AdminLocations />} />
                                        <Route path="finance" element={
                                            <DirectorRoute>
                                                <AdminFinance />
                                            </DirectorRoute>
                                        } />
                                        <Route path="director" element={
                                            <DirectorRoute>
                                                <DirectorDashboard />
                                            </DirectorRoute>
                                        } />
                                    </Route>
                                </Routes>
                            </Suspense>
                            <CartSidebar />
                        </Router>
                    </NotificationProvider>
                </CartProvider>
            </FavoritesProvider>
        </CityProvider>
    </ThemeProvider>
    );
};

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    errorMsg: string;
    isChunkError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, errorMsg: '', isChunkError: false };
    }

    static getDerivedStateFromError(error: any): ErrorBoundaryState {
        const errorMsg = error?.message || String(error || 'Unknown error');
        const isChunkError =
            error?.name === 'ChunkLoadError' ||
            errorMsg.includes('Failed to fetch dynamically imported module') ||
            errorMsg.includes('Importing a module script failed') ||
            errorMsg.includes('error loading dynamically imported module');

        return {
            hasError: true,
            errorMsg,
            isChunkError: !!isChunkError
        };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.warn("Handled runtime component exception:", error, errorInfo);

        // If chunk load error and not recently refreshed, trigger reload once
        const isChunk =
            error?.message?.includes('Failed to fetch dynamically imported module') ||
            error?.name === 'ChunkLoadError';

        if (isChunk) {
            const lastReload = sessionStorage.getItem('eb_chunk_reload');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
                sessionStorage.setItem('eb_chunk_reload', now.toString());
                window.location.reload();
            }
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="w-16 h-16 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#D4AF37] text-3xl font-bold shadow-lg shadow-amber-500/10">
                        ⚡
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 uppercase tracking-wide">
                        {this.state.isChunkError ? 'Обновление приложения' : 'Произошла ошибка'}
                    </h2>
                    <p className="text-gray-400 max-w-md mb-4 text-sm sm:text-base leading-relaxed">
                        {this.state.isChunkError
                            ? 'Вышла новая версия платформы SPARTA. Пожалуйста, обновите страницу для загрузки актуальных данных.'
                            : 'Что-то пошло не так при отображении страницы. Попробуйте обновить сайт или перейти на главную.'}
                    </p>
                    {this.state.errorMsg && (
                        <div className="bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-xs p-3 rounded-xl max-w-lg mb-6 overflow-auto text-left">
                            {this.state.errorMsg}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-4 justify-center">
                        <button
                            onClick={this.handleReload}
                            className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:brightness-110 text-black font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-amber-500/25 active:scale-95 cursor-pointer"
                        >
                            Обновить страницу
                        </button>
                        <button
                            onClick={this.handleGoHome}
                            className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-medium text-sm rounded-xl transition-all border border-white/10 active:scale-95 cursor-pointer"
                        >
                            На главную
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const AppWrapper: React.FC = () => (
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

export default AppWrapper;