/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/auto-fill-songdata/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSessionUser, unauthorized } from '../../lib/session';

const MAX_TEXT_LENGTH = 4000; // same limit as the editor's textarea
// Model used for auto-fill; override with the AUTOMATION_MODEL environment variable
const MODEL = process.env.AUTOMATION_MODEL?.trim() || 'gpt-4o-mini';
// Optional effort level for reasoning models (e.g. "low"); when set, `temperature` is not sent
const REASONING_EFFORT = process.env.AUTOMATION_REASONING_EFFORT?.trim() || '';
// Classic models get temperature 0; switched off automatically if the model rejects the parameter
let useTemperature = !REASONING_EFFORT;

function isUnsupportedTemperatureError(err: unknown): boolean {
    return (
        err instanceof OpenAI.APIError &&
        err.status === 400 &&
        (err.param === 'temperature' || /temperature/i.test(err.message))
    );
}

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
    try {
        // Only logged-in editors may spend the automation quota
        if (!(await getSessionUser())) return unauthorized();

        console.log("Starting a Song Data Auto-Fill session...")
        const { text } = await request.json();
        if (typeof text !== 'string' || text.trim() === '' || text.length > MAX_TEXT_LENGTH) {
            console.error("'text' is invalid.. exit");
            return NextResponse.json(
                { error: `\`text\` must be a non-empty string of at most ${MAX_TEXT_LENGTH} characters` },
                { status: 400 }
            );
        }

        const key = process.env.AUTOMATION_KEY;
        if (!key) {
            console.error(".env KEY not found.. exit");
            throw new Error('Missing AUTOMATION_KEY environment variable');
        }

        const openai = new OpenAI({ apiKey: key });
        // Build the user prompt (rebuilt on every attempt so a retry carries the last error)
        let lastError = '';
        const buildPrompt = () => `
Convert the following plain text of a Christian song into a JSON object matching this TypeScript interface exactly:

interface SongData {
  title: string;
  number: number;
  lyrics: { id: string; label: string; lines: { chords: string; lyrics: string }[] }[];
  song: string[];
  link?: string;
  verse?: string;
}
Each item in lyrics{} represent a song section, the line{} in sections contains the chords and lyrics for the line (be caution of lines with no chords or no lyrics).
Please preserve white spaces each line in front of chords or lyrics.
Sections cannot have the same id. For exact same sections, just keep one but put it multiple times in song string[] with its id.
Where the song: string[]; records order of song sections with their id from lyrics array, can hold duplicates and in the order of displaying. 
If no link is detected, give link an empty string.
Finally, if you know the exact Bible Verse associated to the song given, provide it inthe format of <book name> <chapter>:<verse(s)>. If unsure, just skip it.

${lastError}

— Output only the raw JSON (no markdown, no code fences, no commentary):
"${text.replace(/"/g, '\\"')}"
`;

        // One request to the model. Sampling parameters depend on the model family:
        //  - reasoning models take an effort level and reject `temperature`
        //  - classic models (e.g. gpt-4o-mini) take `temperature`
        const requestCompletion = () =>
            openai.chat.completions.create({
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a JSON-only formatter. Always output only valid JSON matching the requested schema.',
                    },
                    { role: 'user', content: buildPrompt().trim() },
                ],
                response_format: { type: 'json_object' },
                ...(REASONING_EFFORT
                    ? { reasoning_effort: REASONING_EFFORT as OpenAI.ReasoningEffort }
                    : {}),
                ...(useTemperature ? { temperature: 0 } : {}),
            });

        for (let attempt = 1; attempt <= 3; attempt++) {
            let resp;
            try {
                resp = await requestCompletion();
            } catch (e) {
                // The model does not accept `temperature`: drop it (for this server's lifetime) and retry once
                if (useTemperature && isUnsupportedTemperatureError(e)) {
                    console.warn(`Model ${MODEL} rejected 'temperature'; retrying without it.`);
                    useTemperature = false;
                    resp = await requestCompletion();
                } else {
                    throw e;
                }
            }

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
