import PresenterView from './PresenterMode'
//import SongLyricsClient from './SongLyricsClient'

export default async function Page(context: { params: Promise<{ number: string }> }) {
    const { number } = await context.params
    return <PresenterView number={number} />
}
