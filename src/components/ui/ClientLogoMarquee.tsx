import { useCallback, useEffect, useState } from 'react'

import { CLIENT_LOGOS, clientLogoSrc, type ClientLogo } from '../../data/clientLogos'

/**
 * Two logo rows drifting in opposite directions. Each row renders its list
 * twice and slides by exactly half the track, so the seam never shows.
 */
function MarqueeRow({
  logos,
  reverse,
  onMissing,
}: {
  logos: ClientLogo[]
  reverse?: boolean
  onMissing: (file: string) => void
}) {
  return (
    <div className={`logo-marquee-track ${reverse ? 'logo-marquee-track--reverse' : ''}`}>
      {[0, 1].map((pass) => (
        <ul key={pass} className="logo-marquee-list" aria-hidden={pass === 1}>
          {logos.map((logo) => (
            <li key={`${pass}-${logo.file}`} className="shrink-0">
              <img
                src={clientLogoSrc(logo.file)}
                alt={pass === 0 ? logo.name : ''}
                width={184}
                height={80}
                loading="lazy"
                decoding="async"
                onError={() => onMissing(logo.file)}
                className="h-11 w-auto object-contain mix-blend-multiply transition-transform duration-300 ease-out hover:scale-125 sm:h-[clamp(3.75rem,8vh,6rem)]"
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

  const logos = CLIENT_LOGOS.filter((logo) => !missing.has(logo.file))
  if (logos.length === 0) return null

  // Alternate rather than split in half, so neither row is all one alphabet run.
  const topRow = logos.filter((_, i) => i % 2 === 0)
  const bottomRow = logos.filter((_, i) => i % 2 === 1)

  return (
    <div
      className={`logo-marquee ${className}`}
      aria-label="Clients we work with"
      data-no-drone-cursor
    >
      <MarqueeRow logos={topRow} onMissing={onMissing} />
      {bottomRow.length > 0 && <MarqueeRow logos={bottomRow} reverse onMissing={onMissing} />}
    </div>
  )
}
