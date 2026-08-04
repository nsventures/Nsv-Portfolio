import { fetchYoutubeMetadata } from '../../scripts/lib/youtube-metadata.mjs'
import { youtubeVideoIdFromUrl } from '../../scripts/lib/tour-import-utils.mjs'

/**
 * Build a display CDN URL for admin preview (browser <img> works without CORS).
 */
export function youtubeThumbnailDisplayUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * @param {string} url
 * @returns {Promise<{ ok: true, videoId: string, publishedAt: string | null, thumbnailUrl: string, dateError?: string } | { ok: false, error: string }>}
 */
export async function buildYoutubePreview(url) {
  const videoId = youtubeVideoIdFromUrl(url)
  if (!videoId) {
    return { ok: false, error: 'Not a valid YouTube URL' }
  }

  const thumbnailUrl = youtubeThumbnailDisplayUrl(videoId)
  let publishedAt = null
  let dateError

  try {
    const meta = await fetchYoutubeMetadata(url)
    publishedAt = meta.publishedAt
  } catch (err) {
    dateError = err instanceof Error ? err.message : 'Could not fetch publish date'
  }

  return {
    ok: true,
    videoId,
    publishedAt,
    thumbnailUrl,
    ...(dateError ? { dateError } : {}),
  }
}
