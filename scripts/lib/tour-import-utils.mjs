export function parseCsvLine(line) {
  const cols = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur.trim())
  return cols
}

export function slugFromUrl(url) {
  const path = new URL(url).pathname.replace(/^\/|\/$/g, '')
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function portfolioIdFromUrl(url) {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()

    if (host.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      if (id) return `yt-${id.toLowerCase()}`
    }

    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `yt-${v.toLowerCase()}`
      const shorts = u.pathname.match(/\/shorts\/([^/]+)/)
      if (shorts?.[1]) return `yt-${shorts[1].toLowerCase()}`
    }
  } catch {
    // fall through
  }

  return slugFromUrl(url)
}

export function isYoutubeLink(url) {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase()
    return host.includes('youtube.com') || host.includes('youtu.be')
  } catch {
    return false
  }
}

export function youtubeVideoIdFromUrl(url) {
  try {
    const u = new URL(url.trim())
    const host = u.hostname.toLowerCase()

    if (host.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').split('/')[0] || null
    }

    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const shorts = u.pathname.match(/\/shorts\/([^/]+)/)
      if (shorts?.[1]) return shorts[1]
      const embed = u.pathname.match(/\/embed\/([^/]+)/)
      if (embed?.[1]) return embed[1]
    }
  } catch {
    // fall through
  }
  return null
}

/** Always open the watch page — embed URLs cause Error 150 in automated capture. */
export function youtubeWatchUrl(url) {
  const id = youtubeVideoIdFromUrl(url)
  return id ? `https://www.youtube.com/watch?v=${id}` : url.trim()
}

/** YouTube URLs are always videos, regardless of which bulk tab was used. */
export function resolveMediaTypeFromLink(link, requestedMediaType) {
  if (isYoutubeLink(link)) return 'video'
  return requestedMediaType
}

export function nameFromSlug(slug) {
  return slug
    .replace(/-nsv$/i, '')
    .replace(/\d{1,2}(january|february|march|april|may|june|july|august|september|october|november|december)\d{0,4}$/i, '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function normalizeTourLink(raw) {
  const trimmed = raw.trim().replace(/^"|"$/g, '')
  if (!trimmed.startsWith('http')) return null
  try {
    const u = new URL(trimmed)
    return u.toString().replace(/\/$/, '') + '/'
  } catch {
    return null
  }
}

/** Parse flat CSV with name + link columns (city comes from admin picker). */
export function parseNameLinkCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  const firstCols = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const hasHeader =
    firstCols.includes('link') ||
    firstCols.includes('name') ||
    firstCols.includes('url')

  let nameIdx = firstCols.indexOf('name')
  let linkIdx = firstCols.indexOf('link')
  if (linkIdx === -1) linkIdx = firstCols.indexOf('url')

  const dataLines = hasHeader ? lines.slice(1) : lines

  if (!hasHeader) {
    nameIdx = 0
    linkIdx = 1
  }

  if (linkIdx === -1) {
    throw new Error('Sheet must have a "Link" column')
  }

  const rows = []
  for (let i = 0; i < dataLines.length; i++) {
    const cols = parseCsvLine(dataLines[i])
    const link = normalizeTourLink(cols[linkIdx] ?? '')
    if (!link) continue

    const nameRaw = nameIdx >= 0 ? (cols[nameIdx] ?? '').replace(/^"|"$/g, '').trim() : ''
    const id = slugFromUrl(link)
    rows.push({
      name: nameRaw || nameFromSlug(id),
      link,
    })
  }

  return rows
}
