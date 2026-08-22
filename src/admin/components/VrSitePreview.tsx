import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { pauseSmoothScroll, resumeSmoothScroll } from '../../lib/lenisControl'
import type { PortfolioItemRow } from '../types'

const PREVIEW_GRID =
  'grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-5'

function PreviewCard({
  tour,
  position,
}: {
  tour: PortfolioItemRow
  position: number
}) {
  const builder = tour.builder_name?.trim()
  const project = (tour.project_name ?? tour.name).trim()
  const city = (tour.city_label ?? tour.cities?.name ?? '').trim()

  return (
    <div className="portfolio-card-shell portfolio-card-front relative aspect-[4/3] overflow-hidden lg:aspect-video">
      <span className="absolute left-3 top-3 z-20 rounded-full bg-cyan px-2 py-0.5 text-[10px] font-bold text-navy">
        #{position}
      </span>
      <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center gap-2 px-4 py-5 text-center">
        {builder && (
          <p className="line-clamp-1 w-full text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/75">
            {builder}
          </p>
        )}
        <h3 className="font-display line-clamp-2 w-full text-base font-extrabold leading-snug tracking-tight text-white sm:text-lg">
          {project}
        </h3>
        {city && (
          <p className="line-clamp-1 w-full text-xs text-white/70 sm:text-sm">{city}</p>
        )}
      </div>
    </div>
  )
}

export function VrSitePreview({
  tours,
  saving,
  onConfirm,
  onCancel,
}: {
  tours: PortfolioItemRow[]
  saving?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const live = tours.filter((tour) => tour.is_published)

  useEffect(() => {
    pauseSmoothScroll()
    return () => resumeSmoothScroll()
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Cancel sort preview"
        className="absolute inset-0 bg-navy-deep/70"
        onClick={onCancel}
        disabled={saving}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vr-sort-preview-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy-deep shadow-2xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p id="vr-sort-preview-title" className="text-[10px] font-bold uppercase tracking-wider text-cyan">
              Site preview
            </p>
            <p className="mt-1 text-sm text-white/70">
              This is how Virtual Reality will look. Nothing is saved until you confirm.
            </p>
          </div>
          <p className="text-xs text-white/50">{live.length} live</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {live.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/50">No published virtual tours yet.</p>
          ) : (
            <div className={PREVIEW_GRID}>
              {live.map((tour, index) => (
                <PreviewCard key={tour.id} tour={tour} position={index + 1} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white/80 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-full bg-cyan px-6 py-2.5 text-sm font-bold text-navy shadow-lg shadow-cyan/20 hover:bg-cyan-bright disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm & apply'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
