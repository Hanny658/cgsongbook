'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import "../app/globals.css"
import Link from 'next/link'
import "bootstrap-icons/font/bootstrap-icons.css"
import Head from 'next/head'
import SettingsButton from './configs/settings-button'
import RandomPicker from './configs/random-picker'

interface SongMeta {
  title: string
  link?: string
  number: number
}

const bgImages = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg']

const SongbookPage = () => {
  const [songs, setSongs] = useState<SongMeta[]>([])
  const [filteredSongs, setFilteredSongs] = useState<SongMeta[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [bgUrl, setBgUrl] = useState('')

  const [picked, setPicked] = useState<number | null>(null);
  const songRefs = useRef<Record<number, HTMLAnchorElement | null>>({});

  const scrollToSong = useCallback((num: number | null) => {
    if (!num) return;
    const el = songRefs.current[num];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",   // animate the scroll
        block: "center",      // align it to the center of the container/viewport
      });
    } else {
      console.warn(`No song found with number ${num}`);
    }
  }, []);

  useEffect(() => {
    const random = Math.floor(Math.random() * bgImages.length)
    setBgUrl(`/sbg/${bgImages[random]}`)
  }, [])

  useEffect(() => {
    scrollToSong(picked);
    console.log("Picked a random song: No.", picked)
  }, [picked, scrollToSong])

  useEffect(() => {
    const fetchSongs = async () => {
      const response = await fetch('/api/songs')
      const data: SongMeta[] = await response.json()
      const sorted = data.sort((a, b) => a.number - b.number)
      setSongs(sorted)
      setFilteredSongs(sorted)
    }

    fetchSongs()

    const onScroll = () => {
      setShowScrollTop(window.scrollY > 100)
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    const filtered = songs.filter(song =>
      song.title.toLowerCase().includes(value.toLowerCase()) ||
      song.number.toString().includes(value)
    )
    setFilteredSongs(filtered)
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className={`relative w-full overflow-hidden`}>
      <div className="fixed top-0 left-0 w-full h-full bg-cover bg-center -z-10" style={{ backgroundImage: `url(${bgUrl})` }} />
      <div className="relative flex flex-col min-h-screen text-gray-900 overflow-y-auto">
        <Head>
          <title>CG Songbook</title>
          <meta name="description" content="This contains the song from Sky's CG songbook PDF plus songs loved by Hanny" />
        </Head>

        {/* Top Bar */}
        <header className="w-full !bg-black bg-opacity-70 !text-white py-2 px-6 flex justify-between items-center">
          <div className="flex items-center justify-between">
            <SettingsButton />
            <h1 className="text-xl font-semibold">CG Songbook</h1>
          </div>
          <div className="flex w-full md:w-1/2">
            <RandomPicker maxNum={songs.length} onPick={setPicked} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search title or number..."
              className="text-black bg-white/90 rounded w-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow px-6 py-4">
          <div className="relative">
            <div className="space-y-2">
              {filteredSongs.length > 0 ?
                <>
                  {filteredSongs.map((song) => (
                    <Link key={song.number} href={`/${song.number}`}
                    ref={(el) => {
                      songRefs.current[song.number] = el;
                    }}>
                      <div className="relative">
                        <div
                          className={`border-b text-white text-xl border-gray-500 py-2 px-4 flex justify-center items-center
                            ${song.number == picked ? "bg-amber-900/75 hover:bg-amber-900/60" : "bg-black/75 hover:bg-black/60"}`
                          }
                        >
                          <span className="font-medium">
                            {song.number}. {song.title}
                          </span>

                          {/* YouTube Icon if link exists */}
                          {song.link?.trim() && (
                            <i className="bi bi-youtube text-red-200/50 text-2xl absolute right-4 top-1/2 transform -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </>
                :
                <p className='text-center text-xl text-blue-900'>The song has not been listed yet... Maybe tell me?</p>
              }
            </div>

            {showScrollTop && (
              <button
                onClick={scrollToTop}
                className="fixed bottom-8 right-8 bg-orange-500/60 text-white p-2 rounded-full shadow-lg hover:bg-opacity-90 transition"
                aria-label="Scroll to Top"
              >
                <i className="bi bi-arrow-bar-up text-xl"></i>
              </button>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full text-center bg-gray-400/50 text-sm text-white py-2 border-t">
          Website by Hanny <i className="bi bi-c-circle text-xs"></i> 2025
          <p className='text-gray-700 text-xs'>You can email me at <a className='text-shadow-amber-500/50 text-shadow-2xs' href='mailto:zyh@ik.me'>zyh@ik.me</a> for songs you wish to add ~</p>
        </footer>
      </div>
    </div>
  )
}

export default SongbookPage
