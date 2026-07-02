import { useCallback, useEffect, useRef, useState } from 'react'

interface YtPlayer {
  playVideo: () => void
  pauseVideo: () => void
  getPlayerState: () => number
  destroy: () => void
  setSize: (width: number, height: number) => void
  setPlaybackQuality: (quality: string) => void
  getAvailableQualityLevels: () => string[]
}

const QUALITY_PREFERENCE = ['hd1080', 'hd720', 'large', 'medium'] as const
const MIN_1080_WIDTH = 1920
const MIN_1080_HEIGHT = 1080
const CROP_SCALE = 1.12

function requestHighestQuality(player: YtPlayer) {
  try {
    const available = player.getAvailableQualityLevels()
    const pick =
      QUALITY_PREFERENCE.find((q) => available.includes(q)) ??
      available[available.length - 1] ??
      'default'
    player.setPlaybackQuality(pick)
  } catch {
    try {
      player.setPlaybackQuality('hd1080')
    } catch {
      // YouTube may reject until playback starts
    }
  }
}

function targetPlayerSize(shellWidth: number, shellHeight: number) {
  const croppedW = Math.ceil(shellWidth * CROP_SCALE)
  const croppedH = Math.ceil(shellHeight * CROP_SCALE)

  // YouTube picks stream quality from player pixel size — target 1080p.
  let width = Math.max(croppedW, MIN_1080_WIDTH)
  let height = Math.max(croppedH, MIN_1080_HEIGHT)

  const shellRatio = shellWidth / shellHeight
  if (width / height > shellRatio) {
    width = Math.ceil(height * shellRatio)
  } else {
    height = Math.ceil(width / shellRatio)
  }

  return { width, height }
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
  const playerRef = useRef<YtPlayer | null>(null)
  const onReadyRef = useRef(onReady)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  onReadyRef.current = onReady

  const syncPlayerSize = useCallback(() => {
    const shell = shellRef.current
    const player = playerRef.current
    if (!shell || !player) return

    // Oversize + 1080p floor so YouTube serves HD and chrome sits outside crop.
    const { width, height } = targetPlayerSize(shell.clientWidth, shell.clientHeight)
    if (width > 0 && height > 0) {
      player.setSize(width, height)
      requestHighestQuality(player)
    }
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    const shell = shellRef.current
    if (!mount || !shell || !videoId) return

    let cancelled = false
    let resizeObserver: ResizeObserver | undefined

    void loadYoutubeIframeApi().then(() => {
      if (cancelled || !mountRef.current || !window.YT?.Player) return

      const { width, height } = targetPlayerSize(shell.clientWidth || 640, shell.clientHeight || 360)

      playerRef.current = new window.YT.Player(mountRef.current, {
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
            requestAnimationFrame(() => {
              syncPlayerSize()
              requestHighestQuality(event.target)
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
              setIsPlaying(true)
              requestHighestQuality(event.target)
              syncPlayerSize()
            } else {
              setIsPlaying(false)
            }
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
      <div ref={mountRef} className="portfolio-youtube-mount absolute" title="" />

      {/* Frosted masks — hide YouTube title, channel link, share & logo */}
      <div className="portfolio-youtube-mask portfolio-youtube-mask--top" aria-hidden />
      <div className="portfolio-youtube-mask portfolio-youtube-mask--bottom" aria-hidden />

      <button
        type="button"
        className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        aria-label={`Play or pause ${title}`}
        onClick={togglePlayback}
      />

      {!isPlaying && (
        <div
          className="pointer-events-none absolute inset-0 z-[12] flex items-center justify-center"
          aria-hidden
        >
          <div className="portfolio-youtube-play-badge flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1 text-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      <button
        type="button"
        className="absolute bottom-2.5 right-2.5 z-20 flex h-9 w-9 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
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
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
