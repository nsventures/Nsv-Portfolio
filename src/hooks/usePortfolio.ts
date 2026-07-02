import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPortfolioPage, PORTFOLIO_PAGE_SIZE } from '../api/portfolio'
import type { PortfolioEntry, PortfolioMediaType } from '../types/portfolio'

interface UsePortfolioOptions {
  state: string | null
  city: string | null
  mediaType: PortfolioMediaType
  category: string | null
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === 'Failed to fetch') {
      return 'Could not reach the server. Check your connection and try again.'
    }
    return err.message
  }
  return 'Failed to load portfolio'
}

export function usePortfolio({ state, city, mediaType, category }: UsePortfolioOptions) {
  const [items, setItems] = useState<PortfolioEntry[]>([])
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({})
  const [stateCounts, setStateCounts] = useState<Record<string, number>>({})
  const [cityStates, setCityStates] = useState<Record<string, string>>({})
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const applyPageResult = useCallback(
    (result: Awaited<ReturnType<typeof fetchPortfolioPage>>, replace: boolean) => {
      setItems((prev) => (replace ? result.items : [...prev, ...result.items]))
      setCityCounts(result.cityCounts)
      setStateCounts(result.stateCounts ?? {})
      setCityStates(result.cityStates ?? {})
      setCategoryCounts(result.categoryCounts ?? {})
      setTotal(result.total)
      setPage(result.page)
      setHasMore(result.hasMore)
    },
    [],
  )

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      const id = ++requestId.current
      replace ? setLoading(true) : setLoadingMore(true)
      if (replace) setError(null)

      try {
        const result = await fetchPortfolioPage({
          page: nextPage,
          pageSize: PORTFOLIO_PAGE_SIZE,
          city: city ?? undefined,
          state: state ?? undefined,
          mediaType,
          category: category ?? undefined,
        })

        if (id !== requestId.current) return

        applyPageResult(result, replace)
      } catch (err) {
        if (id !== requestId.current) return
        setError(toErrorMessage(err))
      } finally {
        if (id === requestId.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [applyPageResult, category, city, mediaType, state],
  )

  useEffect(() => {
    setItems([])
    setPage(0)
    setHasMore(true)
    void loadPage(1, true)
  }, [category, city, loadPage, mediaType, state])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return
    void loadPage(page + 1, false)
  }, [hasMore, loadPage, loading, loadingMore, page])

  return {
    items,
    cityCounts,
    stateCounts,
    cityStates,
    categoryCounts,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMore,
    retry: () => loadPage(1, true),
  }
}
