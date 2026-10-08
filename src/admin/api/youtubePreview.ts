import { isYoutubeLink, youtubeVideoId } from '../../lib/portfolioLink'

/** Thumbnail only — the publish date is entered by hand in the admin form. */
export interface YoutubePreviewResult {
  videoId: string
  thumbnailUrl: string
}

/** Same-origin Vercel/Vite `/api/youtube` — not the bulk-import server. */
function youtubeApiUrl(path: string): string {
  return path
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
    thumbnailUrl?: string
  }

  if (!res.ok || body.ok === false) {
    // Still show the CDN thumbnail when the preview endpoint is offline.
    if (fallbackThumb) {
      return {
        videoId: youtubeVideoId(trimmed) ?? '',
        thumbnailUrl: fallbackThumb,
      }
    }
    throw new Error(body.error ?? `Preview failed (${res.status})`)
  }

  return {
    videoId: body.videoId ?? youtubeVideoId(trimmed) ?? '',
    thumbnailUrl: body.thumbnailUrl ?? fallbackThumb ?? '',
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
