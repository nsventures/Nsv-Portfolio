import { youtubeVideoIdFromUrl } from './tour-import-utils.mjs'

/**
 * Fetch YouTube's official poster image (i.ytimg.com).
 * No Playwright — VR tours use screenshotTourToBuffer instead.
 */
async function fetchYoutubeThumbnailJpeg(videoId) {
  const qualities = ['maxresdefault', 'sddefault', 'hqdefault']

  for (const quality of qualities) {
    const res = await fetch(`https://i.ytimg.com/vi/${videoId}/${quality}.jpg`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) continue

    const buffer = Buffer.from(await res.arrayBuffer())
    // YouTube returns a tiny placeholder when maxres is unavailable.
    const minBytes = quality === 'maxresdefault' ? 12_000 : 6_000
    if (buffer.length > minBytes && buffer[0] === 0xff && buffer[1] === 0xd8) {
      return buffer
    }
  }

  throw new Error('Could not fetch YouTube thumbnail from CDN')
}

export async function fetchYoutubeThumbnailBuffer(url) {
  const videoId = youtubeVideoIdFromUrl(url)
  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  console.log(`[youtube-thumbnail] Fetched CDN thumbnail for ${videoId}`)
  return fetchYoutubeThumbnailJpeg(videoId)
}

/** @deprecated Use fetchYoutubeThumbnailBuffer */
export const screenshotYoutubeToBuffer = fetchYoutubeThumbnailBuffer

export { launchTourBrowser } from './tour-screenshot.mjs'
