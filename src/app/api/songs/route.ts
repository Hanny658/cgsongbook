import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

// GET /api/songlist
export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), 'src', 'songdata')

    const files = (await fs.readdir(dirPath)).filter((file) => file.endsWith('.json'))

    const songList = await Promise.all(
      files.map(async (file) => {
        const content = await fs.readFile(path.join(dirPath, file), 'utf-8')
        const data = JSON.parse(content)
        return { number: data.number, title: data.title, link: data.link }
      })
    )

    return NextResponse.json(songList)
  } catch (error) {
    console.error('Failed to read song files:', error)
    return NextResponse.json({ error: 'Failed to load songs' }, { status: 500 })
  }
}
