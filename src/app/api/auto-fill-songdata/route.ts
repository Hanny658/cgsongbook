/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/auto-fill-songdata/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Simple runtime check for SongData
function isValidSongData(obj: any): obj is SongData {
    if (typeof obj !== 'object' || obj === null) return false;
    if (typeof obj.title !== 'string') return false;
    if (obj.link !== undefined && typeof obj.link !== 'string') return false;
    if (typeof obj.number !== 'number') return false;
    if (!Array.isArray(obj.lyrics)) return false;
    for (const sec of obj.lyrics) {
        if (typeof sec !== 'object' || sec === null) return false;
        if (typeof sec.id !== 'string' || typeof sec.label !== 'string') return false;
        if (!Array.isArray(sec.lines)) return false;
        for (const ln of sec.lines) {
            if (
                typeof ln !== 'object' ||
                ln === null ||
                typeof ln.chords !== 'string' ||
                typeof ln.lyrics !== 'string'
            )
                return false;
        }
    }
    if (!Array.isArray(obj.song)) return false;
    if (obj.song.some((line: any) => typeof line !== 'string')) return false;
    return true;
}

export async function POST(request: NextRequest) {
    console.log("Starting a Song Data Auto-Fill session...")
    try {
        const { text } = await request.json();
        if (typeof text !== 'string' || text.trim() === '') {
            console.error("'text' is invalid.. exit");
            return NextResponse.json(
                { error: '`text` must be a non-empty string' },
                { status: 400 }
            );
        }

        const key = process.env.AUTOMATION_KEY;
        if (!key) {
            console.error(".env KEY not found.. exit");
            throw new Error('Missing AUTOMATION_KEY environment variable');
        }

        const openai = new OpenAI({ apiKey: key });
        // Build the user prompt
        let lastError = '';
        const prompt = `
Convert the following plain text of a Christian song into a JSON object matching this TypeScript interface exactly:

interface SongData {
  title: string;
  link?: string;
  number: number;
  lyrics: { id: string; label: string; lines: { chords: string; lyrics: string }[] }[];
  song: string[];
}
Each item in lyrics{} represent a song section, the line{} in sections contains the chords and lyrics for the line (be caution of lines with no chords or no lyrics).
Please preserve white spaces each line in front of chords or lyrics.
Sections cannot have the same id. For exact same sections, just keep one but put it multiple times in song string[] with its id.
Where the song: string[]; records order of song sections with their id from lyrics array, can hold duplicates and in the order of displaying. 
If no link is detected, give link an empty string.

${lastError && lastError}

— Output only the raw JSON (no markdown, no code fences, no commentary):
"${text.replace(/"/g, '\\"')}"
`;

        for (let attempt = 1; attempt <= 3; attempt++) {
            const resp = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a JSON-only formatter. Always output only valid JSON matching the requested schema.',
                    },
                    { role: 'user', content: prompt.trim() },
                ],
                temperature: 0,
            });

            const content = resp.choices?.[0]?.message?.content?.trim() || '';
            try {
                const parsed = JSON.parse(content);
                if (isValidSongData(parsed)) {
                    console.log("Valid data get, returning to frontend.");
                    return NextResponse.json(parsed);
                } else {
                    lastError = 'The last Response JSON did not match SongData schema, please retry.';
                }
            } catch (e) {
                console.warn(e);
                lastError = 'The last Response was not valid JSON, please retry.';
            }
        }

        // If we get here, all attempts failed
        console.error("Attempted too many times with no valid response.. exit");
        return NextResponse.json(
            { error: 'Failed to process... No valid SongData can be obtained.' },
            { status: 500 }
        );
    } catch (err: any) {
        const msg =
            err instanceof Error ? err.message : 'Internal server error';
        console.error("Unknown Error encountered.. exit");
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
