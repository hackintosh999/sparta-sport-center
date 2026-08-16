import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isLocalApp = process.env.ELECTRON === 'true' || process.env.CAPACITOR === 'true';
    return {
        base: isLocalApp ? './' : '/',
        server: {
            port: 3000,
            host: '0.0.0.0',
            proxy: {
                '/api': {
                    target: 'http://127.0.0.1:3005',
                    changeOrigin: true,
                    secure: false,
                }
            }
        },
        plugins: [react()],
        build: {
            target: 'esnext',
            minify: 'esbuild',
            cssMinify: true,
            chunkSizeWarningLimit: 1200,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules/firebase')) {
                            return 'vendor-firebase';
                        }
                        if (id.includes('node_modules/framer-motion') || id.includes('node_modules/gsap')) {
                            return 'vendor-animation';
                        }
                        if (id.includes('node_modules/three')) {
                            return 'vendor-three';
                        }
                        if (id.includes('node_modules/lucide-react')) {
                            return 'vendor-icons';
                        }
                        if (id.includes('node_modules/recharts') || id.includes('node_modules/chart.js')) {
                            return 'vendor-charts';
                        }
                        if (id.includes('node_modules/jspdf') || id.includes('node_modules/xlsx') || id.includes('node_modules/html5-qrcode')) {
                            return 'vendor-documents';
                        }
                    }
                }
            }
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify(mode),
            'process.version': JSON.stringify('v18.0.0'), // Some libraries check this
            'process.platform': JSON.stringify('browser')
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        }
    };
});