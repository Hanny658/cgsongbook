"use client";

import React, { useState, useRef, useEffect } from "react";

interface RandomPickerProps {
    /** Highest number (inclusive) to pick from; must be ≥ 1 */
    maxNum: number;
    /** Called once the animation stops, with the selected number */
    onPick: (num: number) => void;
}

const RandomPicker: React.FC<RandomPickerProps> = ({ maxNum, onPick }) => {
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
        if (maxNum < 1) return;

        let current = Math.floor(Math.random() * maxNum) + 1;
        setDisplayNum(current);

        setIsPicking(true);
        let delay = Math.floor(Math.random() * 20) + 5;

        const animate = () => {
        current = current >= maxNum ? 1 : current + 1;
        setDisplayNum(current);

        if (delay < 320) {
            delay += delay / 10;
            timerRef.current = window.setTimeout(animate, delay);
        } else {
            setIsPicking(false);
            onPick(current == 1 ? maxNum : current - 1);
        }
        };
        animate();
    };

    return (
        <>
            {/* The pick button */}
            <button
                onClick={handlePick}
                className="px-2 py-2 bg-transparen text-white hover:text-blue-200 rounded"
            >
                <i className="bi bi-stars text-xl" aria-hidden="true"></i>
                {/* <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Pick Random
                </span> */}
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
