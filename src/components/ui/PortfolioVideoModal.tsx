import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchPortfolioViewer } from '../../api/portfolio'
import type { PortfolioEntry } from '../../types/portfolio'
import { PortfolioSessionExpiredError } from '../../lib/portfolioAccess'
import { formatVideoPublishedDate } from '../../lib/formatVideoDate'
import { pauseSmoothScroll, resumeSmoothScroll } from '../../lib/lenisControl'
import { getPortfolioViewerSrc } from '../../lib/portfolioViewer'
import { YoutubePrivatePlayer } from './YoutubePrivatePlayer'

interface PortfolioVideoModalProps {
  entry: PortfolioEntry
  onClose: () => void
  onSessionExpired?: () => void
}

export function PortfolioVideoModal({ entry, onClose, onSessionExpired }: PortfolioVideoModalProps) {
  const [mediaReady, setMediaReady] = useState(false)
  const [viewer, setViewer] = useState<ReturnType<typeof getPortfolioViewerSrc>>(null)
  const [viewerError, setViewerError] = useState(false)

  const project = (entry.projectName ?? entry.name).trim()
  const builder = entry.builderName?.trim()
  const city = entry.city?.trim()
  const publishedLabel =
    entry.mediaType === 'video' ? formatVideoPublishedDate(entry.videoPublishedAt) : null
  const meta = [builder, city, publishedLabel].filter(Boolean).join(' · ')
  const isVirtualTour = entry.mediaType === 'virtual-tour'

  useEffect(() => {
    let cancelled = false

    setMediaReady(false)
    setViewer(null)
    setViewerError(false)

    fetchPortfolioViewer(entry.id)
      .then((payload) => {
        if (cancelled) return
        if (!payload) {
          setViewerError(true)
          return
        }
        setViewer(getPortfolioViewerSrc(payload))
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof PortfolioSessionExpiredError) {
            onSessionExpired?.()
          }
          setViewerError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [entry.id, onSessionExpired])

  useEffect(() => {
    pauseSmoothScroll()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      resumeSmoothScroll()
    }
  }, [onClose])

  return createPortal(
    <div
      className="portfolio-modal fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="portfolio-modal-backdrop absolute inset-0"
        aria-label="Close viewer"
        onClick={onClose}
      />

      <div
        className={`portfolio-modal-panel relative z-10 flex w-full flex-col overflow-hidden ${
          isVirtualTour ? 'max-w-6xl h-[min(92vh,920px)]' : 'max-w-5xl'
        }`}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-video-modal-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <h2
              id="portfolio-video-modal-title"
              className="truncate font-display text-base font-bold leading-tight text-navy sm:text-lg"
            >
              {project}
            </h2>
            {meta && (
              <>
                <span className="shrink-0 text-xs text-slate/40" aria-hidden>
                  ·
                </span>
                <p className="min-w-0 truncate text-sm text-slate sm:text-[0.9375rem]">{meta}</p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-off-white text-slate transition-colors hover:border-cyan/40 hover:text-navy"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <div
          className={
            isVirtualTour
              ? 'portfolio-modal-media portfolio-modal-media--tour relative min-h-0 w-full flex-1 bg-[#0a0a0a]'
              : 'portfolio-modal-media portfolio-modal-media--video relative w-full aspect-video bg-[#0a0a0a]'
          }
        >
          {viewerError ? (
            <div
              className={`flex items-center justify-center px-6 text-center text-sm text-white/70 ${
                isVirtualTour ? 'absolute inset-0' : 'aspect-video'
              }`}
            >
              Unable to load this project. Please try again later.
            </div>
          ) : (
            <>
              {(!viewer || !mediaReady) && (
                <div
                  className={`absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a] ${
                    isVirtualTour ? '' : 'aspect-video'
                  }`}
                  aria-hidden
                >
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-cyan" />
                </div>
              )}

              {viewer?.mode === 'native-video' ? (
                <video
                  key={entry.id}
                  src={viewer.src}
                  controls
                  playsInline
                  autoPlay
                  preload="metadata"
                  onLoadedData={() => setMediaReady(true)}
                  className={`w-full bg-black object-contain transition-opacity duration-200 aspect-video ${
                    mediaReady ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ) : viewer?.youtube && viewer.youtubeVideoId ? (
                <YoutubePrivatePlayer
                  key={entry.id}
                  videoId={viewer.youtubeVideoId}
                  title={project}
                  onReady={() => setMediaReady(true)}
                />
              ) : viewer ? (
                <iframe
                  key={entry.id}
                  src={viewer.src}
                  title={project}
                  onLoad={() => {
                    window.setTimeout(() => setMediaReady(true), isVirtualTour ? 400 : 0)
                  }}
                  className={
                    isVirtualTour
                      ? `absolute inset-0 h-full w-full border-0 bg-[#0a0a0a] transition-opacity duration-200 ${
                          mediaReady ? 'opacity-100' : 'opacity-0'
                        }`
                      : `w-full border-0 bg-black aspect-video transition-opacity duration-200 ${
                          mediaReady ? 'opacity-100' : 'opacity-0'
                        }`
                  }
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; xr-spatial-tracking"
                  allowFullScreen={isVirtualTour}
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
