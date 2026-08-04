import { useCallback, useEffect, useRef, useState } from 'react'

interface YtPlayer {
  playVideo: () => void
  pauseVideo: () => void
  getPlayerState: () => number
  destroy: () => void
  setSize: (width: number, height: number) => void
  setPlaybackQuality: (quality: string) => void
  setPlaybackQualityRange?: (min: string, max: string) => void
  getAvailableQualityLevels: () => string[]
  unloadModule?: (module: string) => void
  setOption?: (module: string, option: string, value: unknown) => void
}

const QUALITY_PREFERENCE = ['highres', 'hd1080', 'hd720', 'large', 'medium'] as const
/** Floor so YouTube ABR prefers HD — scaled to fit (no crop). */
const MIN_1080_WIDTH = 1920
const MIN_1080_HEIGHT = 1080

function suppressCaptions(player: YtPlayer) {
  try {
    player.unloadModule?.('captions')
    player.unloadModule?.('cc')
    player.setOption?.('captions', 'track', {})
  } catch {
    // Modules may be unavailable until API change fires
  }
}

function requestHighestQuality(player: YtPlayer) {
  try {
    player.setPlaybackQualityRange?.('hd1080', 'highres')
  } catch {
    // Optional API
  }

  try {
    const available = player.getAvailableQualityLevels()
    const pick =
      QUALITY_PREFERENCE.find((q) => available.includes(q)) ??
      available[0] ??
      'hd1080'
    player.setPlaybackQuality(pick)
  } catch {
    try {
      player.setPlaybackQuality('hd1080')
    } catch {
      // YouTube may reject until playback starts
    }
  }
}

/** Render ≥1080p 16:9, then CSS-scale to fit the shell (contain — no clipping). */
function targetPlayerSize(shellWidth: number, shellHeight: number) {
  const byWidth = {
    width: Math.max(MIN_1080_WIDTH, Math.ceil(shellWidth)),
    height: Math.round(Math.max(MIN_1080_WIDTH, Math.ceil(shellWidth)) * (9 / 16)),
  }
  const byHeight = {
    height: Math.max(MIN_1080_HEIGHT, Math.ceil(shellHeight)),
    width: Math.round(Math.max(MIN_1080_HEIGHT, Math.ceil(shellHeight)) * (16 / 9)),
  }
  // Prefer the canvas that still fits after contain-scale (smaller scale factor wins).
  const scaleW = Math.min(shellWidth / byWidth.width, shellHeight / byWidth.height)
  const scaleH = Math.min(shellWidth / byHeight.width, shellHeight / byHeight.height)
  return scaleW >= scaleH ? byWidth : byHeight
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => YtPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<void> | null = null

function loadYoutubeIframeApi(): Promise<void> {
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve()
      return
    }

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)
  })

  return youtubeApiPromise
}

interface YoutubePrivatePlayerProps {
  videoId: string
  title: string
  onReady: () => void
}

export function YoutubePrivatePlayer({ videoId, title, onReady }: YoutubePrivatePlayerProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const playerTargetRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const onReadyRef = useRef(onReady)
  const [isFullscreen, setIsFullscreen] = useState(false)
  onReadyRef.current = onReady

  const syncPlayerSize = useCallback(() => {
    const shell = shellRef.current
    const mount = mountRef.current
    const player = playerRef.current
    if (!shell || !mount || !player) return

    const shellW = shell.clientWidth
    const shellH = shell.clientHeight
    if (shellW <= 0 || shellH <= 0) return

    const { width, height } = targetPlayerSize(shellW, shellH)
    // Contain: show the full frame (no crop/zoom).
    const scale = Math.min(shellW / width, shellH / height)
    mount.style.width = `${width}px`
    mount.style.height = `${height}px`
    mount.style.transform = `translate(-50%, -50%) scale(${scale})`
    player.setSize(width, height)
    requestHighestQuality(player)
  }, [])

  useEffect(() => {
    const target = playerTargetRef.current
    const mount = mountRef.current
    const shell = shellRef.current
    if (!target || !mount || !shell || !videoId) return

    let cancelled = false
    let resizeObserver: ResizeObserver | undefined

    void loadYoutubeIframeApi().then(() => {
      if (cancelled || !playerTargetRef.current || !window.YT?.Player) return

      const shellW = shell.clientWidth || 640
      const shellH = shell.clientHeight || 360
      const { width, height } = targetPlayerSize(shellW, shellH)
      const scale = Math.min(shellW / width, shellH / height)
      mount.style.width = `${width}px`
      mount.style.height = `${height}px`
      mount.style.transform = `translate(-50%, -50%) scale(${scale})`

      // Inner node is replaced by YT iframe; outer mount keeps sizing.
      playerRef.current = new window.YT.Player(playerTargetRef.current, {
        videoId,
        width,
        height,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          enablejsapi: 1,
          cc_load_policy: 0,
          vq: 'hd1080',
          origin: window.location.origin,
        },
        events: {
          onReady: (event: { target: YtPlayer }) => {
            if (cancelled) return
            playerRef.current = event.target
            suppressCaptions(event.target)
            requestAnimationFrame(() => {
              syncPlayerSize()
              requestHighestQuality(event.target)
              suppressCaptions(event.target)
              onReadyRef.current()
            })
          },
          onStateChange: (event: { data: number; target: YtPlayer }) => {
            const YT = window.YT
            if (!YT) return
            if (
              event.data === YT.PlayerState.PLAYING ||
              event.data === YT.PlayerState.BUFFERING
            ) {
              suppressCaptions(event.target)
              requestHighestQuality(event.target)
              syncPlayerSize()
            }
          },
          onApiChange: (event: { target: YtPlayer }) => {
            suppressCaptions(event.target)
          },
        },
      })

      resizeObserver = new ResizeObserver(() => syncPlayerSize())
      resizeObserver.observe(shell)
    })

    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current)
      requestAnimationFrame(() => syncPlayerSize())
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId, syncPlayerSize])

  const togglePlayback = () => {
    const player = playerRef.current
    const YT = window.YT
    if (!player || !YT) return

    const state = player.getPlayerState()
    if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
      player.pauseVideo()
    } else {
      player.playVideo()
    }
  }

  const toggleFullscreen = async () => {
    const shell = shellRef.current
    if (!shell) return

    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen()
      } else {
        await shell.requestFullscreen()
      }
    } catch {
      // Browser blocked or unsupported
    }
  }

  return (
    <div
      ref={shellRef}
      className="portfolio-youtube-shell relative w-full aspect-video overflow-hidden bg-black"
    >
      <div ref={mountRef} className="portfolio-youtube-mount absolute" title="">
        <div ref={playerTargetRef} />
      </div>

      {/* Soft dark covers — hide YouTube title / logo / more-videos (no cross-origin blur) */}
      <div className="portfolio-youtube-mask portfolio-youtube-mask--top" aria-hidden />
      <div className="portfolio-youtube-mask portfolio-youtube-mask--bottom" aria-hidden />
      <div className="portfolio-youtube-mask portfolio-youtube-mask--yt-logo" aria-hidden />

      <button
        type="button"
        className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        aria-label={`Play or pause ${title}`}
        onClick={togglePlayback}
      />

      <button
        type="button"
        className="portfolio-youtube-fs-btn absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-lg"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={(e) => {
          e.stopPropagation()
          void toggleFullscreen()
        }}
      >
        {isFullscreen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
