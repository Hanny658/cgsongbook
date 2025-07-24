'use client'
import { useConfig } from '../configs/settings'
import PresenterView from './PresenterMode'
import SongLyricsClient from './SongLyricsClient'
import { useParams } from 'next/navigation';

export default function Page() {
    const { number } = useParams() as { number: string | number };
    const { viewMode } = useConfig()
    
    if (viewMode == 'Classic') {
        return <SongLyricsClient number={number} />
    } 
    else if (viewMode == 'GACC-Slides') {
        return <PresenterView number={number} />
    }
    return <SongLyricsClient number={number} />
}
