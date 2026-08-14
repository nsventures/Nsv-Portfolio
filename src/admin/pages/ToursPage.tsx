import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { getPortfolioThumbnail } from '../../lib/portfolioMedia'
import {
  deleteTour,
  duplicateTour,
  fetchAdminTours,
  reorderTours,
} from '../api/adminPortfolio'
import { AdminCard, AdminPageHeader } from '../components/AdminLayout'
import type { PortfolioItemRow } from '../types'

type MediaTab = 'virtual-tour' | 'video'
type StatusFilter = 'all' | 'published' | 'draft'

const MEDIA_TABS: { value: MediaTab; label: string }[] = [
  { value: 'virtual-tour', label: 'Virtual tours' },
  { value: 'video', label: 'Videos' },
]

export function ToursPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const [tours, setTours] = useState<PortfolioItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [mediaTab, setMediaTab] = useState<MediaTab>(
    searchParams.get('tab') === 'video' ? 'video' : 'virtual-tour',
  )
  // An explicit ?tab= or a manual click stops the auto-pick below from overriding the user.
  const tabPinned = useRef(searchParams.get('tab') !== null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(focusId)

  const load = () => {
    setLoading(true)
    fetchAdminTours()
      .then(setTours)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tours'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // Open on whichever tab holds the most recently added tour.
  useEffect(() => {
    if (tabPinned.current || loading || tours.length === 0) return

    const newest = tours.reduce((latest, tour) =>
      (tour.created_at ?? '') > (latest.created_at ?? '') ? tour : latest,
    )
    tabPinned.current = true
    setMediaTab(newest.media_type)
  }, [loading, tours])

  useEffect(() => {
    if (!focusId || loading || tours.length === 0) return

    // A tour linked from elsewhere may live on the other tab.
    const target = tours.find((t) => t.id === focusId)
    if (target && target.media_type !== mediaTab) {
      tabPinned.current = true
      setMediaTab(target.media_type)
      return
    }

    setHighlightId(focusId)
    const row = document.getElementById(`tour-row-${focusId}`)
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })

    const next = new URLSearchParams(searchParams)
    next.delete('focus')
    setSearchParams(next, { replace: true })

    const timer = window.setTimeout(() => setHighlightId(null), 3500)
    return () => window.clearTimeout(timer)
  }, [focusId, loading, tours, mediaTab, searchParams, setSearchParams])

  const selectTab = (tab: MediaTab) => {
    setMediaTab(tab)
    tabPinned.current = true
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tours.filter((t) => {
      if (t.media_type !== mediaTab) return false
      const projectName = (t.project_name ?? t.name).toLowerCase()
      const builder = (t.builder_name ?? '').toLowerCase()
      const city = (t.city_label ?? t.cities?.name ?? '').toLowerCase()
      if (
        q &&
        !projectName.includes(q) &&
        !builder.includes(q) &&
        !city.includes(q) &&
        !t.id.toLowerCase().includes(q)
      ) {
        return false
      }
      if (stateFilter === 'none' && t.state) return false
      if (stateFilter !== 'all' && stateFilter !== 'none' && t.state !== stateFilter) return false
      if (statusFilter === 'published' && !t.is_published) return false
      if (statusFilter === 'draft' && t.is_published) return false
      return true
    })
  }, [tours, search, stateFilter, mediaTab, statusFilter])

  const noStateCount = useMemo(
    () => tours.filter((t) => t.media_type === mediaTab && !t.state).length,
    [tours, mediaTab],
  )

  const filterStates = useMemo(() => {
    const fromData = new Set(
      tours.filter((t) => t.media_type === mediaTab).map((t) => t.state).filter(Boolean) as string[],
    )
    return [...fromData].sort((a, b) => a.localeCompare(b))
  }, [tours, mediaTab])

  const tabCounts = useMemo(() => {
    return tours.reduce(
      (counts, tour) => {
        counts[tour.media_type] += 1
        return counts
      },
      { 'virtual-tour': 0, video: 0 } as Record<MediaTab, number>,
    )
  }, [tours])

  // Virtual tours are shown newest-added first, so drag order only applies to videos.
  const canReorder =
    mediaTab === 'video' && !search.trim() && stateFilter === 'all' && statusFilter === 'all'

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await deleteTour(id)
      setTours((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id)
    try {
      const newId = await duplicateTour(id)
      navigate(`/admin/tours/${newId}/edit`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Duplicate failed')
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return

    // Only video sort_order is persisted; virtual tours keep their created_at ordering.
    const others = tours.filter((t) => t.media_type !== 'video')
    const videos = tours.filter((t) => t.media_type === 'video')

    const fromIndex = videos.findIndex((t) => t.id === dragId)
    const toIndex = videos.findIndex((t) => t.id === targetId)
    if (fromIndex < 0 || toIndex < 0) return

    const nextVideos = [...videos]
    const [moved] = nextVideos.splice(fromIndex, 1)
    nextVideos.splice(toIndex, 0, moved)

    setTours([...others, ...nextVideos])
    setDragId(null)
    setSavingOrder(true)
    try {
      await reorderTours(nextVideos.map((t) => t.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reorder failed')
      load()
    } finally {
      setSavingOrder(false)
    }
  }

  const selectClass =
    'rounded-xl border border-border bg-off-white px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-cyan'

  return (
    <>
      <AdminPageHeader
        title="Portfolio"
        subtitle={
          savingOrder
            ? 'Saving order…'
            : mediaTab === 'virtual-tour'
              ? `${filtered.length} virtual tours · newest added first`
              : canReorder
                ? `${filtered.length} videos · drag ⠿ to reorder`
                : `${filtered.length} of ${tabCounts.video} videos · clear filters to reorder`
        }
        action={
          <Link
            to="/admin/tours/new"
            className="inline-flex items-center rounded-full bg-cyan px-6 py-3 text-sm font-bold text-navy shadow-lg shadow-cyan/20 hover:bg-cyan-bright transition-colors"
          >
            + Add tour
          </Link>
        }
      />

      {error && (
        <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="mb-4 flex gap-2 border-b border-border" role="tablist">
        {MEDIA_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={mediaTab === tab.value}
            onClick={() => selectTab(tab.value)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              mediaTab === tab.value
                ? 'border-cyan text-navy'
                : 'border-transparent text-slate hover:text-navy'
            }`}
          >
            {tab.label}
            <span className="ml-2 rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-bold text-slate">
              {tabCounts[tab.value]}
            </span>
          </button>
        ))}
      </div>

      <AdminCard className="p-4 sm:p-5 mb-6 overflow-visible">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search builder, project, city, or slug…"
            className="rounded-xl border border-border bg-off-white px-4 py-2.5 text-sm text-navy focus:outline-none focus:border-cyan sm:col-span-2 lg:col-span-1"
          />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All states</option>
            {noStateCount > 0 && (
              <option value="none">No state ({noStateCount})</option>
            )}
            {filterStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={selectClass}
          >
            <option value="all">All status</option>
            <option value="published">Live</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </AdminCard>

      <AdminCard className="overflow-visible">
        {loading ? (
          <div className="p-12 text-center text-slate text-sm">Loading portfolio…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate text-sm">No tours match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-off-white/80">
                  <th className="px-3 py-4 w-10" aria-label="Reorder" />
                  <th className="px-3 py-4 font-semibold text-slate text-[10px] uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="px-3 py-4 font-semibold text-slate text-[10px] uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-3 py-4 font-semibold text-slate text-[10px] uppercase tracking-wider hidden sm:table-cell">
                    Builder
                  </th>
                  <th className="px-3 py-4 font-semibold text-slate text-[10px] uppercase tracking-wider hidden md:table-cell">
                    State
                  </th>
                  <th className="px-3 py-4 font-semibold text-slate text-[10px] uppercase tracking-wider hidden lg:table-cell">
                    City
                  </th>
                  <th className="px-3 py-4 font-semibold text-slate text-[10px] uppercase tracking-wider hidden xl:table-cell">
                    Type
                  </th>
                  <th className="px-3 py-4 font-semibold text-slate text-[10px] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-4 font-semibold text-slate text-[10px] uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tour) => (
                  <tr
                    key={tour.id}
                    id={`tour-row-${tour.id}`}
                    draggable={canReorder}
                    onDragStart={() => canReorder && setDragId(tour.id)}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(e) => canReorder && e.preventDefault()}
                    onDrop={() => canReorder && handleDrop(tour.id)}
                    className={`border-b border-border last:border-0 transition-colors ${
                      highlightId === tour.id
                        ? 'bg-cyan/15 ring-2 ring-inset ring-cyan/40'
                        : dragId === tour.id
                          ? 'bg-cyan/5 opacity-60'
                          : 'hover:bg-off-white/50'
                    }`}
                  >
                    <td
                      className={`px-3 py-4 text-slate-light select-none ${
                        canReorder ? 'cursor-grab active:cursor-grabbing' : 'opacity-30'
                      }`}
                    >
                      ⠿
                    </td>
                    <td className="px-3 py-4">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-navy/5">
                        <img
                          src={getPortfolioThumbnail(
                            tour.thumbnail_path,
                            tour.updated_at ?? tour.id,
                          )}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-navy">
                        {tour.project_name?.trim() || tour.name}
                      </p>
                      <p className="text-xs text-slate-light mt-0.5 truncate max-w-[180px]">
                        {tour.id}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-slate hidden sm:table-cell">
                      {tour.builder_name ?? '—'}
                    </td>
                    <td className="px-3 py-4 text-slate hidden md:table-cell">
                      {tour.state ?? '—'}
                    </td>
                    <td className="px-3 py-4 text-slate hidden lg:table-cell">
                      {tour.city_label ?? tour.cities?.name ?? '—'}
                    </td>
                    <td className="px-3 py-4 hidden xl:table-cell">
                      <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-navy/5 text-navy">
                        {tour.media_type === 'video' ? 'Video' : 'VR'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={
                          tour.is_published
                            ? 'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700'
                            : 'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate'
                        }
                      >
                        {tour.is_published ? 'Live' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link
                        to={`/admin/tours/${tour.id}/edit`}
                        className="text-cyan font-semibold hover:text-cyan-bright mr-3"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={duplicatingId === tour.id}
                        onClick={() => handleDuplicate(tour.id)}
                        className="text-navy font-semibold hover:text-cyan mr-3 disabled:opacity-50"
                      >
                        {duplicatingId === tour.id ? '…' : 'Duplicate'}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === tour.id}
                        onClick={() =>
                          handleDelete(tour.id, tour.project_name?.trim() || tour.name)
                        }
                        className="text-red-500 font-semibold hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === tour.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </>
  )
}
