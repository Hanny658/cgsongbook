"use client"

// app/configs/settings-button.tsx
import React, { useState } from 'react'
import { useConfig, FontSize } from './settings'

const FONT_SIZES: FontSize[] = ['small', 'medium', 'large', 'extra-large']

export default function SettingsButton() {
    const [isOpen, setIsOpen] = useState(false)

    const {
        fontSize,
        setFontSize,
        videoDisplay,
        toggleVideoDisplay,
        showChords,
        toggleShowChords,
        transposeChords,
        incrementTranspose,
        decrementTranspose,
    } = useConfig()

    // cycle font sizes
    const idx = FONT_SIZES.indexOf(fontSize)
    const prevFont = FONT_SIZES[(idx + FONT_SIZES.length - 1) % FONT_SIZES.length]
    const nextFont = FONT_SIZES[(idx + 1) % FONT_SIZES.length]

    // simple C→X transposer
    const transposeChord = (base: string, semi: number) => {
        const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        const i = NOTES.indexOf(base.toUpperCase())
        if (i === -1) return base
        return NOTES[(i + semi + 12) % 12]
    }

    const openPanel = () => setIsOpen(true)
    const closePanel = () => setIsOpen(false)

    return (
        <>
            {/* inline button */}
            <button
                onClick={isOpen ? closePanel : openPanel}
                className="inline-flex items-center px-3 py-1 bg-transparent text-white hover:text-blue-300"
            >
                <i className="bi bi-tools text-2xl mr-2"></i>
            </button>

            {/* slide‐up panel */}
            {true && (
                <div
                className={`
                    fixed bottom-0 left-0
                    w-full h-1/3 md:h-1/4
                    bg-black text-white p-4 z-50

                    /* enable transforms & smooth slide */
                    transform transition-transform duration-300 ease-in-out

                    /* when open, translate to 0; when closed, move fully down and disable clicks */
                    ${isOpen
                    ? 'translate-y-0 pointer-events-auto'
                    : 'translate-y-full pointer-events-none'}
                `}>
                    {/* close icon */}
                    <div className="flex justify-end">
                        <button onClick={closePanel} className="text-white text-2xl">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="flex flex-col items-center space-y-4">
                        {/* Font Size (+ / -) */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Font Size:</span>
                            <button
                                onClick={() => setFontSize(prevFont)}
                                className="px-2 py-1 bg-transparent"
                            >
                                <i className="bi bi-dash-square"></i>
                            </button>
                            <span className="min-w-[5rem] text-center">{fontSize}</span>
                            <button
                                onClick={() => setFontSize(nextFont)}
                                className="px-2 py-1 bg-transparent"
                            >
                                <i className="bi bi-plus-square"></i>
                            </button>
                        </div>

                        {/* Video Display toggle */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Video Display:</span>
                            <button
                                onClick={toggleVideoDisplay}
                                className="px-3 py-1 border border-gray-600 rounded"
                            >
                                {videoDisplay ? 'On' : 'Off'}
                            </button>
                        </div>

                        {/* Show Chords toggle */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Show Chords:</span>
                            <button
                                onClick={toggleShowChords}
                                className="px-3 py-1 border border-gray-600 rounded"
                            >
                                {showChords ? 'On' : 'Off'}
                            </button>
                        </div>

                        {/* Transpose Chords (+ / - with C→X) */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Transpose: </span>
                            <button
                                onClick={decrementTranspose}
                                className="px-2 py-1 bg-transparent"
                            >
                                <i className="bi bi-dash-square"></i>
                            </button>
                            <span className="min-w-[5rem] text-center">C → {transposeChord('C', transposeChords)}</span>
                            <button
                                onClick={incrementTranspose}
                                className="px-2 py-1 bg-transparent"
                            >
                                <i className="bi bi-plus-square"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
