'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import SettingsButton from '../configs/settings-button'
import { useConfig } from '../configs/settings'
import { transposeChordString } from '../configs/chord-transpose'
import { useLyricTracing } from '../tracing/use-lyric-tracing'

// Extract the video ID from a YouTube link (watch?v=, youtu.be/, embed/, shorts/)
function getYouTubeId(link?: string): string {
    const match = link?.match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{6,})/)
    return match ? match[1] : ''
}

export default function SongLyricsPage({ song, bgUrl }: { song: SongData; bgUrl: string }) {
    const { videoDisplay, showChords, transposeChords, trackMode } = useConfig()

    // —— FLATTEN LYRICS WITH UNIQUE IDS ——
    const flatLyrics = useMemo(() => {
        const entries: { id: string; text: string }[] = []
        const sectionMap = Object.fromEntries(song.lyrics.map(sec => [sec.id, sec]))
        song.song.forEach((secId, secOrder) => {
            const sec = sectionMap[secId]
            if (!sec) return // section order refers to a section that does not exist
            sec.lines.forEach((line, lineIdx) => {
                const txt = line.lyrics.trim()
                if (txt) entries.push({ id: `${secId}-${secOrder}-${lineIdx}`, text: txt })
            })
        })
        return entries
    }, [song])

    // —— LYRIC TRACING —— (microphone + speech recognition, or manual stepping; see app/tracing)
    const { tracking, starting, activeLine, error, toggle, step, jumpTo, dismissError } =
        useLyricTracing(flatLyrics, trackMode)

    // keep the active line in the middle of the screen
    useEffect(() => {
        if (!activeLine) return
        document.getElementById(activeLine)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [activeLine])

    // Manual mode: arrow keys / PageUp / PageDown / Space step through the lines
    // (Bluetooth page-turner pedals send exactly these keys)
    useEffect(() => {
        if (!tracking || trackMode !== 'Manual') return

        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
            // Space on a focused button / link keeps its normal meaning
            if (e.key === ' ' && target && /^(BUTTON|A)$/.test(target.tagName)) return

            if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) {
                e.preventDefault()
                step(1)
            } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) {
                e.preventDefault()
                step(-1)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [tracking, trackMode, step])

    // prepare section map & video ID
    const sectionMap = Object.fromEntries(song.lyrics.map(sec => [sec.id, sec]))
    const videoId = getYouTubeId(song.link)

    return (
        <div className="relative w-full overflow-hidden">
            <div
                className="fixed inset-0 bg-cover bg-center -z-10"
                style={{ backgroundImage: `url(${bgUrl})` }}
            />
            <div className="flex flex-col min-h-screen bg-black/55 text-gray-900">
                <header className="flex items-center justify-between bg-black/70 px-6 py-4 text-white">
                    <div className="flex items-center space-x-4">
                        <SettingsButton />
                        <h1 className="text-xl font-semibold">
                            {song.number}. {song.title}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggle}
                            className={`text-xs rounded-md border px-2 py-1 min-w-24 
                                ${tracking
                                ? 'bg-orange-500/70 md:bg-orange-500 border-orange-600 text-white fixed bottom-8 right-4 md:bottom-auto md:top-6 md:right-14'
                                : 'bg-blue-200/70 md:bg-blue-200 border-gray-300 text-black fixed bottom-8 right-4 md:static md:block'
                                }`}
                        >
                            {starting ? <i className="bi bi-disc"> Starting…</i>
                                : tracking ? <i className="bi bi-disc-fill"> Trace Stop</i>
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
                                    title={`${song.title} – video`}
                                    loading="lazy"
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
                                                // while tracing, tap a line to sync to it
                                                onClick={tracking ? () => jumpTo(lineId) : undefined}
                                                className={`overflow-x-auto ${tracking ? 'cursor-pointer' : ''} ${isActive && (trackMode !== 'Scroll')
                                                    ? 'bg-amber-100/20 pl-1 rounded-md' : 'pl-1'}`}
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
                    <div className='text-2xl font-bold text-white text-center'>* * *</div>
                    <div className='h-4 md:h-2' />
                </main>
            </div>
            {(tracking && (trackMode == 'Manual')) &&
                <div className="fixed left-7 bottom-7 flex flex-col gap-y-0.5">
                    <button
                        className="rounded-t-2xl bg-amber-500/30 text-white px-3 py-0"
                        aria-label="Previous line"
                        onClick={() => step(-1)}
                    >
                        <i className="bi bi-chevron-compact-up text-2xl"></i>
                    </button>
                    <button
                        className="rounded-b-2xl bg-amber-500/30 text-white px-3 py-0"
                        aria-label="Next line"
                        onClick={() => step(1)}
                    >
                        <i className="bi bi-chevron-compact-down text-2xl"></i>
                    </button>
                </div>
            }
            {error &&
                <button
                    role="alert"
                    onClick={dismissError}
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 max-w-[90vw] rounded-md bg-red-900/90 px-3 py-2 text-sm text-white shadow-lg"
                >
                    <i className="bi bi-mic-mute-fill" /> {error}
                </button>
            }
        </div>
    )
}
