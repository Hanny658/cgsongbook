"use client"

// /app/config/settings.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import {
    DEFAULTS,
    FONT_SCALE,
    type ConfigValues,
    type FontSize,
    type ViewMode,
    type TrackMode,
} from './settings-shared';

// 1) Setting types & defaults live in settings-shared.ts (also used by the server layout)
export { FONT_SIZES, VIEW_MODES, TRACK_MODES } from './settings-shared';
export type { FontSize, ViewMode, TrackMode } from './settings-shared';

interface ConfigContextType extends ConfigValues {
    setFontSize: (size: FontSize) => void;
    toggleVideoDisplay: () => void;
    toggleShowChords: () => void;
    incrementTranspose: () => void;
    decrementTranspose: () => void;
    setViewMode: (mode: ViewMode) => void;
    setTrackMode: (mode: TrackMode) => void;
}

const COOKIE_AGE_DAYS = 365;

// 2) Cookie helper (browser-only); reading happens on the server, in layout.tsx
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
    setTrackMode: () => { },
});

// 4) Provider component
//    `initial` is parsed from the request cookies by the server layout, so the
//    first render already uses the visitor's settings (no flash of defaults).
export function ConfigProvider({
    children,
    initial = DEFAULTS,
}: {
    children: ReactNode;
    initial?: ConfigValues;
}) {
    // state hooks
    const [fontSize, _setFontSize] = useState<FontSize>(initial.fontSize);
    const [videoDisplay, _setVideoDisplay] = useState<boolean>(initial.videoDisplay);
    const [showChords, _setShowChords] = useState<boolean>(initial.showChords);
    const [transposeChords, _setTransposeChords] = useState<number>(initial.transposeChords);
    const [viewMode, _setViewMode] = useState<ViewMode>(initial.viewMode);
    const [trackMode, _setTrackMode] = useState<TrackMode>(initial.trackMode);

    // Change root em based on font size
    useEffect(() => {
        document.documentElement.style.fontSize = FONT_SCALE[fontSize]
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
        const next = !videoDisplay;
        _setVideoDisplay(next);
        setCookie('videoDisplay', String(next));
    };
    const toggleShowChords = () => {
        const next = !showChords;
        _setShowChords(next);
        setCookie('showChords', String(next));
    };
    const setTrackMode = (mode: TrackMode) => {
        _setTrackMode(mode);
        setCookie('trackMode', mode)
    };
    const incrementTranspose = () => {
        const next = (transposeChords + 1) % 12;
        _setTransposeChords(next);
        setCookie('transposeChords', String(next));
    };
    const decrementTranspose = () => {
        const next = (transposeChords + 11) % 12; // wrap underflow
        _setTransposeChords(next);
        setCookie('transposeChords', String(next));
    };

    return (
        <ConfigContext.Provider
            value={{
                fontSize,
                viewMode,
                videoDisplay,
                showChords,
                transposeChords,
                trackMode,
                setFontSize,
                toggleVideoDisplay,
                toggleShowChords,
                incrementTranspose,
                decrementTranspose,
                setViewMode,
                setTrackMode,
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
