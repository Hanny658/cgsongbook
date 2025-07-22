import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    const dbUrl = process.env.DB_URL

    if (!dbUrl) {
        return NextResponse.json({ error: 'DB_URL is not configured' }, { status: 500 })
    }

    const endpoint = `${dbUrl}/songs/${id}`

    try {
        const res = await fetch(endpoint)

        if (!res.ok) {
            return NextResponse.json({ error: 'Song not found' }, { status: res.status })
        }

        const song = await res.json()
        return NextResponse.json(song)
    } catch (error) {
        console.error('Fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch song' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Parse incoming SongData
        const songData = await request.json();

        // 2. Ensure DB_URL is configured
        const DB_URL = process.env.DB_URL;
        if (!DB_URL) {
            throw new Error('Missing DB_URL environment variable');
        }

        // 3. Forward to actual backend endpoint
        const upstream = await fetch(`${DB_URL}/songs/${params.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(songData),
        });

        // 4. Parse upstream response
        const payload = await upstream.json();

        // 5. On success, return 200 with a simple acknowledgment
        if (upstream.ok) {
            return NextResponse.json({ success: true });
        }

        // 6. On failure, forward the upstream error message & status
        return NextResponse.json(
            { error: payload.error ?? 'Upstream error' },
            { status: upstream.status }
        );
    } catch (err: unknown) {
        // 7. Unexpected errors bubble up as 500
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
