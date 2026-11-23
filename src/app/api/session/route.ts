// app/api/session/route.ts
import { NextResponse } from 'next/server'
import { getSessionUser, clearSessionCookie, unauthorized } from '../../lib/session'

// GET /api/session – who is logged in to the editor (401 when nobody is)
export async function GET() {
    const username = await getSessionUser()
    if (!username) return unauthorized()
    return NextResponse.json({ username })
}

// DELETE /api/session – log out
export async function DELETE() {
    return clearSessionCookie(NextResponse.json({ success: true }))
}
