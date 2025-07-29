// app/editor/song_edit.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from '@hello-pangea/dnd';
import AutoFillButton from './auto_fill';


interface SongEditProps {
    songdata?: SongData;
    existingNumbers: number[];
    onCancel: () => void;
}

const SongEdit: React.FC<SongEditProps> = ({ songdata, existingNumbers, onCancel }) => {
    // Blank template
    const blank: SongData = {
        title: '',
        link: '',
        number: 0,
        lyrics: [
            {
                id: '',
                label: '',
                lines: [{ chords: '', lyrics: '' }],
            },
        ],
        song: [''],
    };

    // Initialize form state (deep copy if editing)
    const [form, setForm] = useState<SongData>(
        songdata
            ? {
                ...songdata,
                lyrics: songdata.lyrics.map(sec => ({
                    id: sec.id,
                    label: sec.label,
                    lines: sec.lines.map(line => ({ ...line })),
                })),
                song: [...songdata.song],
            }
            : blank
    );

    // Controlls Submission loading state
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Tracks duplicated IDs
    const [number, setNumber] = useState(songdata?.number || 0);
    const [dupError, setDupError] = useState('');
    // Whenever number changes, validate it
    useEffect(() => {
        const isSameAsOld = songdata?.number === number;
        if (!isSameAsOld && existingNumbers.includes(number)) {
            setDupError(`Number ${number} already exists.`);
        } else {
            setDupError('');
            updateField('number', number);
        }
    }, [number, existingNumbers, songdata]);

    // Generates a ID that is not any from the reserved set
    const generateUniqueId = (reserved: Set<string>): string => {
        let id: string;
        do {
            id = Array.from({ length: 8 })
            .map(() => Math.floor(Math.random() * 10).toString())
            .join('');
        } while (reserved.has(id));
        return id;
    };

    // Dragable item (keep a parallel)
    type DragItem = { secId: string; uid: string };
    const [dragItems, setDragItems] = useState<DragItem[]>(() => {
        // Only section IDs are reserved at first; no dragItems yet
        const reserved = new Set(form.lyrics.map((s) => s.id));
        return form.song.map((secId) => ({
            secId,
            uid: generateUniqueId(reserved),
        }));
    });

    // Track if user has modified anything
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        if (form !== (songdata ?? blank)) setDirty(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, songdata]);

    // Helpers to update state and mark dirty
    const updateField = <K extends keyof SongData>(key: K, value: SongData[K]) => {
        setForm(f => ({ ...f, [key]: value }));
    };

    // Handler to receive filled data
    const handleAutoFill = (newData: SongData) => {
        setForm(newData);      // replace entire form
        setDirty(true);        // mark as edited
    };

    // Reorder `form.song` when a drag ends
    const handleDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) { // while holding the item
            return;
        }
        if ( // handle same pos
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }
        setDragItems((items) => {
            const reordered = Array.from(items);
            const [moved] = reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, moved);
            updateField(
                'song',
                reordered.map((it) => it.secId)
            );
            return reordered;
        });
    };

    // --- Song[] handlers ---
    const setSongItem = (idx: number, secId: string) => {
        setDragItems((items) => {
            const updated = items.map((it, i) =>
                i === idx ? { ...it, secId } : it
            );
            // sync back into form
            updateField(
                'song',
                updated.map((it) => it.secId)
            );
            return updated;
        });
    };
    // append a brand‑new slot
    const addSongItem = () => {
        setDragItems((items) => {
            // Reserve both section IDs and all existing UIDs
            const reserved = new Set<string>([
                ...form.lyrics.map((s) => s.id),
                ...items.map((d) => d.uid),
            ]);
            const newItem: DragItem = { secId: '', uid: generateUniqueId(reserved) };
            const updated = [...items, newItem];
            updateField(
                'song',
                updated.map((it) => it.secId)
            );
            return updated;
        });
    };

    // remove one slot
    const delSongItem = (idx: number) => {
        setDragItems((items) => {
            const updated = items.filter((_, i) => i !== idx);
            updateField(
                'song',
                updated.map((it) => it.secId)
            );
            return updated;
        });
    };

    // --- Sections & lines handlers ---
    const setSectionLabel = (sidx: number, val: string) => {
        const secs = form.lyrics.map((sec, i) =>
            i === sidx ? { ...sec, label: val } : sec
        );
        updateField('lyrics', secs);
    };
    const addSection = () => {
        const reserved = new Set([...form.lyrics.map((s) => s.id)]); // Dynamic compute reserved ID
        const secs = [
            ...form.lyrics,
            { id: generateUniqueId(reserved), label: '', lines: [{ chords: '', lyrics: '' }] },
        ];
        updateField('lyrics', secs);
    };
    const delSection = (sidx: number) => {
        const secs = form.lyrics.filter((_, i) => i !== sidx);
        updateField('lyrics', secs);
    };

    const setLine = (
        sidx: number,
        lidx: number,
        key: keyof SongLine,
        val: string
    ) => {
        const secs = form.lyrics.map((sec, i) => {
            if (i !== sidx) return sec;
            const lines = sec.lines.map((ln, j) =>
                j === lidx ? { ...ln, [key]: val } : ln
            );
            return { ...sec, lines };
        });
        updateField('lyrics', secs);
    };
    const addLine = (sidx: number) => {
        const secs = form.lyrics.map((sec, i) =>
            i === sidx
                ? { ...sec, lines: [...sec.lines, { chords: '', lyrics: '' }] }
                : sec
        );
        updateField('lyrics', secs);
    };
    const delLine = (sidx: number, lidx: number) => {
        const secs = form.lyrics.map((sec, i) => {
            if (i !== sidx) return sec;
            const lines = sec.lines.filter((_, j) => j !== lidx);
            return { ...sec, lines };
        });
        updateField('lyrics', secs);
    };

    // --- Cancel handler ---
    const handleCancel = () => {
        if (dirty) {
            if (!confirm('All changes will be discarded. Are you sure you want to continue?'))
                return;
        }
        onCancel();
    };

    // --- Submit handler ---
    const handleSubmit = async () => {
        // Basic required-field validation
        if (!form.title.trim()) {
            alert('Title is required.');
            return;
        }
        if (!form.number || form.number <= 0) {
            alert('Number must be a positive integer.');
            return;
        }
        if (dupError) {
            alert(dupError);
            return;
        }
        for (const [i, s] of form.lyrics.entries()) {
            if (!s.label.trim()) {
                alert(`Section ${i + 1} label is required.`);
                return;
            }
        }
        if (form.song.some(line => !line.trim())) {
            alert('All entries in the "song" list must be non-empty.');
            return;
        }
        setSubmitting(true);

        // Clean out empty SongLine entries
        const cleaned: SongData = {
            ...form,
            lyrics: form.lyrics.map(sec => ({
                ...sec,
                lines: sec.lines.filter(
                    ln => ln.chords.trim() !== '' || ln.lyrics.trim() !== ''
                ),
            })),
        };

        try {
            const res = await fetch(`/api/songs/${cleaned.number}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleaned),
            });
            const payload = await res.json();
            if (!res.ok) {
                alert(payload.error || 'Save failed');
                return;
            }
            alert('Saved successfully.');
            onCancel();
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 relative text-black">
            {/* Title, Link, Number */}
            <div className="flex flex-warp gap-4">
                <div className="flex-1/5 md:flex-2/12">
                    <label className="block font-medium">Number*</label>
                    <input
                        type="number"
                        value={number==0 ? '': number}
                        min={0}
                        onChange={e => setNumber(parseInt(e.target.value, 10) || 0)}
                        className={`w-full p-2 border placeholder-gray-500 rounded ${dupError ? 'border-red-500' : ''
                            }`}
                    />
                    {dupError && (
                        <p className="mt-1 text-sm text-red-600">{dupError}</p>
                    )}
                </div>
                <div className="flex-3/5 md:flex-9/12">
                    <label className="block font-medium">Title*</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={e => updateField('title', e.target.value)}
                        className="w-full p-2 border rounded placeholder-gray-500"
                    />
                </div>
                <div className="hidden md:block">
                    <AutoFillButton onDataReady={handleAutoFill} />
                </div>
                <div className="block md:hidden fixed bottom-5 right-5">
                    <AutoFillButton onDataReady={handleAutoFill} />
                </div>
            </div>
            <div className="w-full">
                <label className="block font-medium text-black">Link (optional)</label>
                <input
                    type="text"
                    value={form.link}
                    placeholder='example: https://www.youtube.com/watch?v=TheYtbLink'
                    onChange={e => updateField('link', e.target.value)}
                    className="w-full p-2 border rounded text-black placeholder-gray-300"
                />
            </div>

            {/* Song: simple list of strings */}
            <div>
                <h3 className="font-semibold mb-2">Section Order*</h3>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="section-order">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="space-y-2"
                            >
                                {dragItems.map((item, idx) => (
                                    <Draggable
                                        key={item.uid}
                                        draggableId={item.uid}
                                        index={idx}
                                    >
                                        {(prov, snapshot) => (
                                            <div
                                                ref={prov.innerRef}
                                                {...prov.draggableProps}
                                                {...prov.dragHandleProps}
                                                className={`flex items-center gap-2 p-2 border rounded ${snapshot.isDragging ? 'bg-blue-200' : 'bg-blue-50'
                                                    }`}
                                            >
                                                {/* Dropdown still driven by real section IDs */}
                                                <select
                                                    value={item.secId}
                                                    onChange={(e) => setSongItem(idx, e.target.value)}
                                                    className="flex-3/4 p-2 border bg-white rounded shadow-2xs shadow-black/30 placeholder-gray-500"
                                                >
                                                    <option value="">-- select section --</option>
                                                    {form.lyrics.map((sec) => (
                                                        <option key={sec.id} value={sec.id}>
                                                            {sec.label || sec.id}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className='flex-1/4 text-center'>
                                                    <i className="bi bi-arrow-down"></i>
                                                    <i className="bi bi-hand-index-thumb"></i>
                                                    <i className="bi bi-arrow-up"></i>
                                                </div>
                                                <button onClick={() => delSongItem(idx)}>
                                                    <i className="bi bi-dash-circle-dotted text-xl text-red-500" />
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}

                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                <button onClick={addSongItem} className='w-full mt-2 text-left px-4 rounded bg-gray-200/50 hover:bg-green-500/80 border-0 text-green-500 hover:!text-white'>
                    <i className="bi bi-plus-circle-dotted text-xl"></i> Put another Section here
                </button>
            </div>

            {/* Lyrics sections */}
            <div>
                <h3 className="font-semibold mb-2">Lyrics Sections</h3>
                {form.lyrics.map((sec, si) => (
                    <div key={sec.id} className="border p-4 rounded mb-4 shadow-xs shadow-black/20 bg-purple-100/50">
                        <div className="flex items-center justify-between mb-3">
                            <label className="font-medium">Section Label* <span className='text-xs text-gray-700'>(Displays on the side of lyrics&chords)</span></label>
                            <div className="flex gap-2">
                                <button onClick={() => delSection(si)}>
                                    <i className="bi bi-dash-circle-dotted text-xl text-red-500"></i>
                                </button>
                            </div>
                        </div>
                        {/* Section Label */}
                        <input
                            type="text"
                            value={sec.label}
                            onChange={e => setSectionLabel(si, e.target.value)}
                            className="w-full p-2 border rounded mb-3 placeholder-gray-500"
                        />

                        {/* Lines */}
                        {sec.lines.map((ln, li) => (
                            <div key={li} className="flex gap-2 mb-2 rounded bg-purple-100">
                                <div className='text-sm flex-11/12'>
                                    <input
                                        type="text"
                                        placeholder="Chords"
                                        value={ln.chords}
                                        onChange={e => setLine(si, li, 'chords', e.target.value)}
                                        className="w-full p-1 border rounded font-chords placeholder-gray-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Lyrics"
                                        value={ln.lyrics}
                                        onChange={e => setLine(si, li, 'lyrics', e.target.value)}
                                        className="w-full p-1 border rounded font-chords placeholder-gray-500"
                                    />
                                </div>
                                <button onClick={() => delLine(si, li)} className='flex-1/12'>
                                    <i className="bi bi-dash-circle-dotted text-xl text-red-500"></i>
                                </button>
                            </div>
                        ))}
                        <button onClick={() => addLine(si)} className='w-full rounded bg-gray-200/50 hover:bg-green-500/80 border-0 text-green-500 hover:!text-white'>
                            <i className="bi bi-plus-circle-dotted text-xl"></i> Add a new Line
                        </button>
                    </div>
                ))}
                <button onClick={addSection} className='w-full rounded bg-gray-200/50 hover:bg-green-500/80 border-0 text-green-500 hover:!text-white'>
                    <i className="bi bi-plus-circle-dotted text-xl"></i> Add a new Section
                </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
                <button
                    className="px-4 py-2 flex-1/2 border rounded hover:bg-gray-100"
                    onClick={handleCancel}
                >
                    Cancel
                </button>
                {submitting ?
                <button
                    className="px-4 py-2 flex-1/2 bg-blue-800 text-white rounded"
                >
                    Submitting...
                </button>
                :
                <button
                    className="px-4 py-2 flex-1/2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={handleSubmit}
                >
                    Submit
                </button>
                }
            </div>
            <div className="block md:hidden h-7" />
        </div>
    );
};

export default SongEdit;
