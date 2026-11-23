'use client'

// app/tracing/use-lyric-tracing.ts
//
// React side of lyric tracing: microphone + Azure speech recognition → LyricTracker → active line.
// The speech SDK is only downloaded when tracing is actually started.
import { useCallback, useEffect, useRef, useState } from 'react'
import type * as SpeechSDKTypes from 'microsoft-cognitiveservices-speech-sdk'
import { LyricTracker, type TrackLine } from './lyric-tracker'
import type { TrackMode } from '../configs/settings-shared'

const DEBUG_MODE = false

/** Azure tokens live for 10 minutes; refresh a little earlier */
const TOKEN_REFRESH_MS = 8 * 60 * 1000
/** Shorter pauses end a phrase, so results are finalized sooner while singing */
const SEGMENTATION_SILENCE_MS = '500'
/** Azure accepts a limited number of phrase hints */
const MAX_PHRASES = 200

interface SpeechToken {
    token: string
    region: string
    language: string
}

async function fetchSpeechToken(): Promise<SpeechToken> {
    const res = await fetch('/api/speech-token', { cache: 'no-store' })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok || !payload.token) {
        throw new Error(payload.error || 'Could not start speech recognition')
    }
    return payload as SpeechToken
}

export interface LyricTracing {
    /** True while tracing is on (listening, or stepping manually) */
    tracking: boolean
    /** True while the microphone / recognizer is being set up */
    starting: boolean
    /** Id of the line to highlight / scroll to */
    activeLine: string | null
    /** Last problem (microphone refused, not configured, …), or null */
    error: string | null
    toggle: () => void
    /** Manual mode: move the highlight by n lines (may be negative) */
    step: (lines: number) => void
    /** Sync to a line (tap on it); works in every mode */
    jumpTo: (lineId: string) => void
    dismissError: () => void
}

/**
 * @param lines     – the sung lines in display order, each with a unique id
 * @param trackMode – 'Manual' steps by hand; anything else listens through the microphone
 */
