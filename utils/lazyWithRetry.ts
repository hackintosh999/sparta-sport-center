import React from 'react';

/**
 * Robust wrapper around React.lazy that handles dynamic chunk loading failures
 * (e.g. after new deployments when old chunk hashes are purged from CDN).
 * If a chunk fails to load due to a stale version or network glitch,
 * it triggers a clean page reload (throttled to once per 15 seconds) so the user
 * immediately gets the latest application bundle without crashing into an error loop.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
    componentImport: () => Promise<{ default: T } | { [key: string]: any }>
): React.LazyExoticComponent<T> {
    return React.lazy(async () => {
        const pageHasBeenForceRefreshed = sessionStorage.getItem('chunk_reload_attempt');
        const lastReload = pageHasBeenForceRefreshed ? parseInt(pageHasBeenForceRefreshed, 10) : 0;
        const now = Date.now();

        try {
            const module = await componentImport();
            if ('default' in module) {
                return module as { default: T };
            }
            const keys = Object.keys(module);
            if (keys.length > 0) {
                return { default: module[keys[0]] } as { default: T };
            }
            return module as { default: T };
        } catch (error: any) {
            console.error('[lazyWithRetry] Failed to load dynamic chunk:', error);

            const isChunkError =
                error?.name === 'ChunkLoadError' ||
                error?.message?.includes('Failed to fetch dynamically imported module') ||
                error?.message?.includes('Importing a module script failed') ||
                error?.message?.includes('error loading dynamically imported module');

            if (isChunkError && now - lastReload > 15000) {
                sessionStorage.setItem('chunk_reload_attempt', now.toString());
                window.location.reload();
                // Return an empty component while the page reloads
                return { default: (() => null) as unknown as T };
            }

            throw error;
        }
    });
}
