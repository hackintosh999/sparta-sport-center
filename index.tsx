import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';

// Global handler for stale chunk errors after new deployments
window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Stale deployment chunk detected. Refreshing application...', event);
    const lastReload = sessionStorage.getItem('vite_preload_ts');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('vite_preload_ts', now.toString());
        window.location.reload();
    }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>
);