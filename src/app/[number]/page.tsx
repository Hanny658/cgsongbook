import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSong } from '../lib/db'
import SongView from './song-view'
import { BG_IMAGES, SLIDE_BG_IMAGES, randomBg } from '../utils/backgrounds'

type PageProps = { params: Promise<{ number: string }> }

// Tab title = song title (the two getSong calls of one request share a single fetch)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { number } = await params
    const song = await getSong(number).catch(() => null)
    return song ? { title: song.title } : {}
}

export default async function Page({ params }: PageProps) {
    const { number } = await params
    const song = await getSong(number)
    if (!song) notFound()

    // Random pictures are picked here, on the server, so they are part of the first paint
    const bgUrl = randomBg(BG_IMAGES)
    const slideBgUrls = Array.from({ length: song.song.length + 1 }, () => randomBg(SLIDE_BG_IMAGES))

    // key: a different song starts with fresh state (slide position, lyric tracing)
    return <SongView key={song.number} song={song} bgUrl={bgUrl} slideBgUrls={slideBgUrls} />
}
