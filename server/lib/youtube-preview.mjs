import { youtubeVideoIdFromUrl } from '../../scripts/lib/tour-import-utils.mjs'

/**
 * Build a display CDN URL for admin preview (browser <img> works without CORS).
 */
export function youtubeThumbnailDisplayUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * Thumbnail-only preview. Publish dates are typed into the admin form by hand:
 * YouTube bot-blocks date lookups from datacenter IPs, so the automatic fetch
 * worked locally and silently failed on the deployment.
 *
 * @param {string} url
 * @returns {Promise<{ ok: true, videoId: string, thumbnailUrl: string } | { ok: false, error: string }>}
 */
export async function buildYoutubePreview(url) {
  const videoId = youtubeVideoIdFromUrl(url)
  if (!videoId) {
    return { ok: false, error: 'Not a valid YouTube URL' }
  }

  return {
    ok: true,
    videoId,
    thumbnailUrl: youtubeThumbnailDisplayUrl(videoId),
  }
}
