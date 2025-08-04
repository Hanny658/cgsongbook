// /app/api/speech-to-text/route.ts
import { NextResponse } from 'next/server'

export const config = {
    api: { bodyParser: false },
}

export async function POST(request: Request) {
    // 1. Read raw audio
    const audioBuffer = await request.arrayBuffer()

    // 2. Grab the real blob MIME (e.g. "audio/webm; codecs=opus")
    const incomingType = request.headers.get('content-type')
        || 'application/octet-stream'

    // 3. Build the correct Azure STT URL
    const endpoint = process.env.STT_ENDPOINT
    const key = process.env.STT_KEY
    if (!endpoint || !key) {
        return NextResponse.json(
            { error: 'Missing STT_ENDPOINT or STT_KEY' },
            { status: 500 }
        )
    }
    const url = `${endpoint}?language=en-US`

    // 4. Forward the blob exactly as-is
    const azureResp = await fetch(url, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': incomingType,
            // no Transfer-Encoding header
            'Accept': 'application/json; charset=utf-8',
        },
        body: audioBuffer,
    })

    if (!azureResp.ok) {
        const details = await azureResp.text()
        console.error('Azure STT error:', details)
        return NextResponse.json(
            { error: 'Azure STT failed', details },
            { status: 500 }
        )
    }

    // 5. Parse and return DisplayText
    const result = await azureResp.json()
    const text = (result.DisplayText || result.displayText || '').trim()
    return NextResponse.json({ text })
}
