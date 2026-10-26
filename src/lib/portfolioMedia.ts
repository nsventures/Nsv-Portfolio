import { getTourThumbPublicUrl, isSupabaseConfigured } from './supabase'

export const GENERIC_PORTFOLIO_THUMBNAIL = '/portfolio-placeholder.svg'

export const PORTFOLIO_THUMB_WIDTH = 560
export const PORTFOLIO_THUMB_HEIGHT = 420
/** 1.5× display — sharp enough on retina, much smaller than full screenshots */
export const PORTFOLIO_THUMB_MAX_WIDTH = Math.round(PORTFOLIO_THUMB_WIDTH * 1.5)
export const PORTFOLIO_THUMB_MAX_HEIGHT = Math.round(PORTFOLIO_THUMB_HEIGHT * 1.5)
/** WebP quality (0–100). Lower = smaller files; ~65 is a strong size cut for thumbs */
export const THUMB_WEBP_QUALITY = 65

export const THUMB_WEBP_EXT = 'webp'
export const thumbStoragePath = (id: string) => `${id}.${THUMB_WEBP_EXT}`

/** Request smaller, modern formats from common CDNs when possible */
export function optimizeThumbnailUrl(url: string): string {
  if (!url || url.startsWith('/') || url.startsWith('data:')) return url

  try {
    const parsed = new URL(url)

    if (parsed.hostname.includes('unsplash.com')) {
      parsed.searchParams.set('w', String(PORTFOLIO_THUMB_WIDTH))
      parsed.searchParams.set('h', String(PORTFOLIO_THUMB_HEIGHT))
      parsed.searchParams.set('fit', 'crop')
      parsed.searchParams.set('q', '75')
      parsed.searchParams.set('auto', 'format')
      return parsed.toString()
    }

    if (parsed.hostname.includes('pexels.com')) {
      parsed.searchParams.set('w', String(PORTFOLIO_THUMB_WIDTH))
      parsed.searchParams.set('auto', 'compress')
      return parsed.toString()
    }
  } catch {
    return url
  }

  return url
}

/**
 * Supabase serves resized copies from /render/image. Stored thumbs are 1120px
 * wide but the cards show them ~315px, so asking for a smaller render cuts
 * each one from ~92 KB to ~25 KB.
 */
export function supabaseThumbVariant(url: string, width: number, quality: number): string {
  if (!url.includes('/storage/v1/object/public/')) return url
  const rendered = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  const sep = rendered.includes('?') ? '&' : '?'
  return `${rendered}${sep}width=${width}&quality=${quality}&resize=contain`
}

/** `srcset` so 1x screens download a third of what retina needs. */
export function portfolioThumbSrcSet(url: string): string | undefined {
  if (!url.includes('/storage/v1/object/public/')) return undefined
  return [
    `${supabaseThumbVariant(url, 400, 70)} 400w`,
    `${supabaseThumbVariant(url, 640, 60)} 640w`,
  ].join(', ')
}

export function getPortfolioThumbnail(thumbnail?: string | null, cacheBust?: string | number): string {
  const value = thumbnail?.trim()
  if (!value) return GENERIC_PORTFOLIO_THUMBNAIL

  let url: string
  if (value.startsWith('/')) url = optimizeThumbnailUrl(value)
  else if (value.startsWith('http')) url = optimizeThumbnailUrl(value)
  else if (isSupabaseConfigured()) url = getTourThumbPublicUrl(value)
  else url = optimizeThumbnailUrl(value)

  if (cacheBust !== undefined && cacheBust !== '') {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}v=${encodeURIComponent(String(cacheBust))}`
  }
  return url
}
