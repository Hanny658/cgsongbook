// One line of chords & lyrics
interface SongLine {
    chords: string
    lyrics: string
}

// One section of a song
interface SongSection {
    id: string
    label: string
    lines: SongLine[]
}

// A full song structure
interface SongData {
    title: string
    link?: string
    number: number
    lyrics: SongSection[]
    song: string[]
}

// Only for listing, minimal info
interface SongMeta {
    title: string
    link?: string
    number: number
}
