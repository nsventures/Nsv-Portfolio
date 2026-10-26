import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

import { COMMERCIAL_PAGES, type CommercialPage } from '../../data/commercialPages'
import { pauseSmoothScroll, resumeSmoothScroll } from '../../lib/lenisControl'
import { useMediaQuery, usePrefersReducedMotion } from '../../hooks/useMotion'

const TURN_MS = 820

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** A page image with its URLs/phone numbers overlaid as real links. */
function Page({
  page,
  index,
  interactive,
  className = '',
}: {
  page?: CommercialPage
  index: number
  interactive: boolean
  className?: string
}) {
  if (!page) return <div className={className} aria-hidden />

  return (
    <div className={`relative bg-white ${className}`}>
      <img
        src={page.src}
        alt={`Commercial page ${index + 1}`}
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
      {interactive &&
        page.links.map((link) => (
          <a
            key={`${link.href}-${link.x}-${link.y}`}
            href={link.href}
            target={link.href.startsWith('http') ? '_blank' : undefined}
            rel={link.href.startsWith('http') ? 'noreferrer noopener' : undefined}
            aria-label={link.label}
            data-cursor="pointer"
            // Invisible hotspot — the page art already shows where the link is.
            className="absolute cursor-pointer"
            style={{
              left: `${link.x}%`,
              top: `${link.y}%`,
              width: `${link.w}%`,
              height: `${link.h}%`,
            }}
          />
        ))}
    </div>
  )
}

