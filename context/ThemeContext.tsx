import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('sparta-theme');
        return (saved as Theme) || 'dark';
    });

    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        localStorage.setItem('sparta-theme', theme);
        root.setAttribute('data-theme', theme);

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'light' ? '#F9F5F0' : '#020202');
        }

        // Handle transition class
        if (isTransitioning) {
            root.classList.add('is-transitioning');
            const timer = setTimeout(() => {
                root.classList.remove('is-transitioning');
                setIsTransitioning(false);
            }, 600); // match CSS duration
            return () => clearTimeout(timer);
        }
    }, [theme, isTransitioning]);

    const toggleTheme = () => {
        // Modern View Transitions API (Chrome/Edge)
        if (typeof document !== 'undefined' && (document as any).startViewTransition) {
            (document as any).startViewTransition(() => {
                setTheme(prev => prev === 'light' ? 'dark' : 'light');
            });
        } else {
            // Fallback for older browsers
            setIsTransitioning(true);
            setTheme(prev => prev === 'light' ? 'dark' : 'light');
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div className={`theme-transition-overlay ${isTransitioning ? 'active' : ''}`} />
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};