// app/api/user-verify/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { dbUrl } from '../../lib/db';
import { setSessionCookie } from '../../lib/session';

// POST /api/user-verify – log in; on success an httpOnly session cookie is set
export async function POST(request: NextRequest) {
    try {
        // 1. Parse incoming credentials
        const { username, password } = await request.json();
        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // 2. Forward to actual backend endpoint
        const backendRes = await fetch(`${dbUrl()}/user-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        // 3. On failure, forward error message & status
        if (!backendRes.ok) {
            const payload = await backendRes.json().catch(() => ({}));
            return NextResponse.json(
                { error: payload.error ?? 'Authentication failed' },
                { status: backendRes.status }
            );
        }

        // 4. On success, start the session
        return setSessionCookie(NextResponse.json({ success: true, username }), username);
    } catch (err: unknown) {
        // 5. Unexpected errors
        console.error('Login failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
