'use client'

// app/[number]/SongLyricsClient.tsx, as Client side component

import { useState, useRef, useEffect, Key } from 'react'
import Link from "next/link"
import Fuse from 'fuse.js'
import "../../app/globals.css"
import "bootstrap-icons/font/bootstrap-icons.css"
import Head from 'next/head'
import SettingsButton from '../configs/settings-button'

interface SongLine {
  chords: string
  lyrics: string
}

interface SongSection {
  id: string
  label: string
  lines: SongLine[]
}

interface SongData {
  title: string
  link?: string
  number: number
  lyrics: SongSection[]
  song: string[]
}

const bgImages = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg']

export default function SongLyricsPage({ number }: { number: string | number }) {
  const [song, setSong] = useState<SongData | null>(null)

  useEffect(() => {
    fetch(`/api/songs/${number}`)
      .then(res => res.json())
      .then(data => setSong(data))
      .catch(err => console.error('Failed to load song', err))
  }, [number])

  const [tracking, setTracking] = useState(false)
  const [activeLine, setActiveLine] = useState<string | null>(null)

  const [bgUrl, setBgUrl] = useState('')

  useEffect(() => {
    const random = Math.floor(Math.random() * bgImages.length)
    setBgUrl(`/sbg/${bgImages[random]}`)
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any | null>(null)

  if (!song) {
    return <div className="text-white text-center p-10">Loading...</div>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionMap = Object.fromEntries(song.lyrics.map((sec: any) => [sec.id, sec]))
  const videoId = song.link?.split('v=')[1]?.split('&')[0] || song.link?.split('youtu.be/')[1] || ''

  // Flatten all lyrics for fuzzy search (excluding chords)
  const flatLyrics: { id: string; text: string }[] = []
  song.song.forEach((sectionId: string | number) => {
    const section = sectionMap[sectionId]
    section.lines.forEach((line: { lyrics: string }, i: number) => {
      if (line.lyrics.trim()) {
        flatLyrics.push({
          id: `${sectionId}-${i}`,
          text: line.lyrics,
        })
      }
    })
  })

  // Set up Fuse.js for fuzzy matching
  const fuse = new Fuse(flatLyrics, {
    keys: ['text'],
    threshold: 0.5,
    includeScore: true,
  })

  const startRecognition = () => {
    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof window !== 'undefined' && (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) {
      alert('Web Speech API not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.lang = 'en-US'
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.resultIndex][0].transcript.trim()
      const match = fuse.search(transcript)[0]
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      if (match?.score! < 0.5) {
        setActiveLine(match.item.id)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => console.warn('Speech error:', e)
    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecognition = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }

  const toggleTracking = () => {
    if (!tracking) {
      startRecognition()
    } else {
      stopRecognition()
      setActiveLine(null)
    }
    setTracking((prev) => !prev)
  }

  return (
    <div className="relative w-full overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full bg-cover bg-center -z-10" style={{ backgroundImage: `url(${bgUrl})` }} />
      <div className="flex flex-col min-h-screen text-gray-900 w-full bg-black/55">

        <Head>
          <title>Songbook - {song.title}</title>
          <meta name="description" content="This contains the lyrics and videos for the song" />
        </Head>

        {/* Top Bar */}
        <header className="w-full bg-black/70 text-white py-4 px-6 flex justify-between items-center">
          <div className="flex items-center justify-between">
            <SettingsButton />
            <h1 className="text-xl font-semibold">{song.number}. {song.title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTracking}
              className={`text-sm px-3 py-1 rounded-md border ${tracking
                ? 'bg-orange-500 text-white border-orange-600'
                : 'bg-gray-100 text-black border-gray-300'
                }`}
            >
              [Beta] Lyric-Trace
            </button>
            <Link href="/">
              <i className="bi bi-house-door-fill text-3xl text-white hover:text-amber-100 cursor-pointer" />
            </Link>
          </div>
        </header>

        {/* Song Content */}
        <div className="pl-4 space-y-8">
          {/* YouTube Player */}
          {videoId && (
            <div className="w-full md:w-1/2 p-4 mx-auto">
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-64 md:h-80 rounded-lg shadow-md"
                />
              </div>
            </div>
          )}

          <h2 className="text-3xl md:text-4xl text-center text-white font-bold my-4">{song.title}</h2>

          {song.song.map((sectionId: string | number, sectionIndex: Key | null | undefined) => {
            const section = sectionMap[sectionId]
            if (!section) return null

            return (
              <div
                key={sectionIndex}
                className="flex flex-col md:flex-row md:space-x-8 border-l-4 border-blue-600 pl-4 md:pl-6"
              >
                <div className="w-full md:w-48 font-semibold text-lg md:text-xl text-blue-400 mb-2 md:mb-0">
                  {section.label}
                </div>

                <div className="flex-grow space-y-2">
                  {section.lines.map((line: { chords: string | null | undefined; lyrics: string | null | undefined }, lineIndex: Key | null | undefined) => {
                    const lineId = `${sectionId}-${lineIndex}`
                    const isHighlighted = lineId === activeLine
                    if (activeLine != null) console.log("Highlighted", activeLine)
                    return (
                      <div key={lineIndex} className={isHighlighted ? 'bg-yellow-100 p-2 rounded-md' : ''}>
                        <p className="text-sm md:text-lg lg:text-xl text-blue-400 whitespace-pre text-shadow-blue-100/40 text-shadow-2xs">{line.chords}</p>
                        <p className="text-base md:text-xl lg:text-2xl text-white">{line.lyrics}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <br />
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-sm bg-white/50 text-gray-700 py-2 px-0 m-0 border-t">
        Website by Hanny <i className="bi bi-c-circle"></i> 2025
      </footer>
    </div>
  )
}
