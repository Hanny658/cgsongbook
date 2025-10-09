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

const RECOM_VERSES: string[] = [
    "John 3: 16-21", "John 3: 16", "Jeremiah 29: 11-12", "Proverbs 3: 5-6", "Philippians 4: 10-13",
    "Isaiah 41: 10", "Matthew 28: 19-20", "John 14: 13-21", "Romans 8: 28", "1 Peter 5: 6-7"
]

// Roman numeral mapping
const ROMAN_MAP: Record<string, string> = {
    I: "1",
    II: "2",
    III: "3",
    i: "1",
    ii: "2",
    iii: "3"
};
type TranslationKey = "KJV" | "NET" /*| "NKJV" | "NIV"*/;
const TRANSLATIONS_CPRIGHT = {
    KJV: "Rights in the Authorized (King James) Version in the United Kingdom are vested in the Crown. Published by permission of the Crown's patentee, Cambridge University Press.", 
    NET: "Scripture quoted by permission. Quotations designated are from the NET Bible® copyright ©1996 by Biblical Studies Press, L.L.C. https://netbible.com All rights reserved", 
    // NKJV: "The Holy Bible, New King James Version, Copyright 1982 Thomas Nelson. All rights reserved.", 
    // NIV: "The Holy Bible, New International Version® NIV® Copyright 2011 by Biblica, Inc. Used by Permission of Biblica, Inc.® All rights reserved worldwide."
};
const BIBLE_API_ENDPOINT = process.env.NEXT_PUBLIC_DB_URL;

