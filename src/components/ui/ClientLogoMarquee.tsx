import { useCallback, useEffect, useRef, useState } from 'react'

import {
  FEATURED_CLIENT_LOGOS,
  OTHER_CLIENT_LOGOS,
  clientLogoSrc,
  type ClientLogo,
} from '../../data/clientLogos'

/**
 * Two logo rows drifting in opposite directions. Each row renders its list
 * twice and slides by exactly half the track, so the seam never shows.
 */
const MARQUEE_SPEED = 75 // px per second

/** Rows hold different numbers of logos, so a shared duration would run them
 *  at different speeds. Time each one by its own width instead. */
function useMarqueeSpeed<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const track = ref.current
    if (!track) return
    const list = track.firstElementChild as HTMLElement | null
    if (!list) return

    const apply = () => {
      const width = list.getBoundingClientRect().width
      if (width > 0) track.style.animationDuration = `${width / MARQUEE_SPEED}s`
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  return ref
}

function MarqueeRow({
  logos,
  reverse,
  featured,
  onMissing,
}: {
  logos: ClientLogo[]
  reverse?: boolean
  /** Top row: the major builders, shown noticeably larger. */
  featured?: boolean
  onMissing: (file: string) => void
}) {
  const trackRef = useMarqueeSpeed<HTMLDivElement>()

  return (
    <div
      ref={trackRef}
      className={`logo-marquee-track ${reverse ? 'logo-marquee-track--reverse' : ''}`}
    >
      {[0, 1].map((pass) => (
        <ul key={pass} className="logo-marquee-list" aria-hidden={pass === 1}>
          {logos.map((logo) => (
            <li key={`${pass}-${logo.file}`} className="shrink-0">
              <img
                src={clientLogoSrc(logo.file)}
                alt={pass === 0 ? logo.name : ''}
                width={368}
                height={160}
                loading="lazy"
                decoding="async"
                onError={() => onMissing(logo.file)}
                className={`w-auto object-contain mix-blend-multiply transition-transform duration-300 ease-out hover:scale-125 ${
                  // Source files are 368x160, so these stay well within native.
                  featured
                    ? 'h-[5.5rem] sm:h-[clamp(5rem,12.2vh,7.75rem)]'
                    : 'h-[5rem] sm:h-[clamp(4.5rem,10.9vh,7rem)]'
                }`}
              />
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}

/** Classic scrollbars take width off the viewport; overlay ones don't. */
function useScrollbarWidth(): void {
  useEffect(() => {
    const apply = () => {
      const width = window.innerWidth - document.documentElement.clientWidth
      document.documentElement.style.setProperty('--scrollbar-w', `${Math.max(0, width)}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])
}

export function ClientLogoMarquee({ className = '' }: { className?: string }) {
  useScrollbarWidth()

  // A logo deleted from the folder shouldn't leave a broken tile in the strip.
  const [missing, setMissing] = useState<Set<string>>(() => new Set())
  const onMissing = useCallback((file: string) => {
    setMissing((prev) => (prev.has(file) ? prev : new Set(prev).add(file)))
  }, [])

  const topRow = FEATURED_CLIENT_LOGOS.filter((logo) => !missing.has(logo.file))
  const bottomRow = OTHER_CLIENT_LOGOS.filter((logo) => !missing.has(logo.file))
  if (topRow.length === 0 && bottomRow.length === 0) return null

  return (
    <div
      className={`logo-marquee ${className}`}
      aria-label="Clients we work with"
      data-no-drone-cursor
    >
      {topRow.length > 0 && <MarqueeRow logos={topRow} featured onMissing={onMissing} />}
      {bottomRow.length > 0 && <MarqueeRow logos={bottomRow} reverse onMissing={onMissing} />}
    </div>
  )
}
