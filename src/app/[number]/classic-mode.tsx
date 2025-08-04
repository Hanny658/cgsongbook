'use client'

// app/[number]/SongLyricsClient.tsx  | ViewMode = Classic

import { useState, useEffect, Key } from 'react'
import Link from "next/link"
// import Fuse from 'fuse.js'
import "../../app/globals.css"
import "bootstrap-icons/font/bootstrap-icons.css"
import Head from 'next/head'
import SettingsButton from '../configs/settings-button'
import { useConfig } from '../configs/settings'
import { transposeChordString } from '../configs/chord-transpose'

const bgImages = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', 
  '7.jpg', '8.jpg', '9.webp', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.webp', 
  '15.jpg', '16.jpg', '17.jpg', '18.jpg', '19.jpg', '20.jpg', '21.jpg', '22.jpg', 
  '23.jpg', '25.webp', '24.jpg', '26.jpg']

export default function SongLyricsPage({ number }: { number: string | number }) {
  const [song, setSong] = useState<SongData | null>(null)
  const {
    videoDisplay,        // boolean: are TYB videos shown?
    showChords,          // boolean: are chords shown?
    transposeChords,     // number: 0–11 semitone shift
  } = useConfig()

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

  if (!song) {
    return <div role="status">
      <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  }

  const sectionMap = Object.fromEntries(song.lyrics.map((sec: SongSection) => [sec.id, sec]))
  const videoId = song.link?.split('v=')[1]?.split('&')[0] || song.link?.split('youtu.be/')[1] || ''

  // Flatten all lyrics for fuzzy search (excluding chords)
  const flatLyrics: { id: string; text: string }[] = []

  song.song.forEach((sectionId, sectionOrder) => {
    const section = sectionMap[sectionId]
    section.lines.forEach((line, lineIndex) => {
      // now `${sectionOrder}` disambiguates repeated sections
      const uniqueId = `${sectionId}-${sectionOrder}-${lineIndex}`

      if (line.lyrics.trim()) {
        flatLyrics.push({
          id: uniqueId,
          text: line.lyrics,
        })
      }
    })
  })

  const startRecognition = () => {
    // Start Recognition with recording and comparing
  }

  const stopRecognition = () => {
    // Stop singing recognition, and stop recording
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
              className={`text-xs px-3 py-1 rounded-md border ${tracking
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
          {(videoDisplay && videoId) && (
            <div className="w-full md:w-1/2 p-2 m-0 mx-auto">
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
                      <div key={lineIndex} className={`overflow-x-auto ${isHighlighted ? 'bg-amber-100/30 p-2 rounded-md' : ''}`}>
                        {showChords && 
                          <p className="font-chords text-base md:text-xl lg:text-2xl text-blue-400 whitespace-pre text-shadow-blue-100/40 text-shadow-2xs">
                            {transposeChordString(`${line.chords}`, transposeChords)}
                          </p>
                        }
                        <p className="font-chords text-base md:text-xl lg:text-2xl text-white">{line.lyrics}</p>
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
    </div>
  )
}
