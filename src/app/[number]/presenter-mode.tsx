'use client';

// app/components/PresenterView.tsx | ViewMode = GACC Slides

import React, {
    useState,
    useEffect,
    useLayoutEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface PresenterViewProps {
    song: SongData;
    /** One picture per slide (title slide first), picked on the server */
    bgUrls: string[];
}

// Slide pictures take a third of the screen on desktop, the full width on mobile
const SLIDE_IMAGE_SIZES = '(min-width: 768px) 34vw, 100vw';

const MIN_LYRIC_FONT_SIZE = 14;
const MAX_LYRIC_FONT_SIZE = 24;
const FIT_TOLERANCE = 0.25;

function AutoFitLyrics({ section }: { section: SongSection }) {
    const frameRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [fontSize, setFontSize] = useState(MAX_LYRIC_FONT_SIZE);
    const [needsScroll, setNeedsScroll] = useState(false);

    const fitLyrics = useCallback(() => {
        const frame = frameRef.current;
        const content = contentRef.current;

        if (!frame || !content || frame.clientHeight === 0 || frame.clientWidth === 0) {
            return;
        }

        const fitsAt = (size: number) => {
            content.style.fontSize = `${size}px`;
            return (
                content.scrollHeight <= frame.clientHeight + 1
                && content.scrollWidth <= frame.clientWidth + 1
            );
        };

        let fittedSize = MIN_LYRIC_FONT_SIZE;

        if (fitsAt(MAX_LYRIC_FONT_SIZE)) {
            fittedSize = MAX_LYRIC_FONT_SIZE;
        } else {
            let lower = MIN_LYRIC_FONT_SIZE;
            let upper = MAX_LYRIC_FONT_SIZE;

            while (upper - lower > FIT_TOLERANCE) {
                const candidate = (lower + upper) / 2;
                if (fitsAt(candidate)) {
                    fittedSize = candidate;
                    lower = candidate;
                } else {
                    upper = candidate;
                }
            }
        }

        // Round down so sub-pixel layout cannot push an otherwise fitting line out.
        fittedSize = Math.floor(fittedSize * 4) / 4;
        const stillOverflows = !fitsAt(fittedSize);

        if (!stillOverflows) frame.scrollTop = 0;
        setFontSize(currentSize => currentSize === fittedSize ? currentSize : fittedSize);
        setNeedsScroll(currentValue => currentValue === stillOverflows ? currentValue : stillOverflows);
    }, []);

    useLayoutEffect(() => {
        const frame = frameRef.current;
        if (!frame) return;

        // A newly loaded section should always start at its first lyric line.
        frame.scrollTop = 0;
        const animationFrame = window.requestAnimationFrame(fitLyrics);
        const resizeObserver = new ResizeObserver(fitLyrics);
        resizeObserver.observe(frame);

        let cancelled = false;
        void document.fonts.ready.then(() => {
            if (!cancelled) fitLyrics();
        });

        return () => {
            cancelled = true;
            window.cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
        };
    }, [fitLyrics, section]);

    return (
        <div
            ref={frameRef}
            data-lyrics-frame
            className={`h-full w-full overscroll-contain ${needsScroll ? 'overflow-y-auto' : 'overflow-hidden'}`}
        >
            <div
                ref={contentRef}
                data-lyrics-content
                className="flex min-h-full w-full flex-col justify-center text-center"
                style={{ fontSize }}
            >
                <h3
                    className="shrink-0 font-medium italic leading-tight text-gray-700"
                    style={{ fontSize: '0.833em', marginBottom: '0.8em' }}
                >
                    {section.label}
                </h3>
                <div className="flex flex-col gap-[0.35em]">
                    {section.lines.map((line, lineIndex) => (
                        <p key={lineIndex} className="break-words leading-[1.25] text-black">
                            {line.lyrics}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function PresenterView({ song: songData, bgUrls }: PresenterViewProps) {
    const [current, setCurrent] = useState(0);

    const sectionSlides = useMemo(() => {
        const sectionMap = new Map(songData.lyrics.map(section => [section.id, section]));
        return songData.song
            .map(sectionId => sectionMap.get(sectionId))
            .filter((section): section is SongSection => Boolean(section));
    }, [songData]);

    // total slides = 1 title slide + one per entry in the configured song order
    const totalSlides = sectionSlides.length + 1;


    const router = useRouter();

    const prev = useCallback(() => {
        setCurrent(c => Math.max(0, c - 1));
    }, []);
    const next = useCallback(() => {
        setCurrent(c => Math.min(totalSlides - 1, c + 1));
    }, [totalSlides]);

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

    return (
        <div className="relative h-dvh">
            <button
                type="button"
                aria-label="Back to song list"
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
                className="relative h-full w-full select-none overflow-hidden bg-white"
                onClick={onClickZone}
            >
                {/* Slide deck */}
                <div
                    className="flex h-full min-h-0 transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${current * 100}%)` }}
                >
                    {/* Slide 1: Title + BG image */}
                    <div className="w-full flex-shrink-0 flex flex-col h-full">
                        <div className="h-2/3 flex items-center justify-center">
                            <h1 className="text-4xl font-bold text-black underline decoration-3 decoration-black underline-offset-5">
                                {songData.number} - {songData.title}
                            </h1>
                        </div>
                        <div className="h-1/3 overflow-hidden">
                            {songData.link && bgUrls[0] && (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={bgUrls[0]}
                                        alt="Background"
                                        fill
                                        sizes="100vw"
                                        style={{ objectFit: 'cover' }}
                                        priority
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section slides */}
                    {sectionSlides.map((section, sectionIndex) => (
                        <div
                            key={`${section.id}-${sectionIndex}`}
                            className="flex h-full min-h-0 w-full flex-shrink-0 flex-col md:flex-row"
                        >
                            {/* Left (or top on mobile) */}
                            <div className="flex h-2/3 min-h-0 w-full shrink-0 flex-col p-4 md:h-full md:w-2/3 md:p-6">
                                <div className="mt-4 shrink-0 text-center md:mt-7">
                                    <h2 className="text-2xl text-black underline decoration-2 decoration-black underline-offset-5 md:text-3xl">
                                        {songData.number} – {songData.title}
                                    </h2>
                                </div>
                                <div className="mt-2 min-h-0 flex-1 px-2 font-lyrics md:px-4">
                                    <AutoFitLyrics section={section} />
                                </div>
                                <div className="mt-3 shrink-0 text-center text-sm text-gray-700 md:mt-4">
                                    – {sectionIndex + 1} / {totalSlides - 1} –
                                </div>
                            </div>

                            {/* Right (or bottom on mobile) */}
                            <div className="h-1/3 w-full shrink-0 overflow-hidden md:h-full md:w-1/3">
                                {songData.link && bgUrls[sectionIndex + 1] && (
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={bgUrls[sectionIndex + 1]}
                                            alt="Background"
                                            fill
                                            sizes={SLIDE_IMAGE_SIZES}
                                            style={{ objectFit: 'cover' }}
                                            // only the current & upcoming slides are fetched eagerly
                                            loading={sectionIndex <= current + 1 ? 'eager' : 'lazy'}
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
