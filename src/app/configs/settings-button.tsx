"use client"

// app/configs/settings-button.tsx
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfig, FONT_SIZES, VIEW_MODES } from './settings'

const fontsizeDisplay = {'extra-small': "Extra Small",'small': "Small", 'medium': "Medium", 'large': "Large", 'extra-large': "Extra Large"}

export default function SettingsButton() {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

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
        viewMode,
        setViewMode,
    } = useConfig()

    // cycle font sizes
    const idx = FONT_SIZES.indexOf(fontSize)
    const prevFont = FONT_SIZES[(idx + FONT_SIZES.length - 1) % FONT_SIZES.length]
    const nextFont = FONT_SIZES[(idx + 1) % FONT_SIZES.length]

    // cycle view modes
    const idv = VIEW_MODES.indexOf(viewMode)
    const prevMode = VIEW_MODES[(idv + VIEW_MODES.length - 1) % VIEW_MODES.length]
    const nextMode = VIEW_MODES[(idv + 1) %  VIEW_MODES.length]

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
                className="inline-flex items-center pr-3 py-1 bg-transparent text-white hover:text-blue-300"
            >
                <i className="bi bi-gear-fill text-2xl mr-2"></i>
            </button>

            {/* slide‐up panel */}
            {true && (
                <div
                className={`
                    fixed bottom-0 left-0
                    w-full h-1/3
                    bg-black text-white p-3 z-50 overflow-auto
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen
                    ? 'translate-y-0 pointer-events-auto'
                    : 'translate-y-full pointer-events-none'}
                `}>
                    {/* close icon */}
                    <div className="flex justify-between">
                        <button onClick={() => router.push('/editor')} 
                        title='Song Editor (requires account to access, if you wish to be a contributor, please contact me at zyh@ik.me)'
                        className="text-white self-start text-2xl hover:text-blue-400">
                            <i className="bi bi-pencil-square"></i>
                        </button>
                        <h4 className='font-bold text-sm text-blue-300/80'>Settings</h4>
                        <button onClick={closePanel} 
                                className="text-white self-end text-2xl hover:text-red-400">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="flex flex-col items-center space-y-4">
                        {/* Font Size (+ / -) */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Font Size:</span>
                            <button
                                onClick={() => setFontSize(prevFont)}
                                className="px-2 py-1 bg-transparent text-white hover:text-indigo-200"
                            >
                                <i className="bi bi-dash-square"></i>
                            </button>
                            <span className="min-w-[6rem] text-center">{fontsizeDisplay[fontSize]}</span>
                            <button
                                onClick={() => setFontSize(nextFont)}
                                className="px-2 py-1 bg-transparent text-white hover:text-orange-200"
                            >
                                <i className="bi bi-plus-square"></i>
                            </button>
                        </div>

                        {/* Video Display toggle */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Video Display:</span>
                            <button
                                onClick={toggleVideoDisplay}
                                className={`px-3 py-1 border rounded min-w-[3rem] text-white hover:text-orange-200 
                                    ${videoDisplay ? 'border-orange-500' : 'border-gray-600'}`}
                            >
                                {videoDisplay ? 'On' : 'Off'}
                            </button>
                        </div>

                        {/* Show Chords toggle */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Show Chords:</span>
                            <button
                                onClick={toggleShowChords}
                                className={`px-3 py-1 border rounded min-w-[3rem]  text-white hover:text-orange-200 
                                    ${showChords ? 'border-orange-500' : 'border-gray-600'}`}
                            >
                                {showChords ? 'On' : 'Off'}
                            </button>
                        </div>

                        {/* Transpose Chords (+ / - with C→X) */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Transpose: </span>
                            <button
                                onClick={decrementTranspose}
                                className="px-2 py-1 bg-transparent text-white hover:text-indigo-200"
                            >
                                <i className="bi bi-dash-square"></i>
                            </button>
                            <span className="min-w-[5rem] text-center">
                                C <i className="bi bi-arrow-right-short"></i> <b className={transposeChords == 0 ? '' : 'text-blue-400'}>{transposeChord('C', transposeChords)}</b>
                            </span>
                            <button
                                onClick={incrementTranspose}
                                className="px-2 py-1 bg-transparent text-white hover:text-orange-200"
                            >
                                <i className="bi bi-plus-square"></i>
                            </button>
                            {/* <p>{transposeChords}</p> */}
                        </div>

                        {/* View Mode change */}
                        <div className="flex items-center justify-between space-x-2">
                            <span>Theme:</span>
                            <button
                                onClick={() => setViewMode(prevMode)}
                                className="px-2 py-1 bg-transparent text-white hover:text-orange-200"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>
                            <span className="min-w-[6rem] text-center">{viewMode}</span>
                            <button
                                onClick={() => setViewMode(nextMode)}
                                className="px-2 py-1 bg-transparent text-white hover:text-orange-200"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