export function useLyricTracing(lines: TrackLine[], trackMode: TrackMode): LyricTracing {
    const [tracking, setTracking] = useState(false)
    const [starting, setStarting] = useState(false)
    const [activeLine, setActiveLine] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const trackerRef = useRef<LyricTracker | null>(null)
    const recognizerRef = useRef<SpeechSDKTypes.SpeechRecognizer | null>(null)
    const refreshTimerRef = useRef<number | null>(null)
    const manualIndexRef = useRef(0)
    // Identifies the current start(); a stale async start() sees a different value and backs off
    const sessionRef = useRef(0)

    const isManual = trackMode === 'Manual'

    // —— Release the microphone and the recognizer ——
    const releaseRecognizer = useCallback(() => {
        sessionRef.current++
        if (refreshTimerRef.current !== null) {
            window.clearInterval(refreshTimerRef.current)
            refreshTimerRef.current = null
        }
        const recognizer = recognizerRef.current
        recognizerRef.current = null
        if (recognizer) {
            const close = () => {
                try { recognizer.close() } catch { /* already closed */ }
            }
            recognizer.stopContinuousRecognitionAsync(close, close)
        }
    }, [])

    const stop = useCallback(() => {
        releaseRecognizer()
        trackerRef.current = null
        setTracking(false)
        setStarting(false)
        setActiveLine(null)
    }, [releaseRecognizer])

    // —— Start listening ——
    const startListening = useCallback(async () => {
        const session = ++sessionRef.current
        const isCurrent = () => sessionRef.current === session
        const fail = (message: string) => {
            if (!isCurrent()) return
            stop()
            setError(message)
        }

        setStarting(true)
        try {
            // The token and the (large) SDK are fetched in parallel, only now that they are needed
            const [speech, SpeechSDK] = await Promise.all([
                fetchSpeechToken(),
                import('microsoft-cognitiveservices-speech-sdk'),
            ])
            if (!isCurrent()) return

            const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(speech.token, speech.region)
            speechConfig.speechRecognitionLanguage = speech.language
            speechConfig.setProperty(
                SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs,
                SEGMENTATION_SILENCE_MS
            )
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)

            // Tell the recognizer which words to expect: the lyrics themselves
            try {
                const phrases = [...new Set(lines.map(line => line.text.trim()).filter(Boolean))]
                SpeechSDK.PhraseListGrammar.fromRecognizer(recognizer).addPhrases(phrases.slice(0, MAX_PHRASES))
            } catch (e) {
                console.warn('Phrase hints are not available:', e)
            }

            const tracker = trackerRef.current
            const onResult = (text: string, isFinal: boolean) => {
                if (!isCurrent() || !tracker || !text.trim()) return
                if (DEBUG_MODE) console.log(isFinal ? 'final:  ' : 'interim:', text)
                if (tracker.feed(text, isFinal)) {
                    if (DEBUG_MODE) console.log('→ line', tracker.activeLineId)
                    setActiveLine(tracker.activeLineId)
                }
            }

            recognizer.recognizing = (_sender, event) => onResult(event.result.text, false)
            recognizer.recognized = (_sender, event) => {
                if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    onResult(event.result.text, true)
                }
            }
            recognizer.canceled = (_sender, event) => {
                if (event.reason === SpeechSDK.CancellationReason.Error) {
                    console.error('Speech recognition canceled:', event.errorDetails)
                    fail('Speech recognition stopped unexpectedly. Please try again.')
                }
            }

            recognizerRef.current = recognizer
            recognizer.startContinuousRecognitionAsync(
                () => {
                    if (!isCurrent()) return
                    setStarting(false)
                    // keep the authorization fresh for long sessions
                    refreshTimerRef.current = window.setInterval(async () => {
                        try {
                            const fresh = await fetchSpeechToken()
                            if (isCurrent() && recognizerRef.current) {
                                recognizerRef.current.authorizationToken = fresh.token
                            }
                        } catch (e) {
                            console.warn('Could not refresh the speech token:', e)
                        }
                    }, TOKEN_REFRESH_MS)
                },
                (message) => {
                    console.error('Could not start speech recognition:', message)
                    fail('Could not use the microphone. Please allow microphone access and try again.')
                }
            )
        } catch (e) {
            console.error(e)
            fail(e instanceof Error ? e.message : 'Could not start speech recognition')
        }
    }, [lines, stop])

    // —— Start / stop button ——
    const toggle = useCallback(() => {
        if (tracking) {
            stop()
            return
        }
        if (lines.length === 0) {
            setError('This song has no lyrics to trace.')
            return
        }

        setError(null)
        setTracking(true)
        if (isManual) {
            manualIndexRef.current = 0
            setActiveLine(lines[0].id)
        } else {
            const tracker = new LyricTracker(lines)
            trackerRef.current = tracker
            setActiveLine(tracker.activeLineId)
            void startListening()
        }
    }, [tracking, lines, isManual, stop, startListening])

    // —— Manual stepping ——
    const step = useCallback((count: number) => {
        if (!tracking || !isManual || count === 0 || lines.length === 0) return
        const next = Math.min(Math.max(manualIndexRef.current + count, 0), lines.length - 1)
        manualIndexRef.current = next
        setActiveLine(lines[next].id)
    }, [tracking, isManual, lines])

    // —— Sync to a tapped line ——
    const jumpTo = useCallback((lineId: string) => {
        if (!tracking) return
        const index = lines.findIndex(line => line.id === lineId)
        if (index < 0) return
        manualIndexRef.current = index
        trackerRef.current?.jumpToLine(index)
        setActiveLine(lineId)
    }, [tracking, lines])

    // —— Never keep the microphone open behind the user's back ——
    // (leaving the page, another song, or switching the tracing mode in the settings)
    useEffect(() => {
        return () => releaseRecognizer()
    }, [releaseRecognizer])

    useEffect(() => {
        stop()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lines, trackMode])

    const dismissError = useCallback(() => setError(null), [])

    return { tracking, starting, activeLine, error, toggle, step, jumpTo, dismissError }
}
