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

const YT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'CONSENT=YES+; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwODE1LjA3X3AxGgJlbiACGgYIgJz8sgY',
}

function dateFromMicroformat(data) {
  const micro = data?.microformat?.playerMicroformatRenderer
  const dataRenderer = data?.microformat?.microformatDataRenderer
  return (
    normalizePublishDate(micro?.publishDate || micro?.uploadDate) ||
    normalizePublishDate(dataRenderer?.publishDate || dataRenderer?.uploadDate)
  )
}

function findDateInObject(value, depth = 0) {
  if (!value || depth > 8) return null
  if (typeof value === 'string') return normalizePublishDate(value)
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findDateInObject(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof value === 'object') {
    for (const key of ['publishDate', 'uploadDate', 'datePublished', 'uploadDateText']) {
      if (key in value) {
        const found = findDateInObject(value[key], depth + 1)
        if (found) return found
      }
    }
  }
  return null
}

const INNERTUBE_CLIENTS = [
  { clientName: 'WEB', clientVersion: '2.20240815.01.00' },
  { clientName: 'MWEB', clientVersion: '2.20240815.01.00' },
  { clientName: 'WEB_EMBEDDED_PLAYER', clientVersion: '1.20240815.01.00' },
  { clientName: 'ANDROID', clientVersion: '19.44.38', androidSdkVersion: 30 },
]

async function fetchViaInnertube(videoId) {
  const errors = []

  for (const client of INNERTUBE_CLIENTS) {
    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          ...YT_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: { client: { ...client, hl: 'en', gl: 'US' } },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      })

      if (!res.ok) {
        errors.push(`${client.clientName} HTTP ${res.status}`)
        continue
      }

      const data = await res.json()
      const publishedAt = dateFromMicroformat(data) || findDateInObject(data.microformat)
      if (publishedAt) return publishedAt
      errors.push(`${client.clientName} no date`)
    } catch (err) {
      errors.push(`${client.clientName} ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  throw new Error(`Player API failed (${errors.join('; ')})`)
}

async function fetchViaWatchPage(videoId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`, {
    headers: YT_HEADERS,
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

  let playerError = ''
  try {
    const publishedAt = await fetchViaInnertube(videoId)
    return { videoId, publishedAt }
  } catch (err) {
    playerError = err instanceof Error ? err.message : 'player API failed'
    console.warn('[youtube-metadata] Player API failed, falling back to watch page:', playerError)
  }

  try {
    const publishedAt = await fetchViaWatchPage(videoId)
    return { videoId, publishedAt }
  } catch (err) {
    const watchError = err instanceof Error ? err.message : 'watch page failed'
    throw new Error(`${playerError} / ${watchError}`)
  }
}
