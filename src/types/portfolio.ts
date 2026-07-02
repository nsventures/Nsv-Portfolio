export type PortfolioMediaType = 'video' | 'virtual-tour'

/** Slim shape returned by the public portfolio list API (no media links). */
export interface PortfolioEntry {
  id: string
  name: string
  thumbnail?: string | null
  builderName?: string | null
  projectName?: string | null
  city?: string | null
  state?: string | null
  mediaType: PortfolioMediaType
  /** ISO date from YouTube (videos only) */
  videoPublishedAt?: string | null
  /** Stored in DB; not shown on the public site */
  category?: string | null
}

/** Fetched on demand when a user opens the viewer modal. */
export interface PortfolioViewerPayload {
  link: string
  mediaType: PortfolioMediaType
}

export interface PortfolioPage {
  items: PortfolioEntry[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  /** City name → count for filter dropdowns */
  cityCounts: Record<string, number>
  /** Video category → count (videos only) */
  categoryCounts: Record<string, number>
  /** State name → count for filter dropdowns */
  stateCounts: Record<string, number>
  /** City name → state name for cascading filters */
  cityStates: Record<string, string>
}

export interface PortfolioQuery {
  page: number
  pageSize: number
  city?: string
  state?: string
  mediaType?: PortfolioMediaType | 'all'
  category?: string
}
