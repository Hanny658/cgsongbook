'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import "../app/globals.css"
import Link from 'next/link'
import "bootstrap-icons/font/bootstrap-icons.css"
import Head from 'next/head'
import SettingsButton from './configs/settings-button'
import RandomPicker from './configs/random-picker'

const bgImages = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.webp', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.webp', '15.jpg']

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
        </header>

        <div className="fixed top-1.5 right-6 z-40 flex w-1/3">
          <RandomPicker maxNum={songs.length} onPick={setPicked} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search title or number..."
            className="text-black bg-white/80 rounded w-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

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
                <div className="w-full min-h-[70vh] flex flex-col justify-center items-center text-center">
                  <div role="status">
                    <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                      <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                    </svg>
                    <span className="sr-only">Loading...</span>
                  </div>
                  <h2 className="text-2xl text-blue-800 text-shadow-2xs text-shadow-cyan-50/60">Your songs are coming right-up...</h2>
                  <p className="text-lg text-blue-900 text-shadow-2xs text-shadow-cyan-50/60">Or maybe the song has not been listed yet... Maybe tell me?</p>
                </div>
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
        <footer className="w-full text-center bg-gray-400/50 text-xs text-white py-2 border-t">
          Website by Hanny from GACC <i className="bi bi-c-circle text-xs"></i> 2025
          <p className='text-gray-700 text-[0.6rem]'>You can email me at <a className='text-shadow-amber-500/50 text-shadow-2xs' href='mailto:zyh@ik.me'>zyh@ik.me</a> for songs you wish to add ~</p>
        </footer>
      </div>
    </div>
  )
}

export default SongbookPage
