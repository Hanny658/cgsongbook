// app/api/user-update-pwd/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { dbUrl } from '../../lib/db';
import { getSessionUser, unauthorized } from '../../lib/session';

// POST /api/user-update-pwd – change the password of the logged-in editor.
// Body: { oldPassword, password }. The username always comes from the session.
export async function POST(request: NextRequest) {
    try {
        // 1. Only a logged-in editor can change (their own) password
        const username = await getSessionUser();
        if (!username) return unauthorized();

        const { oldPassword, password } = await request.json();
        if (typeof oldPassword !== 'string' || typeof password !== 'string' || password.length < 6) {
            return NextResponse.json(
                { error: 'Old password and a new password of at least 6 characters are required' },
                { status: 400 }
            );
        }

        // 2. Verify the old password on the server, not just in the browser
        const verifyRes = await fetch(`${dbUrl()}/user-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: oldPassword }),
        });
        if (!verifyRes.ok) {
            return NextResponse.json({ error: 'Old password is incorrect' }, { status: 403 });
        }

        // 3. Forward to actual backend endpoint
        const backendRes = await fetch(`${dbUrl()}/user-update-pwd`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        // 4. On failure, forward error message & status
        if (!backendRes.ok) {
            const payload = await backendRes.json().catch(() => ({}));
            return NextResponse.json(
                { error: payload.message ?? payload.error ?? 'Password update failed' },
                { status: backendRes.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        // 5. Unexpected errors
        console.error('Password update failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
