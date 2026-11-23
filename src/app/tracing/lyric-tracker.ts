// app/tracing/lyric-tracker.ts
//
// Follows a singer through known lyrics from a stream of (imperfect) speech-to-text results.
//
// Pure logic: no React, no speech SDK, so it can be tested with simulated transcripts.
//
// How it works
//  1. The lyrics are flattened into one sequence of normalized words.
//  2. Every recognition result is turned into words too. The last few recognized words
//     (the "tail") are aligned against the whole song with a small local-alignment table
//     (matches score, wrong / skipped / extra words cost).
//  3. The pointer (= last lyric word heard) only moves when the alignment gives enough
//     evidence. The further the move, the more evidence is needed:
//       - continuing right after the pointer: any new word that fits in sequence
//       - skipping ahead / going back / jumping to another section: several fresh words
//     Common words ("the", "I", "and") weigh little, so they cannot move the pointer alone.
//  4. The highlighted line is derived from the pointer, moving on to the next line shortly
//     before the current one ends (the recognizer always lags a little behind the singer).

export interface TrackLine {
    /** Any unique id; returned as the active line */
    id: string
    text: string
}

export interface TrackerOptions {
    /** Turns text into comparable words. Defaults to an English / CJK-aware tokenizer. */
    tokenize?: (text: string) => string[]
    /** Words that carry little evidence. Defaults to common English words. */
    stopWords?: ReadonlySet<string>
}

// ———————————————————— Tunables ————————————————————

/** How many of the most recent recognized words are aligned against the lyrics */
const TAIL_WORDS = 8
/** Fraction of a line that must be heard before the highlight moves on to the next line */
const LOOKAHEAD_FRACTION = 0.7

/** Evidence weights of a lyric word */
const WEIGHT_CONTENT = 1
const WEIGHT_FREQUENT = 0.6    // content word that occurs many times in this song
const WEIGHT_STOP = 0.3
const FREQUENT_COUNT = 4

/** A near-miss ("grace" ~ "race") counts for this much of an exact match */
const FUZZY_SIMILARITY = 0.7

/** Alignment costs */
const COST_MISMATCH = 0.6      // recognized word that is a different lyric word
const COST_EXTRA_WORD = 0.4    // recognized word that is not in the lyrics
const skipCost = (weight: number) => 0.15 + 0.2 * weight // lyric word that was not heard

/** How far (in words) from the expected position a move still counts as "continuing" */
const CONTINUE_SPAN = 6
/** Within this many words (either direction) a move is a "near jump", beyond it a "far jump" */
const NEAR_SPAN = 30

/** Preference for positions close to where we expect the singer to be */
const DISTANCE_PENALTY = 0.04
const DISTANCE_PENALTY_MAX = 1.2
/** Going backwards is less likely than going forwards */
const BACKWARD_PENALTY = 0.3

// Evidence needed (whole alignment / the words not used before)
const MIN_TOTAL_SCORE = 1.5
const MIN_TOTAL_MATCHES = 2
const CONTINUE_MIN_NEW_GAIN = 0.25
const NEAR_MIN_NEW_GAIN = 1.5
const NEAR_MIN_NEW_MATCHES = 2
const FAR_MIN_NEW_GAIN = 2.2
const FAR_MIN_NEW_MATCHES = 3

// ———————————————————— Text handling ————————————————————

const ENGLISH_STOP_WORDS: ReadonlySet<string> = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'so', 'for', 'nor', 'yet',
    'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his',
    'she', 'her', 'it', 'its', 'they', 'them', 'their',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'have', 'has', 'had',
    'will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'let',
    'to', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'up', 'as', 'into', 'through',
    'this', 'that', 'these', 'those', 'there', 'here', 'when', 'where', 'who', 'what', 'how',
    'all', 'no', 'not', 'now', 'oh', 'yes', 'if', 'than', 'then',
    'im', 'ive', 'ill', 'youre', 'thats',
])

// Spelling variants the recognizer may produce for the same sung word
const WORD_ALIASES: Record<string, string> = {
    o: 'oh', ooh: 'oh', oooh: 'oh', woah: 'oh', whoa: 'oh',
    alleluia: 'hallelujah', halleluia: 'hallelujah', alleluja: 'hallelujah',
    hosannah: 'hosanna',
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
    til: 'till', cause: 'because', cos: 'because', gonna: 'going', wanna: 'want',
    saviour: 'savior', honour: 'honor',
}

