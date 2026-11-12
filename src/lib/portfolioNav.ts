import { INDIAN_STATES } from '../data/indianStates'
import type { PortfolioMediaType } from '../types/portfolio'

/**
 * The portfolio's filters live in the URL so a campaign can be given its own
 * landing link. Two forms are understood:
 *
 *   /videos/telangana   /vr/telangana    the clean form, what ads should use
 *   /?state=telangana                    the original form, still honoured
 *
 * Both stay valid on purpose — nothing redirects, so a link already out in the
 * world keeps working and each view keeps the shape the visitor arrived on.
 *
 * Query string rather than the hash because the hash is already spoken for:
 * Supabase drops its recovery tokens there (see lib/authRecovery), and the
 * navbar uses #home/#portfolio as scroll anchors. `media` rather than `type`
 * for the same reason — authRecovery reads `?type=recovery`.
 */
export interface PortfolioFilters {
  media: PortfolioMediaType
  state: string | null
}

export const MEDIA_PARAM = 'media'
export const STATE_PARAM = 'state'

export const DEFAULT_PORTFOLIO_FILTERS: PortfolioFilters = { media: 'video', state: null }

/** Query-param spelling. */
const MEDIA_SLUGS: Record<PortfolioMediaType, string> = {
  video: 'video',
  'virtual-tour': 'virtual-tours',
}

/** First path segment. Short and hyphen-free — these go into ad copy. */
const MEDIA_PATHS: Record<PortfolioMediaType, string> = {
  video: 'videos',
  'virtual-tour': 'vr',
}

/** Ad links get typed and pasted by hand, so match loosely. */
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const STATES_BY_KEY = new Map(INDIAN_STATES.map((state) => [normalize(state), state]))

/** Accepts "Telangana", "telangana", "tamil-nadu", "Tamil%20Nadu". */
export function matchState(raw: string | null | undefined): string | null {
  if (!raw) return null
  return STATES_BY_KEY.get(normalize(raw)) ?? null
}

/** "Tamil Nadu" -> "tamil-nadu", for the path form. */
export function stateSlug(state: string): string {
  return state.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function matchMedia(raw: string | null | undefined): PortfolioMediaType | null {
  if (!raw) return null
  const key = normalize(raw)
  if (key === 'video' || key === 'videos') return 'video'
  if (key === 'virtualtour' || key === 'virtualtours' || key === 'vr') return 'virtual-tour'
  return null
}

/**
 * Links shared before the filters moved into the URL carry the media type as
 * `#video` / `#virtual-tours`. Still honoured so they keep working.
 */
export function parseMediaFilter(hash: string): PortfolioMediaType {
  if (hash === '#virtual-tours') return 'virtual-tour'
  return 'video'
}

/**
 * `/videos/telangana` and friends. Returns null when the path isn't one of
 * ours, which is what keeps `/admin`, `/privacy` and anything added later from
 * being read as a filter.
 */
export function readPortfolioFiltersFromPath(
  pathname: string = window.location.pathname,
): PortfolioFilters | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0 || segments.length > 2) return null

  let decoded: string[]
  try {
    decoded = segments.map(decodeURIComponent)
  } catch {
    return null
  }

  const media = matchMedia(decoded[0])
  if (!media) return null

  // An unknown state still shows the right media type rather than 404-ing the
  // whole campaign over a typo.
  return { media, state: decoded[1] ? matchState(decoded[1]) : null }
}

export function readPortfolioFiltersFromSearch(
  search: string = window.location.search,
  hash: string = window.location.hash,
): PortfolioFilters {
  const params = new URLSearchParams(search)
  return {
    media: matchMedia(params.get(MEDIA_PARAM)) ?? parseMediaFilter(hash),
    state: matchState(params.get(STATE_PARAM)),
  }
}

/** Path wins when there is one; otherwise fall back to the query form. */
export function readPortfolioFilters(
  pathname: string = window.location.pathname,
  search: string = window.location.search,
  hash: string = window.location.hash,
): PortfolioFilters {
  return readPortfolioFiltersFromPath(pathname) ?? readPortfolioFiltersFromSearch(search, hash)
}

/**
 * Rewrites only our two params, so utm_*, gclid and fbclid survive — losing
 * those would break the attribution on the very campaigns this is for.
 * Defaults are dropped rather than spelled out, keeping the plain site URL clean.
 */
export function portfolioFiltersToSearch(
  filters: PortfolioFilters,
  search: string = window.location.search,
): string {
  const params = new URLSearchParams(search)

  if (filters.media === DEFAULT_PORTFOLIO_FILTERS.media) params.delete(MEDIA_PARAM)
  else params.set(MEDIA_PARAM, MEDIA_SLUGS[filters.media])

  if (!filters.state) params.delete(STATE_PARAM)
  else params.set(STATE_PARAM, filters.state)

  const query = params.toString()
  return query ? `?${query}` : ''
}

/** `/`, `/videos/telangana`, `/virtual-tours`, … */
export function portfolioFiltersToPath(filters: PortfolioFilters): string {
  if (filters.media === DEFAULT_PORTFOLIO_FILTERS.media && !filters.state) return '/'
  const base = `/${MEDIA_PATHS[filters.media]}`
  return filters.state ? `${base}/${stateSlug(filters.state)}` : base
}

/** True once a visitor is on a `?state=`/`?media=` link. */
function isQueryForm(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.has(MEDIA_PARAM) || params.has(STATE_PARAM)
}

/**
 * The URL this view should have, keeping whichever form the visitor arrived
 * on. Someone who followed a `?state=` link is never bounced to a path — that
 * would be a redirect, and old links are meant to keep their own address.
 */
export function portfolioFiltersToUrl(
  filters: PortfolioFilters,
  pathname: string = window.location.pathname,
  search: string = window.location.search,
  hash: string = window.location.hash,
): string {
  if (isQueryForm(search)) {
    return `${pathname}${portfolioFiltersToSearch(filters, search)}${hash}`
  }
  // Path form: our params are absent, so this only carries utm/gclid through.
  const rest = portfolioFiltersToSearch(DEFAULT_PORTFOLIO_FILTERS, search)
  return `${portfolioFiltersToPath(filters)}${rest}${hash}`
}

export const PORTFOLIO_FILTER_EVENT = 'portfolio-filter'

export function scrollToPortfolioFilter(filter: PortfolioMediaType) {
  window.dispatchEvent(
    new CustomEvent<PortfolioMediaType>(PORTFOLIO_FILTER_EVENT, { detail: filter }),
  )
  document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })
}
