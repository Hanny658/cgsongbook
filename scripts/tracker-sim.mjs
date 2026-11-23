// Simulated recognition streams against the lyric tracker.
// Run after changing the tunables in src/app/tracing/lyric-tracker.ts:
//   node scripts/tracker-sim.mjs        (Node 22.18+ / 24, which runs TypeScript files directly)
const { LyricTracker } = await import('../src/app/tracing/lyric-tracker.ts')

const SONG = [
    /* 0 */ 'Amazing grace how sweet the sound',
    /* 1 */ 'That saved a wretch like me',
    /* 2 */ 'I once was lost, but now am found',
    /* 3 */ 'Was blind but now I see',
    /* 4 */ '(Chorus x2)',
    /* 5 */ 'My chains are gone, I\'ve been set free',
    /* 6 */ 'My God, my Savior has ransomed me',
    /* 7 */ 'And like a flood His mercy reigns',
    /* 8 */ 'Unending love, amazing grace',
    /* 9 */ '\'Twas grace that taught my heart to fear',
    /* 10 */ 'And grace my fears relieved',
    /* 11 */ 'How precious did that grace appear',
    /* 12 */ 'The hour I first believed',
    /* 13 */ 'My chains are gone, I\'ve been set free',
    /* 14 */ 'My God, my Savior has ransomed me',
    /* 15 */ 'And like a flood His mercy reigns',
    /* 16 */ 'Unending love, amazing grace',
    /* 17 */ 'Holy holy holy',
    /* 18 */ 'Holy holy holy',
    /* 19 */ 'Hallelujah',
    /* 20 */ 'Lord God Almighty',
]
const lines = SONG.map((text, i) => ({ id: String(i), text }))
const make = () => new LyricTracker(lines)

let failures = 0
const check = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected)
    if (!ok) failures++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        got      ${JSON.stringify(actual)}\n        expected ${JSON.stringify(expected)}`}`)
}

/** Feed an utterance word by word as cumulative interim results, then as a final. Returns active line after each word. */
function sing(tracker, utterance, { final = true } = {}) {
    const words = utterance.split(/\s+/)
    const seen = []
    for (let k = 1; k <= words.length; k++) {
        tracker.feed(words.slice(0, k).join(' '), false)
        seen.push(tracker.activeLine)
    }
    if (final) tracker.feed(utterance, true)
    return seen
}

// 1. Clean, continuous singing; one long utterance (no pauses) across four lines
{
    const t = make()
    const seen = sing(t, 'amazing grace how sweet the sound that saved a wretch like me I once was lost but now am found was blind but now I see')
    // line 0 has 6 words: highlight moves to 1 once 5 of 6 are heard, etc.
    check('continuous singing follows every line', [...new Set(seen)], [0, 1, 2, 3, 5])
    check('  … and never goes backwards', seen.every((v, i) => i === 0 || v >= seen[i - 1]), true)
}

// 2. Single common words must not advance
{
    const t = make()
    sing(t, 'amazing grace how sweet')
    const before = t.activeLine
    for (const w of ['that', 'a', 'me', 'I', 'was', 'now', 'the', 'and']) t.feed(w, true)
    check('isolated common words do not move the highlight', [before, t.activeLine], [0, 0])
}

// 3. Mis-heard, dropped and extra words
{
    const t = make()
    sing(t, 'amazing race how sweet sound')            // "grace"→"race", "the" dropped
    check('noisy line 0 still reaches line 1', t.activeLine, 1)
    sing(t, 'dat save the rich like me')                 // heavily mis-heard line 1
    check('half of line 1 mis-heard: holds on line 1 instead of guessing', t.activeLine, 1)
    sing(t, 'um I once was lost yeah but now am found')  // extra words
    check('… and catches up on the next line, extra words tolerated', t.activeLine, 3)
}

// 4. Recognizer misses a whole line, singer is two lines further
{
    const t = make()
    sing(t, 'amazing grace how sweet the sound')
    sing(t, 'I once was lost but now am found')          // line 1 never recognized
    check('recovers after a missed line', t.activeLine, 3)
}

// 5. Repeated section: verse → chorus → verse 2 → chorus again
{
    const t = make()
    sing(t, 'was blind but now I see')                   // start in the middle of the song
    check('can start mid-song', t.activeLine, 5)
    sing(t, 'my chains are gone I have been set free')
    check('first chorus, line 1', t.activeLine, 6)
    sing(t, 'my god my savior has ransomed me and like a flood his mercy reigns unending love amazing grace')
    check('end of first chorus moves on to verse 2 (not back to line 0)', t.activeLine, 9)
    sing(t, 'twas grace that taught my heart to fear and grace my fears relieved how precious did that grace appear the hour I first believed')
    check('verse 2 done → second chorus', t.activeLine, 13)
    sing(t, 'my chains are gone I\'ve been set free')
    check('second chorus is tracked as the second one', t.activeLine, 14)
}

// 6. Leader jumps back and repeats the chorus
{
    const t = make()
    t.jumpToLine(16)
    sing(t, 'unending love amazing grace')
    check('at the end of the second chorus', t.activeLine, 17)
    sing(t, 'my chains are gone I\'ve been set free')
    check('jump back to the nearest chorus when it is repeated', t.activeLine, 14)
}

// 7. The same line twice in a row, then a one-word line
{
    const t = make()
    t.jumpToLine(17)
    const first = sing(t, 'holy holy holy')
    check('first "holy holy holy" → second one', first[first.length - 1], 18)
    const second = sing(t, 'holy holy holy')
    check('second "holy holy holy" → Hallelujah', second[second.length - 1], 19)
    sing(t, 'hallelujah')
    check('one-word line advances', t.activeLine, 20)
}

// 8. Interim results get revised by the recognizer
{
    const t = make()
    for (const partial of ['a', 'a maze', 'amazing', 'amazing grey', 'amazing grace', 'amazing grace how', 'amazing grace house wheat', 'amazing grace how sweet the', 'amazing grace how sweet the sound']) t.feed(partial, false)
    t.feed('Amazing grace, how sweet the sound.', true)
    check('revised interim results', t.activeLine, 1)
}

// 9. Unrelated speech (announcements between songs) must not move anything
{
    const t = make()
    sing(t, 'amazing grace how sweet the sound')
    const before = t.activeLine
    sing(t, 'good morning everyone please stand and turn to your neighbour and say hello')
    sing(t, 'we are going to sing the next song together now')
    check('unrelated speech is ignored', [before, t.activeLine], [1, 1])
}

// 10. Manual sync by tapping a line
{
    const t = make()
    sing(t, 'amazing grace how sweet the sound')
    t.jumpToLine(11)
    check('tap a line → that line is active', t.activeLine, 11)
    sing(t, 'how precious did that grace appear')
    check('… and tracking continues from there', t.activeLine, 12)
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed')
process.exit(failures ? 1 : 0)