export function CommercialFlipbook({ onClose }: { onClose: () => void }) {
  const reducedMotion = usePrefersReducedMotion()
  const isSpread = useMediaQuery('(min-width: 860px)')
  const pages = COMMERCIAL_PAGES
  // Spread mode opens on the cover alone, then pages pair up like a real book.
  const leafCount = isSpread ? 1 + Math.ceil((pages.length - 1) / 2) : pages.length
  const RATIO = isSpread ? 1.414 : 0.707

  const [leaf, setLeaf] = useState(0)
  // The sheet mid-turn: which leaf it started from and which way it is going.
  const [turning, setTurning] = useState<{ from: number; dir: 1 | -1 } | null>(null)
  const timer = useRef<number>(0)

  /** side 0 = left page, 1 = right page. Leaf 0 holds only the cover. */
  const pageAt = (leafIndex: number, side: 0 | 1) => {
    if (!isSpread) return pages[leafIndex]
    if (leafIndex <= 0) return side === 1 ? pages[0] : undefined
    return pages[side === 0 ? leafIndex * 2 - 1 : leafIndex * 2]
  }

  const pageNumber = (leafIndex: number, side: 0 | 1) => {
    if (!isSpread) return leafIndex
    if (leafIndex <= 0) return 0
    return side === 0 ? leafIndex * 2 - 1 : leafIndex * 2
  }

  // Read the current leaf from a ref: scheduling the turn inside a setState
  // updater made StrictMode run it twice and swallow every second click.
  const leafRef = useRef(0)

  const go = useCallback(
    (dir: 1 | -1) => {
      if (timer.current) return

      const current = leafRef.current
      const next = current + dir
      if (next < 0 || next >= leafCount) return

      leafRef.current = next
      setLeaf(next)
      if (reducedMotion) return

      setTurning({ from: current, dir })
      // Safety net only — the sheet normally clears itself on animation end.
      // A plain timeout fires a frame or two early and snaps the page away.
      timer.current = window.setTimeout(() => {
        setTurning(null)
        timer.current = 0
      }, TURN_MS + 200)
    },
    [leafCount, reducedMotion],
  )

  useEffect(() => {
    pauseSmoothScroll()
    return () => {
      resumeSmoothScroll()
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  useEffect(() => {
    for (const i of [leaf + 1, leaf - 1]) {
      for (const side of [0, 1] as const) {
        const page = pageAt(i, side)
        if (!page) continue
        // decode(), not just load: the back face rasterises as it swings past
        // 90deg, and decoding it there costs a dropped frame mid-turn.
        const img = new Image()
        img.src = page.src
        void img.decode?.().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaf])

  const atStart = leaf === 0
  const atEnd = leaf === leafCount - 1

  // A leaf holding one page (front or back cover) is centred like a shut book.
  const hasLeft = Boolean(pageAt(leaf, 0))
  const hasRight = Boolean(pageAt(leaf, 1))
  const bookShift = !isSpread || (hasLeft && hasRight) ? '0%' : hasRight ? '-25%' : '25%'

  /*
   * When a cover is showing, the book *box* is still a full spread wide but
   * only its middle half is painted, so arrows pinned to the box edges sit a
   * quarter-spread away from the artwork. Pull them in by that quarter.
   */
  const coverOnly = isSpread && !(hasLeft && hasRight)
  const arrowInset = coverOnly ? 'calc(25% - 3.25rem)' : '-3.25rem'

  // While a sheet is turning, the pages underneath must already be the new leaf
  // on the side being revealed, and the old one on the side being covered.
  const base = turning
    ? { left: turning.dir === 1 ? turning.from : leaf, right: turning.dir === 1 ? leaf : turning.from }
    : { left: leaf, right: leaf }

  const sheetFront = turning
    ? pageAt(turning.from, turning.dir === 1 ? 1 : 0)
    : undefined
  const sheetBack = turning ? pageAt(leaf, turning.dir === 1 ? 0 : 1) : undefined

  const pageClass = 'h-full w-full overflow-hidden'
  const navClass =
    'pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10'

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex flex-col items-center justify-center bg-navy-deep/92 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="NS Ventures commercial"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-6 sm:top-6"
        data-cursor="pointer"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      <div className="relative z-[1]">
      <div
        className="relative flex items-center justify-center [perspective:1700px] [perspective-origin:50%_45%] [--fb-gutter:2rem] sm:[--fb-gutter:11rem]"
        style={{
          // Bounded by height *and* width, so the book never runs off a phone.
          // The gutter also leaves room for the arrows once they flank it.
          aspectRatio: String(RATIO),
          height: `min(78vh, calc((100vw - var(--fb-gutter)) / ${RATIO}))`,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <motion.div
          className="relative flex h-full w-full [transform-style:preserve-3d]"
          // Closed book sits centred; opening slides it into the spread position.
          animate={{ x: bookShift }}
          transition={{ duration: TURN_MS / 1000, ease: [0.42, 0, 0.3, 1] }}
        >
          {isSpread && (
            <div
              className={`relative h-full w-1/2 overflow-hidden rounded-l-md ${
                pageAt(base.left, 0) ? 'shadow-2xl shadow-black/60' : ''
              }`}
            >
              <Page
                page={pageAt(base.left, 0)}
                index={pageNumber(base.left, 0)}
                interactive={!turning}
                className={pageClass}
              />
            </div>
          )}

          <div
            className={`relative h-full overflow-hidden ${
              isSpread ? 'w-1/2 rounded-r-md' : 'w-full rounded-md'
            } ${pageAt(base.right, 1) ? 'shadow-2xl shadow-black/60' : ''}`}
          >
            <Page
              page={pageAt(base.right, 1)}
              index={pageNumber(base.right, 1)}
              interactive={!turning}
              className={pageClass}
            />
          </div>

          {/* The sheet in flight: front is the page you were reading, back is
              the one that lands face-up when it finishes. */}
          {turning && (
            <motion.div
              className={`absolute top-0 h-full [transform-style:preserve-3d] ${
                isSpread ? 'w-1/2' : 'w-full'
              } ${turning.dir === 1 ? 'right-0 origin-left' : 'left-0 origin-right'}`}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: turning.dir === 1 ? -180 : 180 }}
              transition={{ duration: TURN_MS / 1000, ease: [0.36, 0, 0.26, 1] }}
              onAnimationComplete={() => {
                if (timer.current) {
                  window.clearTimeout(timer.current)
                  timer.current = 0
                }
                setTurning(null)
              }}
              style={{
                zIndex: 5,
                // Lift the sheet off the page it starts flush against,
                // otherwise the two coplanar faces shimmer as it leaves.
                transform: 'translateZ(0.5px)',
                willChange: 'transform',
              }}
            >
              <div
                className="absolute inset-0 overflow-hidden rounded-r-md [backface-visibility:hidden]"
                // Composite both faces before the turn starts; promoting them
                // mid-flight costs a dropped frame.
                style={{ willChange: 'transform', transform: 'translateZ(0)' }}
              >
                <Page page={sheetFront} index={0} interactive={false} className={pageClass} />
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/45 to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.9, 0] }}
                  transition={{ duration: TURN_MS / 1000, times: [0, 0.5, 1] }}
                />
              </div>

              <div
                className="absolute inset-0 overflow-hidden rounded-l-md [backface-visibility:hidden]"
                style={{ transform: 'rotateY(180deg) translateZ(0)', willChange: 'transform' }}
              >
                <Page page={sheetBack} index={0} interactive={false} className={pageClass} />
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 to-transparent"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: [0.9, 0.9, 0] }}
                  transition={{ duration: TURN_MS / 1000, times: [0, 0.5, 1] }}
                />
              </div>
            </motion.div>
          )}

          {/* Spine shading so the two halves read as one bound book. */}
          {isSpread && hasLeft && hasRight && (
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/25 to-black/0" />
          )}
        </motion.div>
      </div>

      {/*
        From sm up the arrows flank the book itself, just outside its edges. On
        phones the book fills the width, so they sit under it with the counter.
      */}
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={atStart}
        aria-label="Previous page"
        className={`${navClass} absolute top-1/2 z-[2] hidden -translate-y-1/2 sm:grid`}
        style={{ left: arrowInset }}
        data-cursor="pointer"
      >
        <ChevronIcon className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => go(1)}
        disabled={atEnd}
        aria-label="Next page"
        className={`${navClass} absolute top-1/2 z-[2] hidden -translate-y-1/2 sm:grid`}
        style={{ right: arrowInset }}
        data-cursor="pointer"
      >
        <ChevronIcon className="h-5 w-5 rotate-180" />
      </button>
      </div>

      <div className="pointer-events-none relative z-[1] mt-5 flex items-center gap-5">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={atStart}
          aria-label="Previous page"
          className={`${navClass} sm:hidden`}
          data-cursor="pointer"
        >
          <ChevronIcon className="h-5 w-5" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70 tabular-nums">
          {(() => {
            if (!isSpread) return `${leaf + 1} / ${pages.length}`
            if (leaf === 0) return `1 / ${pages.length}`
            const left = leaf * 2
            const right = Math.min(leaf * 2 + 1, pages.length)
            return left === right ? `${left} / ${pages.length}` : `${left}–${right} / ${pages.length}`
          })()}
        </p>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={atEnd}
          aria-label="Next page"
          className={`${navClass} sm:hidden`}
          data-cursor="pointer"
        >
          <ChevronIcon className="h-5 w-5 rotate-180" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
