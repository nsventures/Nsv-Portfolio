import { metroCities } from '../data/metroCities'
import { METRO_CITY_STATES } from '../data/indianStates'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchPortfolioPageFromSupabase } from './portfolio.supabase'
import type { PortfolioPage, PortfolioQuery, PortfolioViewerPayload } from '../types/portfolio'

export const PORTFOLIO_PAGE_SIZE = 15

function emptyCityCounts(): Record<string, number> {
  return Object.fromEntries(metroCities.map((city) => [city, 0]))
}

function emptyCityStates(): Record<string, string> {
  return Object.fromEntries(
    metroCities.map((city) => [city, METRO_CITY_STATES[city] ?? '']),
  )
}

function emptyStateCounts(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const city of metroCities) {
    const state = METRO_CITY_STATES[city]
    if (state) counts[state] = counts[state] ?? 0
  }
  return counts
}

/** Empty portfolio when Supabase is not configured yet */
async function fetchPortfolioPageEmpty(query: PortfolioQuery): Promise<PortfolioPage> {
  await new Promise((r) => setTimeout(r, 80))

  const cityStates = emptyCityStates()
  const allCityCounts = emptyCityCounts()
  const cityCounts = query.state
    ? Object.fromEntries(
        Object.entries(allCityCounts).filter(([city]) => cityStates[city] === query.state),
      )
    : allCityCounts

  return {
    items: [],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
    hasMore: false,
    cityCounts,
    categoryCounts: {},
    stateCounts: emptyStateCounts(),
    cityStates,
  }
}

export async function fetchPortfolioPage(query: PortfolioQuery): Promise<PortfolioPage> {
  if (isSupabaseConfigured()) {
    return fetchPortfolioPageFromSupabase(query)
  }

  return fetchPortfolioPageEmpty(query)
}

export async function fetchPortfolioViewer(itemId: string): Promise<PortfolioViewerPayload | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const { fetchPortfolioViewerFromSupabase } = await import('./portfolio.supabase')
  return fetchPortfolioViewerFromSupabase(itemId)
}
