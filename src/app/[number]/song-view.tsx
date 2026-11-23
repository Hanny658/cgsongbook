'use client'
import { useConfig } from '../configs/settings'
import SongLyricsPage from './classical-mode';
import PresenterView from './presenter-mode'

// Picks the view for a song according to the "Theme" setting
interface SongViewProps {
    song: SongData
    /** Background of the classic view */
    bgUrl: string
    /** One picture per slide (title slide first) for the GACC-Slides view */
    slideBgUrls: string[]
}

export default function SongView({ song, bgUrl, slideBgUrls }: SongViewProps) {
    const { viewMode } = useConfig()

    if (viewMode == 'GACC-Slides') {
        return <PresenterView song={song} bgUrls={slideBgUrls} />
    }
    // 'Classic', and the fallback for anything unknown
    return <SongLyricsPage song={song} bgUrl={bgUrl} />
}
