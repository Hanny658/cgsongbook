'use client'

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import SettingsButton from './configs/settings-button'
import RandomPicker from './utils/random-picker'
import BibleReader from './bible-reader/BibleReader'
import { BG_IMAGES, randomBg } from './utils/backgrounds'

// Bible verses are fetched via /api/bible-verse (proxied to DB_URL on the server);
// set NEXT_PUBLIC_ENABLE_BIBLE_READER at build time to show the reader.
const BIBLE_READER_ENABLED : boolean = !!(process.env.NEXT_PUBLIC_ENABLE_BIBLE_READER);

interface HomeViewProps {
  /** All songs, sorted by number (fetched on the server) */
  songs: SongMeta[]
  /** True when the song list could not be loaded */
  loadError?: boolean
}

const HomeView = ({ songs, loadError = false }: HomeViewProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [bgUrl, setBgUrl] = useState('')
  const [hymnVerse, setHymnVerse] = useState('')
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

  // Picked on the client only, so server and client markup stay identical
  useEffect(() => {
    setBgUrl(randomBg(BG_IMAGES))
  }, [])

  useEffect(() => {
    scrollToSong(picked);
  }, [picked, scrollToSong])

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 100)
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const filteredSongs = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()
    if (!term) return songs
    return songs.filter(song =>
      song.title.toLowerCase().includes(term) ||
      song.number.toString().includes(term)
    )
  }, [songs, searchQuery])

  const songNumbers = useMemo(() => songs.map(song => song.number), [songs])

  // A random pick may be hidden by the current search, so clear it first
  const handlePick = useCallback((num: number) => {
    setSearchQuery('')
    setPicked(num)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className={`relative w-full overflow-hidden`}>
      <div className="fixed top-0 left-0 w-full h-full bg-cover bg-center -z-10" style={{ backgroundImage: `url(${bgUrl})` }} />
      <div className="relative flex flex-col min-h-screen text-gray-900 overflow-y-auto">
        {/* Top Bar */}
        <header className="w-full !bg-black bg-opacity-70 !text-white py-2 px-4 md:px-6 flex justify-between items-center">
          <div className="flex items-center justify-between">
            <SettingsButton />
            <h1 className="text-xl font-semibold">CG Songbook</h1>
          </div>
        </header>

        <div className="fixed top-1.5 right-6 z-40 flex w-1/3">
          <RandomPicker numbers={songNumbers} onPick={handlePick} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

                          {/* Verse viewing if hymn-verse exists */}
                          {song.verse?.trim() && (
                              <i className="bi bi-bookmark-star text-white/50 text-sm absolute left-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-amber-50/20 rounded-2xl hidden md:block"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setHymnVerse(song.verse?.trim() || "");
                                }}> 
                                &nbsp;{song.verse?.trim()}
                              </i>
                          )}

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
                  {songs.length > 0 ? 
                  <>
                  <h2 className="text-2xl text-blue-800 text-shadow-2xs text-shadow-cyan-50/60">That song is not yet here...</h2>
                  <p className="text-lg text-blue-900 text-shadow-2xs text-shadow-cyan-50/60">Maybe tell me? I can add the song for you wish to worship the Lord with singing it!</p>
                  </> 
                  : 
                  <>
                    <h2 className="text-2xl text-blue-800 text-shadow-2xs text-shadow-cyan-50/60">
                      {loadError ? "The songs could not be loaded..." : "No songs here yet..."}
                    </h2>
                    {loadError &&
                      <p className="text-lg text-blue-900 text-shadow-2xs text-shadow-cyan-50/60">Please refresh the page in a moment.</p>
                    }
                  </>
                  }
                </div>
              }
            </div>

            {showScrollTop && (
              <button
                onClick={scrollToTop}
                className="fixed bottom-8 right-8 bg-orange-500/60 text-white hover:text-amber-300 p-2 rounded-full shadow-lg hover:bg-opacity-90 transition"
                aria-label="Scroll to Top"
              >
                <i className="bi bi-arrow-bar-up text-xl"></i>
              </button>
            )}

            {BIBLE_READER_ENABLED &&
              <div className="fixed bottom-8 left-8" >
                <BibleReader startVerse={hymnVerse}/>
              </div>
            }
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full text-center bg-gray-400/50 text-xs text-white py-2 border-t">
          Website by Hanny from GACC 🄯 2025
          <p className='text-gray-700 text-[0.6rem]'>You can email me at <a className='text-shadow-amber-500/50 text-shadow-2xs' href='mailto:zyh@ik.me'>zyh@ik.me</a> for songs you wish to add ~</p>
        </footer>
      </div>
    </div>
  )
}

export default HomeView
