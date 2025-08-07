// utils/loading-indicator.tsx
'use client';

import React from 'react';

/**
 * Props for LoadingIndicator
 * @param color - CSS color value for the icons (defaults to white)
 */
interface LoadingIndicatorProps {
    color?: string;
}

/**
 * LoadingIndicator
 * 
 * Renders three musical note icons in a row with a staggered "waving" animation.
 * - Base state: 80% opacity, scale(1)
 * - Wave state: 100% opacity, scale(1.25)
 * 
 * @param color - Optional icon color, default is 'white'.
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ color = 'white' }) => {
    // Define the sequence of Bootstrap Icon classes
    const notes = ['bi-music-note', 'bi-music-note-beamed', 'bi-music-note'];

    return (
        <div className="flex items-center space-x-2">
            {notes.map((iconClass, idx) => (
                <i
                    key={idx}
                    className={`bi text-2xl ${iconClass} wave-icon`}  // Icon and animation class
                    style={{
                        color,                                 // Apply prop color
                        animationDelay: `${idx * 0.1}s`,      // Stagger each icon
                    }}
                />
            ))}

            {/* Scoped styles via styled-jsx */}
            <style jsx>{`
        .wave-icon {
          /* Initial state */
            opacity: 0.8;
            transform: scale(1);
            animation: wave 0.5s infinite ease-in-out;
        }

        @keyframes wave {
            0%, 100% {
            opacity: 0.8;
            transform: scale(1);
            }
        50% {
            opacity: 1;
            transform: scale(1.25);
        }
        }
        `}</style>
        </div>
    );
};

export default LoadingIndicator;
