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
