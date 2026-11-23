import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { dbUrl, isSongNumber, SONGS_TAG, songTag } from '../../../lib/db'
import { getSessionUser, unauthorized } from '../../../lib/session'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/songs/[id] – always fresh (used by the editor)
export async function GET(_req: NextRequest, context: RouteContext) {
    const { id } = await context.params
    if (!isSongNumber(id)) {
        return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    try {
        const res = await fetch(`${dbUrl()}/songs/${id}`, { cache: 'no-store' })

        if (!res.ok) {
            return NextResponse.json({ error: 'Song not found' }, { status: res.status })
        }

        return NextResponse.json(await res.json())
    } catch (error) {
        console.error('Fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch song' }, { status: 500 })
    }
}

// POST /api/songs/[id] – create or update a song (editors only)
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        // 1. Only logged-in editors may write
        if (!(await getSessionUser())) return unauthorized()

        const { id } = await context.params
        if (!isSongNumber(id)) {
            return NextResponse.json({ error: 'Invalid song number' }, { status: 400 })
        }

        // 2. Parse incoming SongData; the number in the body must match the URL
        const songData = await request.json()
        if (!songData || Number(songData.number) !== Number(id)) {
            return NextResponse.json({ error: 'Song number does not match' }, { status: 400 })
        }

        // 3. Forward to actual backend endpoint
        const upstream = await fetch(`${dbUrl()}/songs/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(songData),
        })

        // 4. On failure, forward the upstream error message & status
        if (!upstream.ok) {
            const payload = await upstream.json().catch(() => ({}))
            return NextResponse.json(
                { error: payload.error ?? 'Upstream error' },
                { status: upstream.status }
            )
        }

        // 5. On success, refresh the cached song list & song page
        revalidateTag(SONGS_TAG)
        revalidateTag(songTag(id))
        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        // 6. Unexpected errors bubble up as 500
        console.error('Failed to save song:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
