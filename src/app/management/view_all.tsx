/* eslint-disable @typescript-eslint/no-explicit-any */
// app/management/view_all.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface ViewAllProps {
    metas: SongMeta[];
    onEdit: (song: SongData) => void;
}

const ViewAll: React.FC<ViewAllProps> = ({ metas, onEdit }) => {
    const [filtered, setFiltered] = useState<SongMeta[]>([]);
    const [search, setSearch] = useState('');

    // Filter whenever search or songs change
    useEffect(() => {
        const term = search.trim().toLowerCase();
        if (!term) return setFiltered(metas);

        setFiltered(
            metas.filter(s =>
                s.title.toLowerCase().includes(term)
                || String(s.number).includes(term)
            )
        );
    }, [search, metas]);

    // Handle clicking a song: fetch full data and pass to onEdit
    const handleClick = async (num: number) => {
        try {
            const res = await fetch(`/api/songs/${num}`);
            const data: SongData = await res.json();
            if (!res.ok) throw new Error((data as any).error || 'Fetch failed');
            onEdit(data);
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search bar */}
            <input
                type="text"
                placeholder="Search by number or title"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full p-2 border rounded text-black placeholder-gray-500"
            />

            {/* Song list */}
            <ul className="space-y-2">
                {filtered.map(song => (
                    <li key={song.number}>
                        <button
                            onClick={() => handleClick(song.number)}
                            className="w-full text-left p-3 text-black bg-gray-200/80 border rounded hover:bg-gray-300 transition"
                        >
                            <span className="font-semibold">{song.number}.</span>{' '}
                            <span>{song.title}</span>
                        </button>
                    </li>
                ))}
                {filtered.length === 0 && (
                    <li className="text-center text-gray-500">Still Loading.. / No songs found.</li>
                )}
            </ul>
        </div>
    );
};

export default ViewAll;
