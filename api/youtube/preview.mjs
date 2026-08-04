import { buildYoutubePreview } from '../../server/lib/youtube-preview.mjs'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  if (!url) {
    res.status(400).json({ ok: false, error: 'url is required' })
    return
  }

  try {
    const result = await buildYoutubePreview(url)
    res.status(result.ok ? 200 : 400).json(result)
  } catch (err) {
    console.warn('[youtube-preview]', err)
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Preview failed',
    })
  }
}
