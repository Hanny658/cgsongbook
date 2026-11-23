import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSong } from '../lib/db'
import SongView from './song-view'

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

    return <SongView song={song} />
}
