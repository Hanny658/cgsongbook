import LoadingIndicator from './utils/loading-indicator'

// Shown while a page's server data (song list / lyrics) is being fetched
export default function Loading() {
    return (
        <div
            role="status"
            className="flex flex-col items-center justify-center h-screen bg-black/80"
        >
            <LoadingIndicator />
            <p className="mt-2 text-white">Your songs are coming right-up…</p>
        </div>
    )
}
