export function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes('videos.pexels.com')
}

export function isYoutubeLink(link: string): boolean {
  try {
    const host = new URL(link.trim()).hostname.toLowerCase()
    return host.includes('youtube.com') || host.includes('youtu.be')
  } catch {
    return false
  }
}

export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim())
    const host = u.hostname.toLowerCase()

    if (host.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').split('/')[0] || null
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
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

/** Privacy-focused embed — modest branding, no related videos, nocookie host. */
export function youtubeEmbedUrl(url: string, origin?: string): string | null {
  const id = youtubeVideoId(url)
  if (!id) return null

  const params = new URLSearchParams({
    autoplay: '1',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    fs: '0',
    disablekb: '1',
    controls: '0',
    color: 'white',
  })

  if (origin) {
    params.set('origin', origin)
  }

  return `https://www.youtube-nocookie.com/embed/${id}?${params}`
}

/** Infer portfolio media type from URL — YouTube links are always videos. */
export function inferMediaTypeFromLink(link: string): 'video' | 'virtual-tour' {
  const trimmed = link.trim()
  if (!trimmed.startsWith('http')) return 'virtual-tour'
  return isYoutubeLink(trimmed) ? 'video' : 'virtual-tour'
}
