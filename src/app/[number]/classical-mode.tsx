'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import SettingsButton from '../configs/settings-button'
import { useConfig } from '../configs/settings'
import { transposeChordString } from '../configs/chord-transpose'
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import Fuse from 'fuse.js'
import LoadingIndicator from '../utils/loading-indicator'

type SongLine = { chords: string; lyrics: string }
type SongSection = { id: string; label: string; lines: SongLine[] }
type SongData = {
    title: string
    link?: string
    number: number
    lyrics: SongSection[]
    song: string[]
}

const DEBUG_MODE = false

const bgImages = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg',
    '7.jpg', '8.jpg', '9.webp', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.webp',
    '15.jpg', '16.jpg', '17.jpg', '18.jpg', '19.jpg', '20.jpg', '21.jpg', '22.jpg',
    '23.jpg', '25.webp', '24.jpg', '26.jpg']

export default function SongLyricsPage({ number }: { number: string | number }) {
    const [song, setSong] = useState<SongData | null>(null)
    const { videoDisplay, showChords, transposeChords } = useConfig()

    // recognizer instance
    const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null)
    // pointers into flatLyrics
    const currentIndexRef = useRef<number>(-1)
    const maxIndexRef = useRef<number>(0)
    const interimMatchedRef = useRef(false)
    const [tracking, setTracking] = useState(false)
    const [activeLine, setActiveLine] = useState<string | null>(null)

    // —— FLATTEN LYRICS WITH UNIQUE IDS ——
    const flatLyrics = useMemo(() => {
        if (!song) return []
        const entries: { id: string; text: string }[] = []
        const sectionMap = Object.fromEntries(song.lyrics.map(sec => [sec.id, sec]))
        song.song.forEach((secId, secOrder) => {
            const sec = sectionMap[secId]
            sec.lines.forEach((line, lineIdx) => {
                const txt = line.lyrics.trim()
                if (txt) entries.push({ id: `${secId}-${secOrder}-${lineIdx}`, text: txt })
            })
        })
        return entries
    }, [song])

    // —— SETUP FUSE.JS ——  re-create the Fuse index whenever flatLyrics changes
    const fuseRef = useRef<Fuse<{ id: string; text: string }> | null>(null)
    useEffect(() => {
        if (flatLyrics.length > 0) {
            fuseRef.current = new Fuse(flatLyrics, {
                keys: ['text'],
                threshold: 0.3,         // 0.0 = exact, 1.0 = very fuzzyyyyyyyy
                includeScore: true,
            })
        }
    }, [flatLyrics])

    useEffect(() => {
        if (activeLine) scrollToLine(activeLine);
    }, [activeLine]);

    // —— FETCH SONG DATA ——
    useEffect(() => {
        fetch(`/api/songs/${number}`)
            .then(r => r.json())
            .then(setSong)
            .catch(() => console.error('Failed to load song'))
    }, [number])

    // —— SCROLL HELPER ——
    const scrollToLine = (lineId: string) => {
        const el = document.getElementById(lineId)
        if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
    }

    // —— START AZURE RECOGNITION ——
    const startRecognition = () => {
        if (!flatLyrics.length) {
            alert('Please wait for lyrics to load before starting trace.')
            return
        }

        const key = process.env.NEXT_PUBLIC_STT_KEY!
        const region = process.env.NEXT_PUBLIC_STT_REGION!
        if (!key || !region) {
            alert('Azure Speech key/region not configured.')
            return
        }

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key, region)
        speechConfig.speechRecognitionLanguage = 'en-US'
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)

        currentIndexRef.current = -1
        maxIndexRef.current = 0

        // STREAM MODE: match exactly the *next* line to advance immediately
        recognizer.recognizing = (_s, e) => {
            const partial = e.result.text.trim()
            if (!partial) return
            if (DEBUG_MODE) console.log('partial: ', partial)
            const nextIdx = currentIndexRef.current + 1
            if (nextIdx >= flatLyrics.length) return
            const nextText = flatLyrics[nextIdx].text
            const fuse = new Fuse([{ text: nextText }], { keys: ['text'], threshold: 0.3 })
            if (fuse.search(partial).length) {
                interimMatchedRef.current = true
                currentIndexRef.current = nextIdx
                setActiveLine(flatLyrics[nextIdx].id)
            }
        }

        // deprecated method becomes fallback, if missed out with stream mode this will be helpful
        // (Or I just want to keep my 3-line window method that took me time to design)
        recognizer.recognized = (_s, e) => {
            // if interim already matched, skip this final result
            if (interimMatchedRef.current) {
                interimMatchedRef.current = false
                return
            }
            const transcript = e.result.text.trim()
            if (!transcript) return
            if (DEBUG_MODE) console.log('Transcript:', transcript)

            // FIRST match: full‐song Fuse search, then highlight the *next* line instead of the matched one
            if (currentIndexRef.current < 0) {
                const fuse = fuseRef.current!
                const results = fuse.search(transcript)
                if (results.length === 0) return

                const matchedId = results[0].item.id
                const matchedIdx = flatLyrics.findIndex(f => f.id === matchedId)
                if (matchedIdx < 0) return

                // advance to the line after the one matched
                const nextIdx = Math.min(matchedIdx + 1, flatLyrics.length - 1)
                currentIndexRef.current = nextIdx
                setActiveLine(flatLyrics[nextIdx].id)
                if (DEBUG_MODE) console.log('Initial match advanced to', nextIdx, flatLyrics[nextIdx].id)
                return
            }

            // Otherwise only look in the next 3 lines
            const start = currentIndexRef.current;
            const end = Math.min(start + 3, flatLyrics.length - 1);
            const candidates = flatLyrics.slice(start, end + 1);

            if (candidates.length === 0) {
                console.warn('No more lines to trace.')
                return
            }

            // build a tiny Fuse over those three
            const smallFuse = new Fuse(candidates, {
                keys: ['text'],
                threshold: 0.3,
            })
            const smallResults = smallFuse.search(transcript)
            if (smallResults.length === 0) return

            // whichever line matched, highlight the *next* one
            const matchedId = smallResults[0].item.id
            const matchedIdx = flatLyrics.findIndex(f => f.id === matchedId)
            const nextIdx = Math.min(matchedIdx + 1, flatLyrics.length - 1)

            currentIndexRef.current = nextIdx
            setActiveLine(flatLyrics[nextIdx].id)
            if (DEBUG_MODE) console.log('Advanced to', nextIdx, flatLyrics[nextIdx].id)
        }

        recognizer.canceled = () => { stopRecognition(); setTracking(false) }
        recognizer.sessionStopped = () => {
            recognizer.stopContinuousRecognitionAsync()
            recognizerRef.current = null
        }

        recognizerRef.current = recognizer
        recognizer.startContinuousRecognitionAsync()
    }

    // —— STOP AZURE RECOGNITION ——
    const stopRecognition = () => {
        if (recognizerRef.current) {
            recognizerRef.current.stopContinuousRecognitionAsync()
            recognizerRef.current = null
        }
        currentIndexRef.current = -1
        maxIndexRef.current = 0
    }

    // —— TOGGLE BUTTON ——
    const toggleTracking = () => {
        if (!tracking) {
            if (flatLyrics.length > 0) {
                // keep -1 so the first STT result still does a full search
                currentIndexRef.current = -1;
                setActiveLine(flatLyrics[0].id);
            }
            startRecognition()
        } else {
            stopRecognition()
            setActiveLine(null)
        }
        setTracking(x => !x)
    }

    // —— RANDOM BACKGROUND ——
    const [bgUrl, setBgUrl] = useState('')
    useEffect(() => {
        const idx = Math.floor(Math.random() * bgImages.length)
        setBgUrl(`/sbg/${bgImages[idx]}`)
    }, [])

    if (!song) {
        return <div
                role="status"
                className="flex flex-col items-center justify-center h-screen bg-black/80"
                >
                    <LoadingIndicator />
                    <p className="mt-2 text-white">Loading Lyrics…</p>
                </div>
    }

    // prepare section map & video ID
    const sectionMap = Object.fromEntries(song.lyrics.map(sec => [sec.id, sec]))
    const videoId =
        song.link?.split('v=')[1]?.split('&')[0] ||
        song.link?.split('youtu.be/')[1] ||
        ''

    return (
        <div className="relative w-full overflow-hidden">
            <div
                className="fixed inset-0 bg-cover bg-center -z-10"
                style={{ backgroundImage: `url(${bgUrl})` }}
            />
            <div className="flex flex-col min-h-screen bg-black/55 text-gray-900">
                <Head>
                    <title>Songbook – {song.title}</title>
                </Head>

                <header className="flex items-center justify-between bg-black/70 px-6 py-4 text-white">
                    <div className="flex items-center space-x-4">
                        <SettingsButton />
                        <h1 className="text-xl font-semibold">
                            {song.number}. {song.title}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleTracking}
                            className={`text-xs rounded-md border px-2 py-1 min-w-24 
                                ${tracking
                                ? 'bg-orange-500/70 md:bg-orange-500 border-orange-600 text-white fixed bottom-8 right-4 md:bottom-auto md:top-6 md:right-14'
                                : 'bg-blue-200/70 md:bg-blue-200 border-gray-300 text-black fixed bottom-8 right-4 md:static md:block'
                                }`}
                        >
                            {tracking ? <i className="bi bi-disc-fill"> Trace Stop</i> 
                                    : <i className="bi bi-disc"> Lyric-Trace</i>}
                        </button>
                        <Link href="/">
                            <i className="bi bi-house-door-fill text-3xl text-white hover:text-amber-100" />
                        </Link>
                    </div>
                </header>

                <main className="space-y-8 pl-4">
                    {videoDisplay && videoId && (
                        <div className="mx-auto w-full max-w-md p-2">
                            <div className="aspect-w-16 aspect-h-9">
                                <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="h-64 w-full rounded-lg shadow-md"
                                />
                            </div>
                        </div>
                    )}

                    <h2 className="my-4 text-center text-3xl font-bold text-white">
                        {song.title}
                    </h2>

                    {song.song.map((secId, secIdx) => {
                        const sec = sectionMap[secId]
                        if (!sec) return null
                        return (
                            <div
                                key={secIdx}
                                className="flex flex-col border-l-4 border-blue-600 pl-4 md:flex-row md:space-x-8 md:pl-6"
                            >
                                <div className="mb-2 w-full font-semibold text-blue-400 md:mb-0 md:w-48 md:text-xl">
                                    {sec.label}
                                </div>
                                <div className="flex-grow space-y-2">
                                    {sec.lines.map((line, lineIdx) => {
                                        const lineId = `${sec.id}-${secIdx}-${lineIdx}`
                                        const isActive = lineId === activeLine
                                        return (
                                            <div
                                                key={lineIdx}
                                                id={lineId}
                                                className={`overflow-x-auto ${isActive ? 'bg-amber-100/20 pl-1 rounded-md' : 'pl-1'
                                                    }`}
                                            >
                                                {showChords && (
                                                    <p className="whitespace-pre text-shadow-2xs text-base font-chords md:text-xl lg:text-2xl text-blue-400 text-shadow-blue-100/40">
                                                        {transposeChordString(
                                                            line.chords ?? '',
                                                            transposeChords
                                                        )}
                                                    </p>
                                                )}
                                                <p className="text-base font-chords md:text-xl lg:text-2xl text-white">
                                                    {line.lyrics}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </main>
            </div>
        </div>
    )
}
