"use client"

// /app/config/settings.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';

// 1) Define setting types & defaults
export type FontSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
export type ViewMode = 'Classic' | 'GACC-Slides';

export const FONT_SIZES: FontSize[] = ['extra-small', 'small', 'medium', 'large', 'extra-large'];
export const VIEW_MODES: ViewMode[] = ['Classic', 'GACC-Slides'];

interface ConfigContextType {
    fontSize: FontSize;
    videoDisplay: boolean;
    showChords: boolean;
    transposeChords: number;
    viewMode: ViewMode;
    showTracedLine: boolean;

    setFontSize: (size: FontSize) => void;
    toggleVideoDisplay: () => void;
    toggleShowChords: () => void;
    incrementTranspose: () => void;
    decrementTranspose: () => void;
    setViewMode: (mode: ViewMode) => void;
    toggleShowTracedLine: () => void;
}

const DEFAULTS = {
    fontSize: 'medium' as FontSize,
    videoDisplay: true,
    showChords: true,
    transposeChords: 0,
    viewMode: 'Classic' as ViewMode,
    showTracedLine: false,
};
const COOKIE_AGE_DAYS = 365;

// 2) Cookie helpers (browser-only)
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(
        new RegExp('(^| )' + name + '=([^;]+)')
    );
    return match ? decodeURIComponent(match[2]) : null;
}
function setCookie(name: string, value: string) {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_AGE_DAYS);
    document.cookie = `${name}=${encodeURIComponent(
        value
    )};expires=${expires.toUTCString()};path=/`;
}

// 3) Create Context
const ConfigContext = createContext<ConfigContextType>({
    ...DEFAULTS,
    setFontSize: () => { },
    toggleVideoDisplay: () => { },
    toggleShowChords: () => { },
    incrementTranspose: () => { },
    decrementTranspose: () => { },
    setViewMode: () => { },
    toggleShowTracedLine: () => { },
});

// 4) Provider component
export function ConfigProvider({ children }: { children: ReactNode }) {
    // state hooks
    const [fontSize, _setFontSize] = useState<FontSize>(DEFAULTS.fontSize);
    const [videoDisplay, _setVideoDisplay] = useState<boolean>(
        DEFAULTS.videoDisplay
    );
    const [showChords, _setShowChords] = useState<boolean>(
        DEFAULTS.showChords
    );
    const [transposeChords, _setTransposeChords] = useState<number>(
        DEFAULTS.transposeChords
    );
    const [viewMode, _setViewMode] = useState<ViewMode>(DEFAULTS.viewMode);
    const [showTracedLine, _setShowTracedLine] = useState<boolean>(
        DEFAULTS.showChords
    );

    // on mount, read cookies (if present)
    useEffect(() => {
        const fs = getCookie('fontSize') as FontSize;
        if (FONT_SIZES.includes(fs)) {
            _setFontSize(fs);
        }

        const vm = getCookie('viewMode') as ViewMode;
        if (VIEW_MODES.includes(vm)) {
            _setViewMode(vm);
        }

        const vd = getCookie('videoDisplay');
        if (vd !== null) {
            _setVideoDisplay(vd === 'true');
        }

        const sc = getCookie('showChords');
        if (sc !== null) {
            _setShowChords(sc === 'true');
        }

        const tl = getCookie('showTracedLine');
        if (tl !== null) {
            _setShowTracedLine(tl === 'true');
        }

        const tc = getCookie('transposeChords');
        const n = tc !== null ? parseInt(tc, 10) : DEFAULTS.transposeChords;
        if (!isNaN(n) && n >= 0 && n <= 11) {
            _setTransposeChords(n);
        }
    }, []);

    // Change root em based on font size
    useEffect(() => {
        const scaleMap: Record<FontSize, string> = {
            'extra-small': '14px',
            small: '17px',
            medium: '20px',
            large: '23px',
            'extra-large': '26px',
        }
        // apply the new root font-size
        document.documentElement.style.fontSize = scaleMap[fontSize]
    }, [fontSize])

    // setters that also update cookies
    const setFontSize = (size: FontSize) => {
        _setFontSize(size);
        setCookie('fontSize', size);
    };
    const setViewMode = (mode: ViewMode) => {
        _setViewMode(mode);
        setCookie('viewMode', mode);
    };
    const toggleVideoDisplay = () => {
        _setVideoDisplay((prev) => {
            const next = !prev;
            setCookie('videoDisplay', String(next));
            return next;
        });
    };
    const toggleShowChords = () => {
        _setShowChords((prev) => {
            const next = !prev;
            setCookie('showChords', String(next));
            return next;
        });
    };
    const toggleShowTracedLine = () => {
        _setShowTracedLine((prev) => {
            const next = !prev;
            setCookie('showTracedLine', String(next));
            return next;
        });
    };
    const incrementTranspose = () => {
        _setTransposeChords((prev) => {
            const next = (prev + 1) % 12;
            setCookie('transposeChords', String(next));
            return next;
        });
    };
    const decrementTranspose = () => {
        _setTransposeChords((prev) => {
            const next = (prev + 11) % 12; // wrap underflow
            setCookie('transposeChords', String(next));
            return next;
        });
    };

    return (
        <ConfigContext.Provider
            value={{
                fontSize,
                viewMode,
                videoDisplay,
                showChords,
                transposeChords,
                showTracedLine,
                setFontSize,
                toggleVideoDisplay,
                toggleShowChords,
                incrementTranspose,
                decrementTranspose,
                setViewMode,
                toggleShowTracedLine,
            }
            }
        >
            {children}
        </ConfigContext.Provider>
    );
}

// 5) Custom hook for easy access
export function useConfig() {
    return useContext(ConfigContext);
}
