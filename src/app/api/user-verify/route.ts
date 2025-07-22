// app/api/user-verify/route.ts

import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // 1. Parse incoming credentials
        const { username, password } = await request.json();

        // 2. Ensure DB_URL is configured
        const DB_URL = process.env.DB_URL;
        if (!DB_URL) {
            throw new Error('Missing DB_URL environment variable');
        }

        // 3. Forward to actual backend endpoint
        const backendRes = await fetch(`${DB_URL}/user-verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        // 4. Parse backend response
        const payload = await backendRes.json();

        // 5. On success, return 200 OK
        if (backendRes.ok) {
            return NextResponse.json({ success: true });
        }

        // 6. On failure, forward error message & status
        return NextResponse.json(
            { error: payload.error ?? 'Authentication failed' },
            { status: backendRes.status }
        );

    } catch (err: unknown) {
        // 7. Unexpected errors
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
