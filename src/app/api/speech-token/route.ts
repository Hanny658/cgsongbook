// app/api/speech-token/route.ts
import { NextRequest, NextResponse } from 'next/server'

// The Azure Speech key stays on the server; browsers only ever get a short-lived token
// (valid for 10 minutes) for lyric tracing.
//
//   STT_KEY       – Azure Speech resource key
//   STT_REGION    – region of that resource (default: southeastasia = Singapore)
//   STT_LANGUAGE  – recognition language (default: en-SG)
//
// The former NEXT_PUBLIC_STT_* names are still read as a fallback.
const DEFAULT_REGION = 'southeastasia'
const DEFAULT_LANGUAGE = 'en-SG'

// GET /api/speech-token → { token, region, language }
export async function GET(request: NextRequest) {
    // Browsers tell us where a request comes from; other sites may not use our quota
    const fetchSite = request.headers.get('sec-fetch-site')
    if (fetchSite && fetchSite !== 'same-origin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const key = process.env.STT_KEY || process.env.NEXT_PUBLIC_STT_KEY
    const region = (process.env.STT_REGION || process.env.NEXT_PUBLIC_STT_REGION || DEFAULT_REGION).trim()
    const language = (process.env.STT_LANGUAGE || DEFAULT_LANGUAGE).trim()

    if (!key) {
        return NextResponse.json({ error: 'Speech recognition is not configured' }, { status: 503 })
    }

    try {
        const res = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
            method: 'POST',
            headers: { 'Ocp-Apim-Subscription-Key': key },
            cache: 'no-store',
        })
        if (!res.ok) {
            console.error(`Speech token request failed: ${res.status} ${res.statusText} (region ${region})`)
            return NextResponse.json({ error: 'Could not start speech recognition' }, { status: 502 })
        }

        return NextResponse.json(
            { token: await res.text(), region, language },
            { headers: { 'Cache-Control': 'no-store' } }
        )
    } catch (error) {
        console.error('Speech token request failed:', error)
        return NextResponse.json({ error: 'Could not start speech recognition' }, { status: 502 })
    }
}
