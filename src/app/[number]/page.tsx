'use client'
import { useConfig } from '../configs/settings'
import SongLyricsPage from './Beta';
import PresenterView from './PresenterMode'
import SongLyricsClient from './SongLyricsClient'
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
    return <SongLyricsClient number={number} />
}
