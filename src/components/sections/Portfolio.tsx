import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { usePortfolioAccess } from '../../context/PortfolioAccessContext'
import { usePortfolio } from '../../hooks/usePortfolio'
import { INDIAN_STATES } from '../../data/indianStates'
import {
  PORTFOLIO_FILTER_EVENT,
  portfolioFiltersToUrl,
  readPortfolioFilters,
} from '../../lib/portfolioNav'
import type { PortfolioEntry, PortfolioMediaType } from '../../types/portfolio'
import { PortfolioCard } from '../ui/PortfolioCard'
import { SearchableFilterDropdown } from '../ui/SearchableFilterDropdown'

const CARD_GRID =
  'grid grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-5'

export function Portfolio() {
  const navigate = useNavigate()
  const { pathname, search, hash } = useLocation()
  // One object, because the URL is the source of truth for both and they have
  // to move together — a campaign link sets media *and* state in one go.
  const [filters, setFilters] = useState(() => readPortfolioFilters())
  const { media: mediaFilter, state: activeState } = filters
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { openPortfolioItem } = usePortfolioAccess()

  const {
    items,
    stateCounts,
    noStateCount,
    total,
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

  // URL -> filters. Covers the first paint, Back/Forward, and anything else
  // that moves the router.
  useEffect(() => {
    setFilters(readPortfolioFilters(pathname, search, hash))
  }, [pathname, search, hash])

  useEffect(() => {
    // Switching tab keeps the state you're looking at — someone browsing
    // Bihar videos who taps Virtual Reality Tour wants Bihar tours, not the
    // whole country. Only the filter box clears it.
    const onFilter = (e: Event) =>
      setFilters((prev) => ({ ...prev, media: (e as CustomEvent<PortfolioMediaType>).detail }))
    window.addEventListener(PORTFOLIO_FILTER_EVENT, onFilter)
    return () => window.removeEventListener(PORTFOLIO_FILTER_EVENT, onFilter)
  }, [])

  // filters -> URL, so any view can be copied and handed out as a campaign
  // link. `replace`, not push: people flick through states while browsing, and
  // every flick becoming a history entry would turn Back into a filter undo
  // instead of what it should be — leaving the site.
  useEffect(() => {
    const next = portfolioFiltersToUrl(filters, pathname, search, hash)
    if (next !== `${pathname}${search}${hash}`) navigate(next, { replace: true })
  }, [filters, pathname, search, hash, navigate])

  const stateAssignedCount = useMemo(
    () => Object.values(stateCounts).reduce((sum, count) => sum + count, 0),
    [stateCounts],
  )

  // All states = assigned states + videos with no state
  const allStatesCount =
    activeState === null ? total || stateAssignedCount + noStateCount : stateAssignedCount + noStateCount

  const statesWithContent = useMemo(
    () => INDIAN_STATES.filter((state) => (stateCounts[state] ?? 0) > 0),
    [stateCounts],
  )

  const stateOptions = useMemo(() => {
    const options = [
      { value: '', label: 'All states', count: allStatesCount },
      ...statesWithContent.map((state) => ({
        value: state,
        label: state,
        count: stateCounts[state] ?? 0,
      })),
    ]
    // A campaign link can point at a state that has nothing yet. Without an
    // option to match, the dropdown would read "Select state" while the grid
    // said the state was empty.
    if (activeState && !statesWithContent.some((state) => state === activeState)) {
      options.push({ value: activeState, label: activeState, count: 0 })
    }
    return options
  }, [activeState, allStatesCount, stateCounts, statesWithContent])

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
          <div className="relative z-20 mb-6 flex justify-center overflow-visible">
            <SearchableFilterDropdown
                id="portfolio-state-filter"
                value={activeState ?? ''}
                options={stateOptions}
                disabled={loading}
                placeholder="Select state"
                searchPlaceholder="Search states…"
                emptySearchMessage={stateSearchEmptyMessage}
                onChange={(value) => setFilters((prev) => ({ ...prev, state: value || null }))}
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
