"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const BOOKS = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
    "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms",
    "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
    "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
    "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
    "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
    "1 John", "2 John", "3 John", "Jude", "Revelation"
];

// Roman numeral mapping
const ROMAN_MAP: Record<string, string> = {
    I: "1",
    II: "2",
    III: "3"
};

const TRANSLATIONS = ["KJV", "NKJV", "NIV"];
const BIBLE_API_ENDPOINT = process.env.NEXT_PUBLIC_DB_URL;

export default function BibleReader() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [query, setQuery] = useState("");
    const [translation, setTranslation] = useState("NKJV");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [result, setResult] = useState<Record<string, string> | null>(null);
    const [loading, setLoading] = useState(false);

    // mount portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Suggest books from prefix
    useEffect(() => {
        const inputBook = query.split(" ")[0]?.trim();
        if (!inputBook) {
            setSuggestions([]);
            return;
        }

        const normalized = inputBook.replace(/\./g, "").toLowerCase();
        const matches = BOOKS.filter(b =>
            b.toLowerCase().startsWith(normalized)
        );
        if (
            matches.length === 1 &&
            matches[0].toLowerCase() === normalized.toLowerCase()
        ) {
            setSuggestions([]); // already exact
        } else {
            setSuggestions(matches.slice(0, 5));
        }
    }, [query]);

    // Bg content lock to prevent unwanted scrollin'
    useEffect(() => {
        if (open) {
            // prevent scrolling/dragging
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
        } else {
            // restore
            document.body.style.overflow = "";
            document.body.style.position = "";
            document.body.style.width = "";
        }

        // clean up in case component unmounts while still open
        return () => {
            document.body.style.overflow = "";
            document.body.style.position = "";
            document.body.style.width = "";
        };
    }, [open]);

    async function handleFind() {
        try {
            setLoading(true);
            setResult(null);

            // clear suggestions
            setSuggestions([]);

            // Parse "Genesis 3:1-5"
            const regex = /^([\w\s]+)\s+(\d+):?\s*([\divx]*)-?([\divx]*)$/i;
            const match = query.match(regex);
            if (!match) {
                alert("Invalid format. Example: Genesis 3:1-5");
                return;
            }

            // eslint-disable-next-line prefer-const
            let [, rawBook, rawChapter, rawStart, rawEnd] = match;

            // Normalize book name (handle Roman numerals like "I John")
            rawBook = rawBook.trim();
            const parts = rawBook.split(" ");
            if (ROMAN_MAP[parts[0]?.toUpperCase()]) {
                parts[0] = ROMAN_MAP[parts[0].toUpperCase()];
                rawBook = parts.join(" ");
            }

            // ---- Book name prefix matching ----
            const normalized = rawBook.toLowerCase();
            const candidates = BOOKS.filter(b =>
                b.toLowerCase().startsWith(normalized)
            );

            if (candidates.length === 0) {
                alert("Unknown book name.");
                return;
            } else if (candidates.length > 1) {
                alert(
                    "Ambiguous book name input. Did you mean: " + candidates.join(", ") + "?"
                );
                return;
            }

            const book = candidates[0];

            const chapter = rawChapter;
            const verse_start = rawStart || "";
            const verse_end = rawEnd || rawStart || "";

            const url = `${BIBLE_API_ENDPOINT}/bible-verse?translation=${translation}&book=${encodeURIComponent(
                book
            )}&chapter=${chapter}${verse_start ? `&verse_start=${verse_start}` : ""
                }${verse_end ? `&verse_end=${verse_end}` : ""}`;

            const res = await fetch(url);
            if (!res.ok) {
                alert("API Error: " + res.status);
                return;
            }
            const data = await res.json();
            setResult(data);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch verse.");
        } finally {
            setLoading(false);
        }
    }

    // Quick fill from sugestions (only if there's only one available)
    const autoFillBookName = () => {
        if (suggestions.length === 1) {
            setQuery(suggestions[0] + " ");
            setSuggestions([]);
        }
    }

    const windowEl = (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40">
            <div className="bg-white shadow-xl rounded-lg mt-12 pb-7 w-full max-w-7xl p-4 relative min-h-1/4 max-h-[90vh] overflow-auto">
                {/* Close */}
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-2 right-2 text-black hover:text-red-900"
                >
                    <i className="text-2xl bi bi-x-lg"></i>
                </button>

                {/* First row */}
                <div className="flex gap-2 mt-7">
                    <select
                        className="border rounded px-2"
                        value={translation}
                        onChange={e => setTranslation(e.target.value)}
                    >
                        {TRANSLATIONS.map(t => (
                            <option key={t} value={t} >
                                {t}
                            </option>
                        ))}
                    </select>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2"
                            placeholder="e.g. Genesis 3:1-5"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleFind();
                                }else if (e.key === "Tab") {
                                    e.preventDefault();
                                    autoFillBookName();
                                }
                            }}
                        />
                        {suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 bg-white border mt-1 rounded shadow opacity-90">
                                {suggestions.map(s => (
                                    <div
                                        key={s}
                                        onClick={() => {
                                            setQuery(s + " ");
                                            setSuggestions([]);
                                        }}
                                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* inline - find text btn for tablet/desktop view */}
                    <div className="w-1/4 md:block hidden">
                        <button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                            onClick={handleFind}
                        >
                            {loading ? "Loading..." : "Find Verse"}
                        </button>
                    </div>
                </div>

                {/* full width - find text btn for mobile view */}
                <div className="mt-3 md:hidden">
                    <button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                        onClick={handleFind}
                    >
                        {loading ? "Loading..." : "Find Verse"}
                    </button>
                </div>

                {/* Result */}
                {result ? (
                    <div className="mt-4 space-y-2">
                        {Object.entries(result).map(([num, text]) => (
                            <p key={num} className="text-gray-900 font-bible text-xl">
                                <sup className="text-2xs align-super mr-1 !text-gray-500">{num}</sup>
                                {text}
                            </p>
                        ))}
                    </div>
                ) :
                <h5 className="text-center mt-7 md:mt-16 text-gray-600">Start by type the Bible verse for today.</h5>
                }
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="bg-blue-600/50 text-white p-3 rounded-full shadow hover:bg-blue-700/70"
            >
                <i className="bi bi-book"></i>
            </button>
            {mounted && open && createPortal(windowEl, document.body)}
        </>
    );
}
