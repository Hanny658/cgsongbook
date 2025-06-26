"use client"

// /app/config/settings.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';

// 1) Define your types & defaults
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface ConfigContextType {
    fontSize: FontSize;
    videoDisplay: boolean;
    showChords: boolean;
    transposeChords: number;

    setFontSize: (size: FontSize) => void;
    toggleVideoDisplay: () => void;
    toggleShowChords: () => void;
    incrementTranspose: () => void;
    decrementTranspose: () => void;
}

const DEFAULTS = {
    fontSize: 'medium' as FontSize,
    videoDisplay: true,
    showChords: true,
    transposeChords: 0,
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

    // on mount, read cookies (if present)
    useEffect(() => {
        const fs = getCookie('fontSize') as FontSize;
        if (['small', 'medium', 'large', 'extra-large'].includes(fs)) {
            _setFontSize(fs);
        }

        const vd = getCookie('videoDisplay');
        if (vd !== null) {
            _setVideoDisplay(vd === 'true');
        }

        const sc = getCookie('showChords');
        if (sc !== null) {
            _setShowChords(sc === 'true');
        }

        const tc = getCookie('transposeChords');
        const n = tc !== null ? parseInt(tc, 10) : DEFAULTS.transposeChords;
        if (!isNaN(n) && n >= 0 && n <= 11) {
            _setTransposeChords(n);
        }
    }, []);

    // setters that also update cookies
    const setFontSize = (size: FontSize) => {
        _setFontSize(size);
        setCookie('fontSize', size);
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
                videoDisplay,
                showChords,
                transposeChords,
                setFontSize,
                toggleVideoDisplay,
                toggleShowChords,
                incrementTranspose,
                decrementTranspose,
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
