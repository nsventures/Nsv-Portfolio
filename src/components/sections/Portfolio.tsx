import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePortfolioAccess } from '../../context/PortfolioAccessContext'
import { usePortfolio } from '../../hooks/usePortfolio'
import { INDIAN_STATES } from '../../data/indianStates'
import { parseMediaFilter } from '../../lib/portfolioNav'
import type { PortfolioEntry, PortfolioMediaType } from '../../types/portfolio'
import { PortfolioCard } from '../ui/PortfolioCard'
import { SearchableFilterDropdown } from '../ui/SearchableFilterDropdown'

const CARD_GRID =
  'grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-5'

export function Portfolio() {
  const [mediaFilter, setMediaFilter] = useState<PortfolioMediaType>(() =>
    parseMediaFilter(window.location.hash),
  )
  const [activeState, setActiveState] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { openPortfolioItem } = usePortfolioAccess()

  const {
    items,
    stateCounts,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMore,
    retry,
  } = usePortfolio({
    state: activeState,
    city: null,
    mediaType: mediaFilter,
    category: null,
  })

  useEffect(() => {
    const onHashChange = () => setMediaFilter(parseMediaFilter(window.location.hash))
    const onFilter = (e: Event) => {
      setMediaFilter((e as CustomEvent<PortfolioMediaType>).detail)
    }
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('portfolio-filter', onFilter)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('portfolio-filter', onFilter)
    }
  }, [])

  useEffect(() => {
    setActiveState(null)
  }, [mediaFilter])

  const totalItemCount = useMemo(
    () => Object.values(stateCounts).reduce((sum, count) => sum + count, 0),
    [stateCounts],
  )

  const statesWithContent = useMemo(
    () => INDIAN_STATES.filter((state) => (stateCounts[state] ?? 0) > 0),
    [stateCounts],
  )

  const stateOptions = useMemo(
    () => [
      { value: '', label: 'All states', count: totalItemCount },
      ...statesWithContent.map((state) => ({
        value: state,
        label: state,
        count: stateCounts[state] ?? 0,
      })),
    ],
    [stateCounts, statesWithContent, totalItemCount],
  )

  const stateSearchEmptyMessage = useCallback(
    (query: string) => {
      const normalized = query.trim().toLowerCase()
      if (!normalized) {
        return mediaFilter === 'video'
          ? 'No states with videos yet.'
          : 'No states with virtual tours yet.'
      }

      const matchingStates = INDIAN_STATES.filter((state) =>
        state.toLowerCase().includes(normalized),
      )

      if (matchingStates.length === 0) {
        return 'No state found with that name.'
      }

      const withContent = matchingStates.filter((state) => (stateCounts[state] ?? 0) > 0)
      if (withContent.length > 0) {
        return 'No states found.'
      }

      if (matchingStates.length === 1) {
        const state = matchingStates[0]
        return mediaFilter === 'video'
          ? `No videos in ${state} yet.`
          : `No virtual tours in ${state} yet.`
      }

      return mediaFilter === 'video'
        ? 'No videos in the matching states yet.'
        : 'No virtual tours in the matching states yet.'
    },
    [mediaFilter, stateCounts],
  )

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasMore || loading || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '400px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadMore, items.length])

  const handleOpen = useCallback(
    (entry: PortfolioEntry) => {
      openPortfolioItem(entry)
    },
    [openPortfolioItem],
  )

  const emptyMessage = activeState
    ? mediaFilter === 'video'
      ? 'No videos in this state yet.'
      : 'No virtual tours in this state yet.'
    : mediaFilter === 'video'
      ? 'No videos yet.'
      : 'No virtual tours yet.'

  return (
    <>
      <section
        id="portfolio"
        className="relative z-0 pt-10 pb-12 lg:pt-12 lg:pb-16 bg-off-white overflow-x-clip scroll-mt-24"
        aria-label="Portfolio"
      >
        <div className="w-full px-5 sm:px-8 lg:px-10 xl:px-14">
          <div className="relative z-20 mb-6 overflow-visible">
            <SearchableFilterDropdown
                id="portfolio-state-filter"
                value={activeState ?? ''}
                options={stateOptions}
                disabled={loading}
                placeholder="Select state"
                searchPlaceholder="Search states…"
                emptySearchMessage={stateSearchEmptyMessage}
                onChange={(value) => setActiveState(value || null)}
                className="w-full max-w-xs"
            />
          </div>

          {error && (
            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate">
              <span>{error}</span>
              <button
                type="button"
                onClick={retry}
                className="text-cyan font-semibold hover:underline"
                data-cursor="pointer"
              >
                Retry
              </button>
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className={CARD_GRID}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-xl bg-navy/5 animate-pulse lg:aspect-video"
                  aria-hidden
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-slate py-12 text-sm">{emptyMessage}</p>
          ) : (
            <div className={CARD_GRID}>
              {items.map((entry) => (
                <PortfolioCard key={entry.id} entry={entry} onOpen={handleOpen} />
              ))}
            </div>
          )}

          <div ref={loadMoreRef} className="h-px" aria-hidden />

          {loadingMore && (
            <p className="text-center text-slate/60 text-xs py-6">Loading more…</p>
          )}
        </div>
      </section>

    </>
  )
}
