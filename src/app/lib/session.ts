// app/lib/session.ts
// Server-only editor session: a signed (HMAC-SHA256), httpOnly cookie.
import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'cgsb-session'
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60

// SESSION_SECRET is preferred; AUTOMATION_KEY is used as a fallback so existing
// deployments keep working without a new environment variable.
function getSecret(): string {
    const secret = process.env.SESSION_SECRET || process.env.AUTOMATION_KEY
    if (!secret) {
        throw new Error('Missing SESSION_SECRET environment variable')
    }
    return secret
}

function sign(payload: string): string {
    return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

function verifyToken(token: string | undefined): string | null {
    if (!token) return null
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null

    const expected = Buffer.from(sign(payload))
    const given = Buffer.from(signature)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

    try {
        const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
        if (typeof u !== 'string' || typeof exp !== 'number' || exp < Date.now()) return null
        return u
    } catch {
        return null
    }
}

/** Username of the logged-in editor, or null when there is no valid session. */
export async function getSessionUser(): Promise<string | null> {
    try {
        return verifyToken((await cookies()).get(COOKIE_NAME)?.value)
    } catch {
        return null
    }
}

/** Attach a fresh session cookie for `username` to a response. */
export function setSessionCookie(res: NextResponse, username: string): NextResponse {
    const payload = Buffer.from(
        JSON.stringify({ u: username, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
    ).toString('base64url')

    res.cookies.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: MAX_AGE_SECONDS,
    })
    return res
}

export function clearSessionCookie(res: NextResponse): NextResponse {
    res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
    return res
}

export function unauthorized(): NextResponse {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
}
