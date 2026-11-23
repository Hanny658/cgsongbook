// app/lib/db.ts
// Server-only access to the song database behind DB_URL.
import 'server-only'

export const SONGS_TAG = 'songs'
export const songTag = (number: number | string) => `song-${number}`

// Pages read through Next's data cache; saving a song in the editor revalidates
// the tags, and this interval picks up edits made directly in the database.
const REVALIDATE_SECONDS = 60

export function dbUrl(): string {
    const url = process.env.DB_URL
    if (!url) throw new Error('DB_URL is not defined in environment variables')
    return url
}

/** Song numbers are positive integers; anything else never reaches the DB. */
export function isSongNumber(value: string): boolean {
    return /^[1-9]\d{0,5}$/.test(value)
}

/** All songs (minimal info), sorted by number. */
export async function getSongList(): Promise<SongMeta[]> {
    const res = await fetch(`${dbUrl()}/songs`, {
        next: { revalidate: REVALIDATE_SECONDS, tags: [SONGS_TAG] },
    })
    if (!res.ok) throw new Error(`Failed to fetch songs: ${res.status} ${res.statusText}`)

    const list: SongMeta[] = await res.json()
    return list.sort((a, b) => a.number - b.number)
}

/** One full song, or null when it does not exist. */
export async function getSong(number: string): Promise<SongData | null> {
    if (!isSongNumber(number)) return null

    const res = await fetch(`${dbUrl()}/songs/${number}`, {
        next: { revalidate: REVALIDATE_SECONDS, tags: [SONGS_TAG, songTag(number)] },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Failed to fetch song ${number}: ${res.status} ${res.statusText}`)

    const song = await res.json()
    // Guard against an error payload being treated as a song
    if (!song || !Array.isArray(song.lyrics) || !Array.isArray(song.song)) return null
    return song as SongData
}
