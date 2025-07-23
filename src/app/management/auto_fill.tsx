// app/management/auto_fill.tsx
'use client';

import React, { useState } from 'react';

interface AutoFillButtonProps {
    /** Called with the generated SongData on success */
    onDataReady: (data: SongData) => void;
}

const AutoFillButton: React.FC<AutoFillButtonProps> = ({ onDataReady }) => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Open the modal
    const handleOpen = () => {
        setError('');
        setText('');
        setOpen(true);
    };

    // Close and clear state
    const handleClose = () => {
        if (loading) return; // prevent closing mid‑request
        setOpen(false);
        setError('');
    };

    // Submit to backend and propagate the result
    const handleSubmit = async () => {
        setError('');
        if (!text.trim()) {
            setError('Input text cannot be empty.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auto-fill-songdata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            const payload = await res.json();
            if (!res.ok) {
                setError(payload.error || 'Failed to generate song data.');
            } else {
                onDataReady(payload as SongData);
                setOpen(false);
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Trigger button */}
            <button
                type="button"
                onClick={handleOpen}
                className="w-full h-full px-3 py-1 bg-blue-400 text-white rounded hover:bg-blue-500"
            >
                <i className="bi bi-magic"></i> Auto‑fill
            </button>

            {/* Modal overlay */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* semi‑transparent background */}
                    <div
                        className="absolute inset-0 bg-black opacity-50"
                        onClick={handleClose}
                    />

                    {/* Modal window */}
                    <div className="relative bg-white rounded-lg shadow-lg w-11/12 max-w-2xl p-4 md:p-6">
                        <h2 className="text-xl font-semibold mb-4">[Beta] Auto‑fill Song Data </h2>

                        {/* Textarea for plain text */}
                        <textarea
                            className="w-full h-48 p-2 border rounded resize-y focus:outline-none focus:ring"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            maxLength={4000}
                            placeholder="Paste plain lyrics or text here (max 4000 chars)…"
                        />

                        <p className="mt-2 text-xs text-gray-500">
                            Submitting may replace all current data in the editor, and auto-filling is never perfect (especially for the chords-lyrics sync), please check through the editor after auto-filled.
                        </p>

                        {/* Error message */}
                        {error && (
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                                {loading ? 'Processing…' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AutoFillButton;
