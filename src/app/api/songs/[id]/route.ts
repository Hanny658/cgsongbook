import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
    req: NextRequest,
    context: { params: { id: string } }
) {
    const { id } = await context.params
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
