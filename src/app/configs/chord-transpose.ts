// app/configs/chord-transpose.ts

// 1) The 12 semitones, in “sharp” form.
//    We’ll normalize any flats into these.
const NOTE_LIST = [
    'C', 'C#', 'D', 'D#', 'E', 'F',
    'F#', 'G', 'G#', 'A', 'A#', 'B',
];

// 2) Map flats → their enharmonic sharps
const FLAT_MAP: Record<string, string> = {
    Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#',
};

/**
 * Shift a single root note by N semitones.
 *
 * @param root     – e.g. "C", "F#", "Eb"
 * @param semitones – integer (can be negative; wraps mod 12)
 * @returns new root, always in sharp form (e.g. "D#", "G", etc.)
 */
function shiftNote(root: string, semitones: number): string {
    // 2a) normalize flat→sharp
    if (root.endsWith('b')) {
        root = FLAT_MAP[root] || root;
    }
    // 2b) find index in NOTE_LIST
    const i = NOTE_LIST.indexOf(root.toUpperCase());
    if (i === -1) return root; // unrecognized root: passthrough

    // 2c) compute new index (mod 12)
    const newIndex = (i + semitones + 12 * 100) % 12;
    return NOTE_LIST[newIndex];
}

/**
 * Transpose **every** chord in a line of text.
 * 
 * It looks for:  
 *   ►  A root note:   [A–G] + optional # or b  
 *   ►  A suffix:       any non-whitespace chars following it  
 * 
 * Everything else (spaces, punctuation, lyrics) is left intact.
 *
 * @param chordLine – e.g. "  C   G Am7 | F  D/F#"
 * @param semitones – how many semitones to shift (0–11)
 * @returns            transposed string, same spacing/punctuation preserved
 */
export function transposeChordString(
    chordLine: string,
    semitones: number
): string {
    if (semitones === 0) return chordLine // Return if no transpose
    if (!chordLine || chordLine=='') return chordLine // Return if no chordLine provided
    // Regex breakdown:
    //  ([A-G](?:#|b)?)   → capture root: A–G plus optional # or b
    //  ([^\s]*)          → capture suffix: zero-or-more non-whitespace chars
    const new_chords = chordLine.replace(
        /([A-G](?:#|b)?)([^\s]*)(\s*)/g,
        (_match, root, suffix, followingSpaces) => {
            const newRoot = shiftNote(root, semitones);
            const delta = newRoot.length - root.length + 1;
            let spaces = followingSpaces;
            // if our new root grew, drop exactly `delta` spaces to compensate
            if (delta > 0 && spaces.length >= delta) {
                spaces = spaces.slice(delta);
            }
            return newRoot + suffix + spaces;
        }
    )
    return new_chords;
}
