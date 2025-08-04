'use client'
import { useConfig } from '../configs/settings'
import SongLyricsPage from './beta-mode';
import PresenterView from './presenter-mode'
// import SongLyricsPage from './classic-mode'
import { useParams } from 'next/navigation';

export default function Page() {
    const { number } = useParams() as { number: string | number };
    const { viewMode } = useConfig()
    
    if (viewMode == 'Classic') {
        return <SongLyricsPage number={number} />
        // return <SongLyricsClient number={number} />
    } 
    else if (viewMode == 'GACC-Slides') {
        return <PresenterView number={number} />
    }
    console.log("Invalid Mode, Fallback to classico.");
    return <SongLyricsPage number={number} />
}
