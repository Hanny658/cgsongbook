"use client";

import React, { useState, useRef, useEffect } from "react";

interface RandomPickerProps {
    /** The song numbers to pick from (they do not need to be contiguous) */
    numbers: number[];
    /** Called once the animation stops, with the selected number */
    onPick: (num: number) => void;
}

const RandomPicker: React.FC<RandomPickerProps> = ({ numbers, onPick }) => {
    // Whether the “rolling” animation is in progress
    const [isPicking, setIsPicking] = useState(false);
    // The number currently displayed in the centre box
    const [displayNum, setDisplayNum] = useState(1);
    // Ref to track our recursive timeout so we can clear it if unmounting
    const timerRef = useRef<number>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const handlePick = () => {
        if (numbers.length < 1 || isPicking) return;

        // Roll through the list by index, so the result is always an existing song
        let current = Math.floor(Math.random() * numbers.length);
        setDisplayNum(numbers[current]);

        setIsPicking(true);
        let delay = Math.floor(Math.random() * 20) + 5;

        const animate = () => {
            if (delay < 320) {
                current = (current + 1) % numbers.length;
                setDisplayNum(numbers[current]);
                delay += delay / 10;
                timerRef.current = window.setTimeout(animate, delay);
            } else {
                setIsPicking(false);
                onPick(numbers[current]);
            }
        };
        animate();
    };

    return (
        <>
            {/* The pick button */}
            <button
                onClick={handlePick}
                aria-label="Pick a random song"
                className="px-2 py-2 bg-transparent text-white hover:text-blue-200 rounded"
            >
                <i className="bi bi-stars text-xl" aria-hidden="true"></i>
            </button>

            {/* Full-screen overlay during animation */}
            {isPicking && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    {/* Centre box */}
                    <div className="flex items-center justify-center w-48 h-48 bg-black/80 rounded">
                        <span className="text-white text-5xl font-bold">
                            {displayNum}
                        </span>
                    </div>
                </div>
            )}
        </>
    );
};

export default RandomPicker;
