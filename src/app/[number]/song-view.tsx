'use client'
import { useConfig } from '../configs/settings'
import SongLyricsPage from './classical-mode';
import PresenterView from './presenter-mode'

// Picks the view for a song according to the "Theme" setting
export default function SongView({ song }: { song: SongData }) {
    const { viewMode } = useConfig()

    if (viewMode == 'GACC-Slides') {
        return <PresenterView song={song} />
    }
    // 'Classic', and the fallback for anything unknown
    return <SongLyricsPage song={song} />
}
