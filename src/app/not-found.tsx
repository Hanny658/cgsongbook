import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-black/80 text-center px-6">
            <i className="bi bi-music-note-beamed text-4xl text-blue-400" />
            <h2 className="mt-2 text-2xl text-white">That song is not yet here...</h2>
            <Link href="/" className="mt-4 text-blue-300 hover:text-amber-100">
                <i className="bi bi-house-door-fill" /> Back to the song list
            </Link>
        </div>
    )
}
