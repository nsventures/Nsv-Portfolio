import { isYoutubeLink, youtubeVideoId } from '../../lib/portfolioLink'
import { formatVideoPublishedDate } from '../../lib/formatVideoDate'

export interface YoutubePreviewResult {
  videoId: string
  publishedAt: string | null
  thumbnailUrl: string
  dateError?: string
}

function youtubeApiBase(): string {
  return (import.meta.env.VITE_BULK_IMPORT_API_URL ?? '').replace(/\/$/, '')
}

function youtubeApiUrl(path: string): string {
  const base = youtubeApiBase()
  return base ? `${base}${path}` : path
}

/** Immediate CDN preview URL (no server). */
export function youtubeThumbPreviewUrl(link: string): string | null {
  const id = youtubeVideoId(link)
  if (!id) return null
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export async function fetchYoutubePreview(link: string): Promise<YoutubePreviewResult> {
  const trimmed = link.trim()
  if (!isYoutubeLink(trimmed)) {
    throw new Error('Not a YouTube link')
  }

  const fallbackThumb = youtubeThumbPreviewUrl(trimmed)
  const res = await fetch(youtubeApiUrl('/api/youtube/preview'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmed }),
  })

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
    videoId?: string
    publishedAt?: string | null
    thumbnailUrl?: string
    dateError?: string
  }

  if (!res.ok || body.ok === false) {
    // Still allow local thumb preview when date API is offline
    if (fallbackThumb) {
      return {
        videoId: youtubeVideoId(trimmed) ?? '',
        publishedAt: null,
        thumbnailUrl: fallbackThumb,
        dateError:
          body.error ??
          (import.meta.env.DEV
            ? 'Publish date unavailable — run npm run dev:all for YouTube preview API'
            : 'Publish date unavailable'),
      }
    }
    throw new Error(body.error ?? `Preview failed (${res.status})`)
  }

  return {
    videoId: body.videoId ?? youtubeVideoId(trimmed) ?? '',
    publishedAt: body.publishedAt ?? null,
    thumbnailUrl: body.thumbnailUrl ?? fallbackThumb ?? '',
    dateError: body.dateError,
  }
}

/** Download YouTube poster via our proxy (avoids CDN CORS) as a File for upload. */
export async function fetchYoutubeThumbnailFile(link: string): Promise<File> {
  const id = youtubeVideoId(link)
  if (!id) throw new Error('Invalid YouTube URL')

  const qs = new URLSearchParams({ id })
  const res = await fetch(youtubeApiUrl(`/api/youtube/thumbnail?${qs}`))
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? `Thumbnail download failed (${res.status})`)
  }

  const blob = await res.blob()
  return new File([blob], `${id}.jpg`, { type: blob.type || 'image/jpeg' })
}

export function formatYoutubePreviewDate(iso: string | null | undefined): string | null {
  return formatVideoPublishedDate(iso)
}
