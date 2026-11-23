import HomeView from './home-view'
import { getSongList } from './lib/db'
import { BG_IMAGES, randomBg } from './utils/backgrounds'

// The song list is fetched on the server (cached, see lib/db.ts) and handed to the client view.
export default async function SongbookPage() {
  let songs: SongMeta[] = []
  let loadError = false

  try {
    songs = await getSongList()
  } catch (error) {
    console.error('Failed to load the song list:', error)
    loadError = true
  }

  return <HomeView songs={songs} loadError={loadError} bgUrl={randomBg(BG_IMAGES)} />
}