const CJK = /[㐀-鿿豈-﫿぀-ヿ가-힯]/

/**
 * Default tokenizer: lowercase, no punctuation, apostrophes dropped ("we're" → "were").
 * CJK characters become one token each, so other languages can be added later.
 */
export function tokenize(text: string): string[] {
    const words: string[] = []
    const cleaned = text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')      // accents
        .replace(/['’‘`´]/g, '')              // apostrophes join the word
        .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ') // (x2), [repeat] … are directions, not lyrics

    for (const chunk of cleaned.split(/[^\p{L}\p{N}]+/u)) {
        if (!chunk) continue
        if (CJK.test(chunk)) {
            // split into single characters, keeping latin runs together
            for (const part of chunk.match(/[㐀-鿿豈-﫿぀-ヿ가-힯]|[^㐀-鿿豈-﫿぀-ヿ가-힯]+/g) ?? []) {
                words.push(WORD_ALIASES[part] ?? part)
            }
        } else {
            words.push(WORD_ALIASES[chunk] ?? chunk)
        }
    }
    return words
}

/** Edit distance, giving up early (returns max + 1) once it exceeds `max` */
function editDistance(a: string, b: string, max: number): number {
    if (Math.abs(a.length - b.length) > max) return max + 1
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
        const row = [i]
        let best = i
        for (let j = 1; j <= b.length; j++) {
            const value = Math.min(
                prev[j] + 1,
                row[j - 1] + 1,
                prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            )
            row.push(value)
            if (value < best) best = value
        }
        if (best > max) return max + 1
        prev = row
    }
    return prev[b.length]
}

/** 1 = same word, FUZZY_SIMILARITY = close enough to be a mis-hearing, 0 = different */
function similarity(heard: string, lyric: string): number {
    if (heard === lyric) return 1
    const shorter = Math.min(heard.length, lyric.length)
    if (shorter < 4) return 0                 // short words must match exactly
    const allowed = shorter >= 7 ? 2 : 1
    return editDistance(heard, lyric, allowed) <= allowed ? FUZZY_SIMILARITY : 0
}

// ———————————————————— Tracker ————————————————————

interface LyricWord {
    text: string
    line: number        // index into lines
    posInLine: number   // 0-based position among the line's words
    weight: number
}

interface HeardWord {
    text: string
    /** Running index in the stream of everything heard; tells new words from used ones */
    index: number
}

interface Alignment {
    /** Lyric word index where the alignment ends */
    end: number
    /** Stream index of the last recognized word that was matched */
    lastHeardIndex: number
    score: number
    matches: number
    /** Evidence from words that were not used by an earlier move */
    newGain: number
    newMatches: number
}

// Traceback directions
const STOP = 0, DIAGONAL = 1, SKIP_LYRIC = 2, EXTRA_HEARD = 3

export class LyricTracker {
    private readonly lines: TrackLine[]
    private readonly words: LyricWord[] = []
    private readonly lineWordCount: number[]
    private readonly firstWordOfLine: number[]
    private readonly tokenizer: (text: string) => string[]

    /** Index of the last lyric word heard; -1 = nothing yet */
    private pointer = -1
    /** Recognized words of finished utterances that are still useful as context */
    private context: HeardWord[] = []
    /** Number of words in all finished utterances */
    private finishedCount = 0
    /** Length of the current (unfinished) utterance, as last reported */
    private currentLength = 0
    /** Stream index of the last recognized word that has been used for a move */
    private lastUsedIndex = -1

    constructor(lines: TrackLine[], options: TrackerOptions = {}) {
        this.lines = lines
        this.tokenizer = options.tokenize ?? tokenize
        const stopWords = options.stopWords ?? ENGLISH_STOP_WORDS

        const occurrences = new Map<string, number>()
        this.lineWordCount = []
        this.firstWordOfLine = []

        lines.forEach((line, lineIndex) => {
            const tokens = this.tokenizer(line.text)
            this.firstWordOfLine.push(this.words.length)
            this.lineWordCount.push(tokens.length)
            tokens.forEach((text, posInLine) => {
                occurrences.set(text, (occurrences.get(text) ?? 0) + 1)
                this.words.push({ text, line: lineIndex, posInLine, weight: 0 })
            })
        })

        for (const word of this.words) {
            if (stopWords.has(word.text)) word.weight = WEIGHT_STOP
            else if ((occurrences.get(word.text) ?? 0) >= FREQUENT_COUNT) word.weight = WEIGHT_FREQUENT
            else word.weight = WEIGHT_CONTENT
        }
    }

    /** Index (into the lines given to the constructor) of the line to highlight; -1 for an empty song */
    get activeLine(): number {
        if (this.lines.length === 0) return -1
        if (this.pointer < 0) return this.nextLineWithWords(0) ?? 0

        const word = this.words[this.pointer]
        const heardFraction = (word.posInLine + 1) / this.lineWordCount[word.line]
        if (heardFraction >= LOOKAHEAD_FRACTION) {
            return this.nextLineWithWords(word.line + 1) ?? word.line
        }
        return word.line
    }

    get activeLineId(): string | null {
        const index = this.activeLine
        return index < 0 ? null : this.lines[index].id
    }

    /** Manual sync: the singer is (about to be) at the start of this line. */
    jumpToLine(lineIndex: number): void {
        if (lineIndex < 0 || lineIndex >= this.lines.length) return
        this.pointer = this.firstWordOfLine[lineIndex] - 1
        // everything heard so far belongs to before the jump
        this.lastUsedIndex = this.finishedCount + this.currentLength - 1
    }

    /** Start over from the top (or from a given line). */
    reset(lineIndex = 0): void {
        this.context = []
        this.finishedCount = 0
        this.currentLength = 0
        this.lastUsedIndex = -1
        this.pointer = -1
        if (lineIndex > 0) this.jumpToLine(lineIndex)
    }

    /**
     * Feed one recognition result.
     * @param text    – the recognizer's text for the current utterance (interim results are cumulative)
     * @param isFinal – true when the utterance is finished (the next result starts a new one)
     * @returns true when the active line may have changed
     */
    feed(text: string, isFinal: boolean): boolean {
        const tokens = this.tokenizer(text)
        const heard: HeardWord[] = tokens.map((token, i) => ({
            text: token,
            index: this.finishedCount + i,
        }))
        this.currentLength = heard.length

        const before = this.activeLine
        const tail = [...this.context, ...heard].slice(-TAIL_WORDS)
        const hasNewWords = tail.length > 0 && tail[tail.length - 1].index > this.lastUsedIndex
        if (hasNewWords && this.words.length > 0) this.follow(tail)

        if (isFinal) {
            this.finishedCount += heard.length
            this.currentLength = 0
            this.context = [...this.context, ...heard].slice(-TAIL_WORDS)
            // interim results may have been longer than the final one
            this.lastUsedIndex = Math.min(this.lastUsedIndex, this.finishedCount - 1)
        }
        return this.activeLine !== before
    }

    // ———— internals ————

    private nextLineWithWords(from: number): number | null {
        for (let i = from; i < this.lines.length; i++) {
            if (this.lineWordCount[i] > 0) return i
        }
        return null
    }

    /** Align the tail against the lyrics and move the pointer if the evidence allows it. */
    private follow(tail: HeardWord[]): void {
        const m = tail.length
        const n = this.words.length
        const width = n + 1
        const score = new Float32Array((m + 1) * width)
        const trace = new Uint8Array((m + 1) * width)

        for (let i = 1; i <= m; i++) {
            const heard = tail[i - 1].text
            for (let j = 1; j <= n; j++) {
                const lyric = this.words[j - 1]
                const sim = similarity(heard, lyric.text)

                let best = 0
                let direction = STOP

                const diagonal = score[(i - 1) * width + (j - 1)] + (sim > 0 ? lyric.weight * sim : -COST_MISMATCH)
                if (diagonal > best) { best = diagonal; direction = DIAGONAL }

                const skipLyric = score[i * width + (j - 1)] - skipCost(lyric.weight)
                if (skipLyric > best) { best = skipLyric; direction = SKIP_LYRIC }

                const extraHeard = score[(i - 1) * width + j] - COST_EXTRA_WORD
                if (extraHeard > best) { best = extraHeard; direction = EXTRA_HEARD }

                score[i * width + j] = best
                trace[i * width + j] = direction
            }
        }

        // Where we expect the singer to be: one lyric word further per new recognized word
        const newWordCount = tail.filter(word => word.index > this.lastUsedIndex).length
        const expected = this.pointer + newWordCount

        // Candidates: alignments that end on one of the last two recognized words
        // (the very last one is often still being revised by the recognizer)
        const candidates: { i: number; j: number; ranked: number }[] = []
        for (let i = Math.max(1, m - 1); i <= m; i++) {
            if (tail[i - 1].index <= this.lastUsedIndex) continue
            for (let j = 1; j <= n; j++) {
                const value = score[i * width + j]
                if (value < MIN_TOTAL_SCORE || trace[i * width + j] !== DIAGONAL) continue
                // the alignment has to end on a word that was really heard
                if (similarity(tail[i - 1].text, this.words[j - 1].text) === 0) continue
                const position = j - 1
                const distance = Math.abs(position - expected)
                const ranked = value
                    - Math.min(DISTANCE_PENALTY * distance, DISTANCE_PENALTY_MAX)
                    - (position <= this.pointer ? BACKWARD_PENALTY : 0)
                candidates.push({ i, j, ranked })
            }
        }
        candidates.sort((a, b) => b.ranked - a.ranked)

        for (const candidate of candidates.slice(0, 6)) {
            const alignment = this.traceBack(tail, score, trace, width, candidate.i, candidate.j)
            if (this.accepts(alignment, expected)) {
                this.pointer = alignment.end
                this.lastUsedIndex = alignment.lastHeardIndex
                return
            }
        }
    }

    private traceBack(
        tail: HeardWord[],
        score: Float32Array,
        trace: Uint8Array,
        width: number,
        endI: number,
        endJ: number
    ): Alignment {
        const alignment: Alignment = {
            end: endJ - 1,
            lastHeardIndex: tail[endI - 1].index,
            score: score[endI * width + endJ],
            matches: 0,
            newGain: 0,
            newMatches: 0,
        }

        let i = endI
        let j = endJ
        while (i > 0 && j > 0) {
            const direction = trace[i * width + j]
            if (direction === STOP) break

            if (direction === DIAGONAL) {
                const heard = tail[i - 1]
                const lyric = this.words[j - 1]
                const sim = similarity(heard.text, lyric.text)
                const isNew = heard.index > this.lastUsedIndex
                if (sim > 0) {
                    alignment.matches++
                    if (isNew) {
                        alignment.newMatches++
                        alignment.newGain += lyric.weight * sim
                    }
                } else if (isNew) {
                    alignment.newGain -= COST_MISMATCH
                }
                i--; j--
            } else if (direction === SKIP_LYRIC) {
                // lyric words skipped beyond the pointer count against the new evidence
                if (j - 1 > this.pointer) alignment.newGain -= skipCost(this.words[j - 1].weight)
                j--
            } else {
                if (tail[i - 1].index > this.lastUsedIndex) alignment.newGain -= COST_EXTRA_WORD
                i--
            }
        }
        return alignment
    }

    /** The further the move from where we expect to be, the more fresh evidence it needs. */
    private accepts(alignment: Alignment, expected: number): boolean {
        if (alignment.end === this.pointer) return false
        if (alignment.score < MIN_TOTAL_SCORE || alignment.matches < MIN_TOTAL_MATCHES) return false
        if (alignment.newMatches < 1) return false

        const isForward = alignment.end > this.pointer
        const distance = Math.abs(alignment.end - expected)

        if (isForward && distance <= CONTINUE_SPAN) {
            return alignment.newGain >= CONTINUE_MIN_NEW_GAIN
        }
        if (distance <= NEAR_SPAN) {
            return alignment.newMatches >= NEAR_MIN_NEW_MATCHES && alignment.newGain >= NEAR_MIN_NEW_GAIN
        }
        return alignment.newMatches >= FAR_MIN_NEW_MATCHES && alignment.newGain >= FAR_MIN_NEW_GAIN
    }
}
