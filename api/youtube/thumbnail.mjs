import { fetchYoutubeThumbnailBuffer } from '../../scripts/lib/youtube-screenshot.mjs'
import { youtubeVideoIdFromUrl } from '../../scripts/lib/tour-import-utils.mjs'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  const rawUrl = typeof req.query?.url === 'string' ? req.query.url : ''
  const rawId = typeof req.query?.id === 'string' ? req.query.id : ''
  const videoId = rawId.trim() || (rawUrl ? youtubeVideoIdFromUrl(rawUrl) : null)

  if (!videoId) {
    res.status(400).json({ ok: false, error: 'id or url is required' })
    return
  }

  try {
    const buffer = await fetchYoutubeThumbnailBuffer(
      rawUrl?.trim() || `https://www.youtube.com/watch?v=${videoId}`,
    )
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(200).send(buffer)
  } catch (err) {
    console.warn('[youtube-thumbnail]', err)
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Thumbnail fetch failed',
    })
  }
}
