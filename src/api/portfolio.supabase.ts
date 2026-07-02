import { getSupabase } from '../lib/supabase'
import {
  clearPortfolioAccess,
  getPortfolioAccessToken,
  PortfolioSessionExpiredError,
} from '../lib/portfolioAccess'
import type { PortfolioPage, PortfolioQuery, PortfolioViewerPayload } from '../types/portfolio'

export async function fetchPortfolioPageFromSupabase(
  query: PortfolioQuery,
): Promise<PortfolioPage> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('get_portfolio_page', {
    p_page: query.page,
    p_page_size: query.pageSize,
    p_city: query.city || null,
    p_state: query.state || null,
    p_media_type: query.mediaType && query.mediaType !== 'all' ? query.mediaType : null,
    p_category: query.category || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as PortfolioPage
}

type ViewerEdgeOk = {
  ok: true
  viewer: PortfolioViewerPayload | null
}

type ViewerEdgeErr = {
  ok: false
  error: string
}

export async function fetchPortfolioViewerFromSupabase(
  itemId: string,
): Promise<PortfolioViewerPayload | null> {
  const accessToken = getPortfolioAccessToken()
  if (!accessToken) {
    throw new PortfolioSessionExpiredError()
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.functions.invoke('portfolio-viewer', {
    body: { itemId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = (data ?? null) as ViewerEdgeOk | ViewerEdgeErr | null

  if (payload && 'ok' in payload && !payload.ok) {
    const errMsg = payload.error?.toLowerCase() ?? ''
    if (
      errMsg.includes('expired') ||
      errMsg.includes('token') ||
      errMsg.includes('session') ||
      errMsg.includes('access token')
    ) {
      clearPortfolioAccess()
      throw new PortfolioSessionExpiredError(payload.error)
    }
    throw new Error(payload.error || 'Failed to load viewer')
  }

  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (message.includes('401') || message.includes('non-2xx')) {
      clearPortfolioAccess()
      throw new PortfolioSessionExpiredError()
    }
    throw new Error(error.message)
  }

  if (!payload || !payload.ok) {
    throw new Error('Invalid viewer response')
  }

  return payload.viewer
}
