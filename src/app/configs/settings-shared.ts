// app/configs/settings-shared.ts
// Setting types, defaults & cookie parsing shared by the server layout and the client provider.

export type FontSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
export type ViewMode = 'Classic' | 'GACC-Slides';
export type TrackMode = 'Highlight' | 'Scroll' | 'Manual';

export const FONT_SIZES: FontSize[] = ['extra-small', 'small', 'medium', 'large', 'extra-large'];
export const VIEW_MODES: ViewMode[] = ['Classic', 'GACC-Slides'];
export const TRACK_MODES: TrackMode[] = ['Highlight', 'Scroll', 'Manual'];

export interface ConfigValues {
    fontSize: FontSize;
    videoDisplay: boolean;
    showChords: boolean;
    transposeChords: number;
    viewMode: ViewMode;
    trackMode: TrackMode;
}

export const DEFAULTS: ConfigValues = {
    fontSize: 'medium',
    videoDisplay: true,
    showChords: true,
    transposeChords: 0,
    viewMode: 'Classic',
    trackMode: 'Highlight',
};

// Root font-size (rem base) for each font size setting
export const FONT_SCALE: Record<FontSize, string> = {
    'extra-small': '14px',
    small: '17px',
    medium: '20px',
    large: '23px',
    'extra-large': '26px',
};

function oneOf<T extends string>(options: T[], value: string | undefined, fallback: T): T {
    return options.includes(value as T) ? (value as T) : fallback;
}

/**
 * Build the settings from cookie values, falling back to the default for anything missing or invalid.
 * @param get – returns the (decoded) value of a cookie, or undefined
 */
export function parseConfig(get: (name: string) => string | undefined): ConfigValues {
    const videoDisplay = get('videoDisplay');
    const showChords = get('showChords');
    const transpose = parseInt(get('transposeChords') ?? '', 10);

    return {
        fontSize: oneOf(FONT_SIZES, get('fontSize'), DEFAULTS.fontSize),
        viewMode: oneOf(VIEW_MODES, get('viewMode'), DEFAULTS.viewMode),
        trackMode: oneOf(TRACK_MODES, get('trackMode'), DEFAULTS.trackMode),
        videoDisplay: videoDisplay === undefined ? DEFAULTS.videoDisplay : videoDisplay === 'true',
        showChords: showChords === undefined ? DEFAULTS.showChords : showChords === 'true',
        transposeChords: transpose >= 0 && transpose <= 11 ? transpose : DEFAULTS.transposeChords,
    };
}
