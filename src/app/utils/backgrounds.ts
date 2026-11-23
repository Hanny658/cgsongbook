// utils/backgrounds.ts
// Background pictures in /public/sbg, named <number>.webp

const toUrl = (n: number) => `/sbg/${n}.webp`

/** Every background (song list & classic lyrics view) */
export const BG_IMAGES: string[] = Array.from({ length: 26 }, (_, i) => toUrl(i + 1))

/** The ones that also look good as a slide picture (GACC-Slides view) */
export const SLIDE_BG_IMAGES: string[] = [
    1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 18, 19, 20, 21, 22, 23, 24, 25, 26,
].map(toUrl)

/** Pick a random background URL. Call on the client (in an effect) to avoid hydration mismatches. */
export function randomBg(images: string[] = BG_IMAGES): string {
    return images[Math.floor(Math.random() * images.length)]
}
