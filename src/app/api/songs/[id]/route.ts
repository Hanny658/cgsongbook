import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface Params {
    id: number | string
}

export async function GET(
    req: NextRequest,
    { params }: { params: Params }
) {
    const { id } = await params
    const filePath = path.join(process.cwd(), 'src', 'songdata', `${id}.json`)

    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const song = JSON.parse(content)
        return NextResponse.json(song)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
        return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }
}
