import { NextResponse } from 'next/server'

const DB_URL = process.env.DB_URL

// GET /api/songs
export async function GET() {
  try {
    if (!DB_URL) {
      throw new Error('DB_URL is not defined in environment variables')
    }

    const response = await fetch(`${DB_URL}/songs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch from remote DB: ${response.statusText}`)
    }

    const songList = await response.json()

    return NextResponse.json(songList)
  } catch (error) {
    console.error('Failed to fetch songs from DB_URL:', error)
    return NextResponse.json({ error: 'Failed to load songs from database' }, { status: 500 })
  }
}
