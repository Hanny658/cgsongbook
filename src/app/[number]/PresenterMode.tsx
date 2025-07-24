// app/components/PresenterView.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { bgImages } from './SongLyricsClient';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface PresenterViewProps {
    number: string | number;
}

export default function PresenterView({ number }: PresenterViewProps) {
    const [songData, setSongData] = useState<SongData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [current, setCurrent] = useState(0);

    const [bgUrl, setBgUrl] = useState('')

    useEffect(() => {
        const random = Math.floor(Math.random() * bgImages.length)
        setBgUrl(`/sbg/${bgImages[random]}`)
    }, [])

    const router = useRouter();

    // total slides = 1 (title) + one per section
    const totalSlides = songData ? songData.lyrics.length + 1 : 0;

    // fetch on mount / when number changes
    useEffect(() => {
        setLoading(true);
        fetch(`/api/songs/${number}`)
            .then(async res => {
                if (!res.ok) throw new Error((await res.json()).error || 'Fetch error');
                return (await res.json()) as SongData;
            })
            .then(data => {
                setSongData(data);
                setCurrent(0);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [number]);

    const prev = useCallback(() => {
        setCurrent(c => Math.max(0, c - 1));
    }, []);
    const next = useCallback(() => {
        if (songData) setCurrent(c => Math.min(totalSlides - 1, c + 1));
    }, [totalSlides, songData]);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            prev();
        } else if (e.key === 'ArrowRight') {
            next();
        }
    }, [prev, next]);

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onKeyDown]);

    // click zones
    const onClickZone = (e: React.MouseEvent) => {
        const x = e.clientX;
        const w = window.innerWidth;
        if (x < w * 0.2) prev();
        else if (x > w * 0.8) next();
    };

    if (loading) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-white">
                <p className="text-lg">Loading…</p>
            </div>
        );
    }
    if (error || !songData) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-white">
                <p className="text-lg text-red-600">{error || 'Unknown error'}</p>
            </div>
        );
    }

    return (
        <div className='relative'>
        <button
            onClick={() => router.push('/')}
            className="
        fixed top-7 right-0 z-50 
        transform -translate-y-1/2
        p-2 bg-white/70 text-black/90 rounded-l shadow-lg
        hover:bg-white
    "
        >
            <i className="bi bi-house-door text-2xl" />
        </button>
        <div
            className="relative w-full h-screen bg-white overflow-hidden select-none"
            onClick={onClickZone}
        >
            {/* Slide deck */}
            <div
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {/* Slide 1: Title + BG image */}
                <div className="w-full flex-shrink-0 flex flex-col h-full">
                    <div className="h-2/3 flex items-center justify-center">
                        <h1 className="text-4xl font-bold text-black">
                            {songData.number} | {songData.title}
                        </h1>
                    </div>
                    <div className="h-1/3 overflow-hidden">
                        {songData.link && (
                            <div className="relative w-full h-full">
                                <Image
                                    src={bgUrl}
                                    alt="Background"
                                    fill
                                    sizes="100vw"
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Section slides */}
                {songData.lyrics.map((section, idx) => (
                    <div
                        key={section.id}
                        className="w-full flex-shrink-0 flex md:flex-row flex-col h-full"
                    >
                        {/* Left (or top on mobile) */}
                        <div className="md:w-2/3 w-full flex flex-col p-6">
                            <div>
                                <h2 className="text-2xl font-semibold text-black">
                                    {songData.number} – {songData.title}
                                </h2>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                                <h3 className="text-xl font-medium mb-4">{section.label}</h3>
                                <div className="space-y-2">
                                    {section.lines.map((ln, li) => (
                                        <p key={li} className="text-lg text-black">
                                            {ln.lyrics}
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <div className="text-center text-sm text-gray-700 mt-4">
                                – {idx + 2}/{totalSlides} –
                            </div>
                        </div>

                        {/* Right (or bottom on mobile) */}
                        <div className="md:w-1/3 w-full overflow-hidden">
                            {songData.link && (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={bgUrl}
                                        alt="Background"
                                        fill
                                        sizes="100vw"
                                        style={{ objectFit: 'cover' }}
                                        priority={true}   // optional: if you want it to load ASAP
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Optional slide indicator dots */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {Array.from({ length: totalSlides }).map((_, i) => (
                    <span
                        key={i}
                        className={
                            'w-2 h-2 rounded-full ' +
                            (i === current ? 'bg-black' : 'bg-gray-300')
                        }
                    />
                ))}
            </div>
        </div>
        </div>
    );
}
