export const safeLocalStorage = {
    getItem: (key: string): string | null => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch (e) {
            console.warn(`Error reading localStorage key "${key}":`, e);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn(`Error writing to localStorage key "${key}":`, e);
        }
    },
    removeItem: (key: string): void => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn(`Error removing localStorage key "${key}":`, e);
        }
    }
};

export const performEmergencyCleanup = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.clear();
        }
    } catch (e) {
        console.warn('Emergency cleanup failed:', e);
    }
};

export const performHardReset = () => {
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.clear();
            window.sessionStorage.clear();
            window.location.reload();
        }
    } catch (e) {
        console.warn('Hard reset failed:', e);
    }
};
