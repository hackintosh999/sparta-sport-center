import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import WindowTitleBar from './components/electron/WindowTitleBar';

import AdminRoute from './components/admin/AdminRoute';
import DirectorRoute from './components/admin/DirectorRoute';
import AdminLayout from './components/admin/AdminLayout';

// Lazy load non-critical and heavy Admin routes
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminRequests = React.lazy(() => import('./pages/admin/AdminRequests'));
const AdminNews = React.lazy(() => import('./pages/admin/AdminNews'));
const AdminMessages = React.lazy(() => import('./pages/admin/AdminMessages'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const AdminComments = React.lazy(() => import('./pages/admin/AdminComments'));
const AdminSchedule = React.lazy(() => import('./pages/admin/AdminSchedule'));
const AdminTeam = React.lazy(() => import('./pages/admin/AdminTeam'));
const AdminDirections = React.lazy(() => import('./pages/admin/AdminDirections'));
const AdminPromos = React.lazy(() => import('./pages/admin/AdminPromos'));
const AdminShop = React.lazy(() => import('./pages/admin/AdminShop'));
const AdminGroups = React.lazy(() => import('./pages/admin/AdminGroups'));
const AdminAchievements = React.lazy(() => import('./pages/admin/AdminAchievements'));
const AdminBans = React.lazy(() => import('./pages/admin/AdminBans'));
const AdminBroadcasts = React.lazy(() => import('./pages/admin/AdminBroadcasts'));
const AdminReviews = React.lazy(() => import('./pages/admin/AdminReviews'));
const AdminFinance = React.lazy(() => import('./pages/admin/AdminFinance'));
const AdminScanner = React.lazy(() => import('./pages/admin/AdminScanner'));
const AdminLocations = React.lazy(() => import('./pages/admin/AdminLocations'));
const DirectorDashboard = React.lazy(() => import('./pages/admin/DirectorDashboard'));


// Lazy load public heavy routes
const Shop = React.lazy(() => import('./pages/Shop'));
const ProductDetails = React.lazy(() => import('./pages/ProductDetails'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const Broadcasts = React.lazy(() => import('./pages/Broadcasts'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));

const LegalLayout = React.lazy(() => import('./pages/legal/LegalLayout'));
const Requisites = React.lazy(() => import('./pages/legal/Requisites'));
const PublicOffer = React.lazy(() => import('./pages/legal/PublicOffer'));
const EducationInfo = React.lazy(() => import('./pages/legal/EducationInfo'));

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
import { doc, onSnapshot } from 'firebase/firestore';

import { safeLocalStorage } from './utils/storage';
import { usePresence } from './hooks/usePresence';

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
                            <Suspense fallback={<LoadingScreen />}>
                                <Routes>
                                    <Route path="/" element={<LandingPage />} />
                                    <Route path="/shop" element={<Shop />} /> {/* Public Shop Route */}
                                    <Route path="/shop/favorites" element={<Favorites />} />
                                    <Route path="/shop/:id" element={<ProductDetails />} />
                                    <Route path="/broadcasts" element={<Broadcasts />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
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
                                        <Route path="schedule" element={<AdminSchedule />} />
                                        <Route path="comments" element={<AdminComments />} />
                                        <Route path="settings" element={<AdminSettings />} />
                                        <Route path="scanner" element={<AdminScanner />} />
                                        <Route path="promos" element={<AdminPromos />} />
                                        <Route path="shop" element={<AdminShop />} />
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorMsg: string }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, errorMsg: '' };
    }

    static getDerivedStateFromError(error: any) {
        // Prevent full app crash overlay; log error and allow graceful continuation
        return { hasError: false, errorMsg: error?.message || 'Error' };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.warn("Handled runtime component exception gracefully:", error, errorInfo);
    }

    render() {
        return this.props.children;
    }
}

const AppWrapper: React.FC = () => (
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

export default AppWrapper;