import { NextRequest, NextResponse } from 'next/server'

// GET /api/bible-verse?translation=...&book=...&chapter=...&verse_start=...&verse_end=...
export async function GET(req: NextRequest) {
    const dbUrl = process.env.DB_URL

    if (!dbUrl) {
        return NextResponse.json({ error: 'DB_URL is not configured' }, { status: 500 })
    }

    const endpoint = `${dbUrl}/bible-verse?${req.nextUrl.searchParams.toString()}`

    try {
        const res = await fetch(endpoint)
        const payload = await res.json()

        if (!res.ok) {
            return NextResponse.json(
                { error: payload.error ?? 'Failed to fetch verse' },
                { status: res.status }
            )
        }

        return NextResponse.json(payload)
    } catch (error) {
        console.error('Fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch verse' }, { status: 500 })
    }
}