export default function BibleReader() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [recVerse, setRecVerse] = useState("");

    const [query, setQuery] = useState("");
    const [translation, setTranslation] = useState<TranslationKey>("KJV");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [result, setResult] = useState<Record<string, string> | null>(null);
    const [loading, setLoading] = useState(false);
    const [copyrightText, setCopyrightText] = useState("");

    // mount portal and load recommended verse
    useEffect(() => {
        setMounted(true);
        const randomIndex = Math.floor(Math.random() * RECOM_VERSES.length);
        setRecVerse(RECOM_VERSES[randomIndex]);
    }, []);

    // Suggest books from prefix
    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            return;
        }

        // Tokenize query by whitespace
        const parts = query.trim().split(/\s+/);

        let firstWord: string;

        // If query starts with a digit prefix (1/2/3) or roman numeral (I/II/III)
        if (["1", "2", "3", "I", "II", "III", "i", "ii", "iii"].includes(parts[0])) {
            if (parts.length > 1) {
                // Normalize roman to digit if needed
                const numPrefix = ROMAN_MAP[parts[0]] ?? parts[0];
                // Join prefix + next token (e.g. "2 John")
                firstWord = `${numPrefix} ${parts[1]}`;
            } else {
                // Only prefix typed (no next token yet)
                firstWord = ROMAN_MAP[parts[0]] ?? parts[0];
            }
        } else {
            firstWord = parts[0];
        }

        // Normalize: remove dots, lowercase
        const normalized = firstWord.replace(/\./g, "").toLowerCase();

        const matches = BOOKS.filter(b =>
            b.toLowerCase().startsWith(normalized)
        );

        if (
            matches.length === 1 &&
            matches[0].toLowerCase() === normalized
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

            // Parse Bible Verse text
            const regex = /^([\w\s]+)\s+(\d+)(?:\s*:\s*([\divx]+)(?:\s*-\s*([\divx]+))?)?$/i;
            const match = query.match(regex);
            if (!match) {
                alert("Invalid format. Example: Genesis 1:2-5");
                return;
            }

            // eslint-disable-next-line prefer-const
            let [, rawBook, rawChapter, rawStart, rawEnd] = match;

            // Split and normalize Roman prefix to numeric
            const parts = rawBook.trim().split(/\s+/);
            const roman = ROMAN_MAP[parts[0].toUpperCase()];
            if (roman) {
                parts[0] = roman;
                rawBook = parts.join(" ");
            }
            if (rawBook === "Psalm") rawBook = "Psalms"; 

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

            let book = candidates[0];
            // For plural refs for Psalms (data source is singular)
            if (book === "Psalms") book = "Psalm";

            const chapter = rawChapter;
            const verse_start = rawStart || "";
            const verse_end = rawEnd || rawStart || "";

            const url = `${BIBLE_API_ENDPOINT}/bible-verse?translation=${translation}&book=${encodeURIComponent(
                book
            )}&chapter=${chapter}${verse_start ? `&verse_start=${verse_start}` : ""
                }${verse_end ? `&verse_end=${verse_end}` : ""}`;

            const res = await fetch(url);
            if (!res.ok) {
                const errorRes = await res.json();
                alert("API Error: " + errorRes.error);
                return;
            }
            setCopyrightText(TRANSLATIONS_CPRIGHT[translation]);
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
            return;
        }
        if (!query) {
            setQuery(recVerse);
            setSuggestions([]);
            return;
        }
    }

    const windowEl = (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50">
            <div className="bg-white shadow-xl rounded-lg mt-5 md:mt-0 pb-7 w-full max-w-7xl p-4 relative min-h-1/3 md:min-h-1/4 max-h-[90vh] lg:max-h-screen overflow-auto">
                {/* Close for both left& right */}
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-2 left-2 text-black hover:text-red-900"
                >
                    <i className="text-2xl bi bi-chevron-left"></i>
                </button>
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-2 right-2 text-black hover:text-red-900"
                >
                    <i className="text-2xl bi bi-x-lg"></i>
                </button>

                {/* Title */}
                <p className="font-bible text-sky-500 text-center">The Scripture</p>

                {/* Result for mobile */}
                <div className="md:hidden">
                {result ? (
                    <div className="mt-4 space-y-2">
                        {Object.entries(result).map(([num, text]) => (
                            <p key={num} className="text-gray-900 font-bible text-xl mt-1 md:px-4">
                                <sup className="text-2xs align-super mr-1 !text-gray-500">{num}</sup>
                                {text}
                            </p>
                        ))}
                        <p className="text-xs text-gray-400/80 text-center px-2 mt-4">{copyrightText}</p>
                    </div>
                ) :
                <h5 className="text-center mt-14 mb-14 md:mt-16 text-gray-600">Start by type the Bible verse for today.</h5>
                }
                </div>

                {/* First row */}
                <div className="flex gap-2 mt-2 text-black">
                    <select
                        className="border rounded px-2"
                        value={translation}
                        onChange={e => setTranslation(e.target.value as TranslationKey)}
                    >
                        {Object.keys(TRANSLATIONS_CPRIGHT).map(t => (
                            <option key={t} value={t} >
                                {t}
                            </option>
                        ))}
                    </select>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2"
                            placeholder={`e.g. ${recVerse}`}
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
                            className="w-full bg-blue-600 hover:bg-blue-700 !text-white py-2 rounded"
                            onClick={handleFind}
                        >
                            {loading ? "Loading..." : "Find Verse"}
                        </button>
                    </div>
                </div>

                {/* full width - find text btn for mobile view */}
                <div className="mt-3 md:hidden">
                    <button
                        className="w-full bg-blue-600 hover:bg-blue-700 !text-white py-1 rounded"
                        onClick={handleFind}
                    >
                        {loading ? "Loading..." : "Find Verse"}
                    </button>
                </div>
                {/* Result for Tablet and PC */}
                <div className="md:block hidden">
                {result ? (
                    <div className="mt-4 space-y-2">
                        {Object.entries(result).map(([num, text]) => (
                            <p key={num} className="text-gray-900 font-bible text-xl mt-1 md:px-4">
                                <sup className="text-2xs align-super mr-1 !text-gray-500">{num}</sup>
                                {text}
                            </p>
                        ))}
                        <p className="text-xs text-gray-400/80 text-center px-2 mt-4">{copyrightText}</p>
                    </div>
                ) :
                <h5 className="text-center mt-7 md:mt-16 text-gray-600">Start by type the Bible verse for today.</h5>
                }
                </div>
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
