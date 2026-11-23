// app/configs/chord-transpose.ts

// 1) The 12 semitones, in “sharp” form.
//    We’ll normalize any flats into these.
const NOTE_LIST = [
    'C', 'C#', 'D', 'D#', 'E', 'F',
    'F#', 'G', 'G#', 'A', 'A#', 'B',
];

// 2) Map flats → their enharmonic sharps
const FLAT_MAP: Record<string, string> = {
    Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E',
};

// 3) What a chord token looks like:
//    optional opening punctuation, root, quality/extension, optional /bass, optional closing punctuation
//    e.g. "C", "F#m7", "Bbmaj7", "Gsus4", "D/F#", "(Am7)", "E7#9"
const CHORD_TOKEN =
    /^([(\[|]*)([A-G][#b]?)((?:maj|min|dim|aug|sus|add|m|M|[0-9#b+\-°ø()])*)(?:\/([A-G][#b]?))?([)\]|,.]*)$/;

/**
 * Shift a single root note by N semitones.
 *
 * @param root     – e.g. "C", "F#", "Eb"
 * @param semitones – integer (can be negative; wraps mod 12)
 * @returns new root, always in sharp form (e.g. "D#", "G", etc.)
 */
export function shiftNote(root: string, semitones: number): string {
    // 3a) normalize flat→sharp
    const normalized = FLAT_MAP[root] ?? root;
    // 3b) find index in NOTE_LIST
    const i = NOTE_LIST.indexOf(normalized.toUpperCase());
    if (i === -1) return root; // unrecognized root: passthrough

    // 3c) compute new index (mod 12)
    const newIndex = (((i + semitones) % 12) + 12) % 12;
    return NOTE_LIST[newIndex];
}

/** Transpose one whitespace-free token; anything that is not a chord is returned untouched. */
function transposeToken(token: string, semitones: number): string {
    const match = CHORD_TOKEN.exec(token);
    if (!match) return token;

    const [, open, root, quality, bass, close] = match;
    return (
        open +
        shiftNote(root, semitones) +
        quality +
        (bass ? '/' + shiftNote(bass, semitones) : '') +
        close
    );
}

/**
 * Transpose **every** chord in a line of text.
 *
 * The line is split into chord tokens and the whitespace between them.
 * Each chord (root and slash-bass) is shifted, and the following whitespace
 * is shrunk or grown so every chord stays above the same lyric column.
 * Tokens that are not chords ("|", "N.C.", "x2", ...) are left intact.
 *
 * @param chordLine – e.g. "  C   G Am7 | F  D/F#"
 * @param semitones – how many semitones to shift (0–11)
 * @returns            transposed string, chord columns preserved where possible
 */
export function transposeChordString(
    chordLine: string,
    semitones: number
): string {
    if (!chordLine || semitones % 12 === 0) return chordLine // Nothing to transpose

    const parts = chordLine.match(/\s+|\S+/g) ?? [];
    let drift = 0; // how many columns the output currently runs ahead (+) of the original
    let result = '';

    parts.forEach((part, idx) => {
        if (/^\s/.test(part)) {
            let width = part.length - drift;
            // always keep one space between two tokens so chords never merge
            const isBetweenTokens = idx > 0 && idx < parts.length - 1;
            if (isBetweenTokens && width < 1) width = 1;
            if (width < 0) width = 0;
            drift += width - part.length;
            result += ' '.repeat(width);
        } else {
            const transposed = transposeToken(part, semitones);
            drift += transposed.length - part.length;
            result += transposed;
        }
    });

    return result;
}
