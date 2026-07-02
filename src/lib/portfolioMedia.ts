import { getTourThumbPublicUrl, isSupabaseConfigured } from './supabase'

export const GENERIC_PORTFOLIO_THUMBNAIL = '/portfolio-placeholder.svg'

export const PORTFOLIO_THUMB_WIDTH = 560
export const PORTFOLIO_THUMB_HEIGHT = 420

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
