import { youtubeVideoIdFromUrl } from './tour-import-utils.mjs'

function extractJsonObject(source, openBraceIndex) {
  let depth = 0
  let inString = false
  let escape = false

  for (let i = openBraceIndex; i < source.length; i++) {
    const ch = source[i]

    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return source.slice(openBraceIndex, i + 1)
    }
  }

  return null
}

async function fetchViaDataApi(videoId, apiKey) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('id', videoId)
  url.searchParams.set('key', apiKey)

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`YouTube Data API HTTP ${res.status}`)
  }

  const payload = await res.json()
  const publishedAt = payload?.items?.[0]?.snippet?.publishedAt
  if (!publishedAt) throw new Error('No publishedAt in API response')
  return publishedAt
}

function normalizePublishDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00.000Z`
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

function dateFromMicroformat(data) {
  const micro = data?.microformat?.playerMicroformatRenderer
  return normalizePublishDate(micro?.publishDate || micro?.uploadDate)
}

async function fetchViaInnertube(videoId) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240815.01.00',
          hl: 'en',
          gl: 'US',
        },
      },
      videoId,
    }),
  })

  if (!res.ok) {
    throw new Error(`YouTube player API HTTP ${res.status}`)
  }

  const data = await res.json()
  const publishedAt = dateFromMicroformat(data)
  if (!publishedAt) throw new Error('No publish date in player API')
  return publishedAt
}

async function fetchViaWatchPage(videoId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) {
    throw new Error(`YouTube watch page HTTP ${res.status}`)
  }

  const html = await res.text()

  const itemprop = html.match(
    /itemprop="(?:uploadDate|datePublished)"\s+content="([^"]+)"/,
  )
  const fromItemprop = normalizePublishDate(itemprop?.[1])
  if (fromItemprop) return fromItemprop

  const jsonDate = html.match(
    /"(?:uploadDate|publishDate)"\s*:\s*"(\d{4}-\d{2}-\d{2}(?:T[^"]*)?)"/,
  )
  const fromJson = normalizePublishDate(jsonDate?.[1])
  if (fromJson) return fromJson

  const marker = 'ytInitialPlayerResponse'
  const markerIndex = html.indexOf(marker)
  if (markerIndex !== -1) {
    const braceIndex = html.indexOf('{', markerIndex)
    const jsonText = braceIndex !== -1 ? extractJsonObject(html, braceIndex) : null
    if (jsonText) {
      const fromMicroformat = dateFromMicroformat(JSON.parse(jsonText))
      if (fromMicroformat) return fromMicroformat
    }
  }

  throw new Error('Could not parse YouTube publish date')
}

/**
 * @param {string} url YouTube watch / youtu.be URL
 * @returns {Promise<{ videoId: string, publishedAt: string }>}
 */
export async function fetchYoutubeMetadata(url) {
  const videoId = youtubeVideoIdFromUrl(url)
  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim()
  if (apiKey) {
    try {
      const publishedAt = await fetchViaDataApi(videoId, apiKey)
      return { videoId, publishedAt }
    } catch (err) {
      console.warn('[youtube-metadata] Data API failed, trying player API:', err.message)
    }
  }

  try {
    const publishedAt = await fetchViaInnertube(videoId)
    return { videoId, publishedAt }
  } catch (err) {
    console.warn('[youtube-metadata] Player API failed, falling back to watch page:', err.message)
  }

  const publishedAt = await fetchViaWatchPage(videoId)
  return { videoId, publishedAt }
}
