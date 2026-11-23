import { NextResponse } from 'next/server'
import { dbUrl } from '../../lib/db'

// GET /api/songs – always fresh (used by the editor)
export async function GET() {
  try {
    const response = await fetch(`${dbUrl()}/songs`, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Failed to fetch from remote DB: ${response.statusText}`)
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('Failed to fetch songs from DB_URL:', error)
    return NextResponse.json({ error: 'Failed to load songs from database' }, { status: 500 })
  }
}
