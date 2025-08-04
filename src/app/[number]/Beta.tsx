'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import SettingsButton from '../configs/settings-button'
import { useConfig } from '../configs/settings'
import { transposeChordString } from '../configs/chord-transpose'

type SongLine = { chords: string; lyrics: string }
type SongSection = { id: string; label: string; lines: SongLine[] }
type SongData = {
    title: string
    link?: string
    number: number
    lyrics: SongSection[]
    song: string[]
}

const bgImages = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', 
    '7.jpg', '8.jpg', '9.webp', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.webp', 
    '15.jpg', '16.jpg', '17.jpg', '18.jpg', '19.jpg', '20.jpg', '21.jpg', '22.jpg', 
    '23.jpg', '25.webp', '24.jpg', '26.jpg']

export default function SongLyricsPage({ number }: { number: string | number }) {
    const [song, setSong] = useState<SongData | null>(null)
    const { videoDisplay, showChords, transposeChords } = useConfig()

    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const currentIndexRef = useRef<number>(-1)
    
    const maxIndexRef = useRef<number>(0)
    const [tracking, setTracking] = useState(false)
    const [activeLine, setActiveLine] = useState<string | null>(null)

    // flatten lyrics into array for easy indexing
    const flatLyrics: { id: string; text: string }[] = []
    if (song) {
        const sectionMap = Object.fromEntries(
            song.lyrics.map(sec => [sec.id, sec])
        )
        song.song.forEach((secId, secOrder) => {
            const sec = sectionMap[secId]
            sec.lines.forEach((line, lineIdx) => {
                const txt = line.lyrics.trim()
                if (txt) {
                    flatLyrics.push({
                        id: `${secId}-${secOrder}-${lineIdx}`,
                        text: txt,
                    })
                }
            })
        })
    }

    // fetch song data
    useEffect(() => {
        fetch(`/api/songs/${number}`)
            .then(r => r.json())
            .then(setSong)
            .catch(() => console.error('Failed to load song'))
    }, [number])

    const trackingRef = useRef(tracking)
    useEffect(() => {
        trackingRef.current = tracking
    }, [tracking])

    // helper: scroll highlighted line into center
    const scrollToLine = (lineId: string) => {
        const el = document.getElementById(lineId)
        if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
    }

    // start Web Speech recognition
    const startRecognition = () => {
        const SR =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) {
            alert('Speech recognition not supported in this browser.')
            return
        }

        const recog = new SR()
        recog.continuous = true
        recog.interimResults = false
        recog.lang = 'en-US'

        // reset trace pointers
        currentIndexRef.current = -1
        maxIndexRef.current = 0

        recog.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[event.resultIndex][0].transcript.trim()
            if (!transcript) return

            // FIRST match: scan all lyrics
            if (currentIndexRef.current < 0) {
                const idx = flatLyrics.findIndex(f =>
                    f.text.toLowerCase().includes(transcript.toLowerCase())
                )
                if (idx >= 0) {
                    currentIndexRef.current = idx
                    // allow tracing up to 3 lines beyond this
                    maxIndexRef.current = Math.min(idx + 3, flatLyrics.length - 1)
                    setActiveLine(flatLyrics[idx].id)
                    scrollToLine(flatLyrics[idx].id)
                }
                return
            }

            // SUBSEQUENT matches: advance one line at a time
            if (currentIndexRef.current < maxIndexRef.current) {
                currentIndexRef.current += 1
                const next = flatLyrics[currentIndexRef.current]
                setActiveLine(next.id)
                scrollToLine(next.id)
            } else {
                // reached the 3-line limit → stop
                stopRecognition()
                setTracking(false)
            }
        }

        recog.onerror = (ev: SpeechRecognitionErrorEvent) => {
            console.error('recognition error', ev.error, ev.message)
            if (ev.error === 'network' && trackingRef.current) {
                // retry after a short delay if network err
                setTimeout(() => recog.start(), 200)
                return
            }
            stopRecognition()
            setTracking(false)
        }

        recog.onend = () => {
            if (trackingRef.current) {
                // user hasn’t clicked “stop” — restart listening
                recog.start()
            }
            // otherwise do nothing; stopRecognition() will clear recognitionRef
        }

        recognitionRef.current = recog
        recog.start()
    }

    // stop recognition and clear refs
    const stopRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null  // extra guard, prevent onEnd restarts
            recognitionRef.current.stop()
            recognitionRef.current = null
        }
        currentIndexRef.current = -1
        maxIndexRef.current = 0
    }

    // toggle button handler
    const toggleTracking = () => {
        if (!tracking) {
            startRecognition()
        } else {
            stopRecognition()
            setActiveLine(null)
        }
        setTracking(x => !x)
    }

    // choose a random background once
    const [bgUrl, setBgUrl] = useState('')
    useEffect(() => {
        const idx = Math.floor(Math.random() * bgImages.length)
        setBgUrl(`/sbg/${bgImages[idx]}`)
    }, [])

    if (!song) {
        return <div>Loading…</div>
    }

    const sectionMap = Object.fromEntries(
        song.lyrics.map(sec => [sec.id, sec])
    )
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
                            className={`text-xs rounded-md border px-3 py-1 ${tracking
                                    ? 'bg-orange-500 border-orange-600 text-white'
                                    : 'bg-gray-100 border-gray-300 text-black'
                                }`}
                        >
                            [Beta] Lyric-Trace
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
                                                className={`overflow-x-auto ${isActive ? 'bg-amber-100/30 p-2 rounded-md' : ''
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
