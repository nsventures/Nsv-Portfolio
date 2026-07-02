import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import carouselTours from '../../data/carousel-tours.json'
import type { PortfolioEntry } from '../../types/portfolio'
import {
  GENERIC_PORTFOLIO_THUMBNAIL,
  getPortfolioThumbnail,
} from '../../lib/portfolioMedia'

const featuredTours = carouselTours as Pick<
  PortfolioEntry,
  'id' | 'name' | 'thumbnail' | 'city' | 'mediaType'
>[]

gsap.registerPlugin(ScrollTrigger)

function OffsetCard({
  project,
  index,
}: {
  project: (typeof featuredTours)[number]
  index: number
}) {
  const zigzag = index % 2 === 0 ? -64 : 64

  return (
    <div
      className="offset-card relative shrink-0 w-[72vw] sm:w-[300px] md:w-[340px] lg:w-[380px] py-6 lg:py-8"
      data-zigzag={zigzag}
      data-index={index}
    >
      <div className="offset-card-inner relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xl shadow-navy/10 bg-navy-card will-change-transform">
        <img
          src={getPortfolioThumbnail(project.thumbnail)}
          alt={project.name}
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = GENERIC_PORTFOLIO_THUMBNAIL
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent opacity-0 offset-card-overlay transition-opacity duration-500 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6 translate-y-3 opacity-0 offset-card-caption transition-all duration-500 pointer-events-none">
          <p className="text-cyan text-[10px] tracking-[0.25em] uppercase font-semibold">
            {project.city}
          </p>
          <h3 className="font-display text-lg lg:text-xl font-bold text-white mt-1">
            {project.name}
          </h3>
        </div>
      </div>
    </div>
  )
}

function applyCardStyles(cards: Element[]) {
  const viewCenter = window.innerWidth / 2

  cards.forEach((card) => {
    const outer = card as HTMLElement
    const inner = outer.querySelector('.offset-card-inner') as HTMLElement | null
    if (!inner) return

    const zigzag = Number(outer.dataset.zigzag ?? 0)
    const rect = outer.getBoundingClientRect()
    const cardCenter = rect.left + rect.width / 2
    const dist = (cardCenter - viewCenter) / (rect.width * 0.9)

    const absDist = Math.min(Math.abs(dist), 1.5)
    const scrollY = dist * -24
    const scale = 1 - absDist * 0.06
    const blur = absDist * 2.5
    const rotate = dist * -2.5
    const totalY = scrollY + zigzag

    inner.style.transform = `translateY(${totalY}px) scale(${scale}) rotate(${rotate}deg)`
    inner.style.filter = blur > 0.4 ? `blur(${blur}px)` : 'none'
    inner.style.opacity = String(Math.max(1 - absDist * 0.15, 0.7))

    const isCenter = absDist < 0.4
    const overlay = outer.querySelector('.offset-card-overlay') as HTMLElement | null
    const caption = outer.querySelector('.offset-card-caption') as HTMLElement | null
    if (overlay) overlay.style.opacity = isCenter ? '1' : '0'
    if (caption) {
      caption.style.opacity = isCenter ? '1' : '0'
      caption.style.transform = isCenter ? 'translateY(0)' : 'translateY(12px)'
    }
  })
}

export function OffsetCarousel() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const getTravel = useCallback(() => {
    const track = trackRef.current
    if (!track) return 0
    return Math.max(0, track.scrollWidth - window.innerWidth)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    const pin = pinRef.current
    if (!section || !track || !pin) return

    const setup = () => {
      const cards = gsap.utils.toArray<HTMLElement>('.offset-card', track)
      if (cards.length === 0) return

      const travel = getTravel()
      if (travel <= 0) return

      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === section) t.kill()
      })

      gsap.set(track, { x: 0 })

      gsap.to(track, {
        x: -travel,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          pin: pin,
          scrub: 0.8,
          start: 'top top',
          end: () => `+=${getTravel() + window.innerHeight}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          snap: {
            snapTo: (value) => {
              const steps = cards.length - 1
              if (steps <= 0) return 0
              return Math.round(value * steps) / steps
            },
            duration: { min: 0.2, max: 0.5 },
            ease: 'power2.inOut',
          },
          onUpdate(self) {
            applyCardStyles(cards)
            const steps = Math.max(cards.length - 1, 1)
            const idx = Math.round(self.progress * steps)
            setActiveIndex(Math.min(idx, cards.length - 1))
          },
        },
      })

      applyCardStyles(cards)
      ScrollTrigger.refresh()
    }

    const ctx = gsap.context(() => {
      setup()
    }, section)

    const refresh = () => {
      requestAnimationFrame(setup)
    }

    window.addEventListener('resize', refresh)
    window.addEventListener('load', refresh)

    track.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true })
    })

    const timer = setTimeout(refresh, 300)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', refresh)
      window.removeEventListener('load', refresh)
      ctx.revert()
    }
  }, [getTravel])

  return (
    <section
      id="offset-carousel"
      ref={sectionRef}
      className="relative z-10 isolate bg-white overflow-x-clip"
      aria-label="Featured work carousel"
    >
      <div ref={pinRef} className="relative z-10 h-screen flex flex-col justify-center bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 w-full mb-6 lg:mb-8 shrink-0">
          <span className="text-[11px] tracking-[0.35em] uppercase text-cyan font-bold">
            Selected Work
          </span>
          <div className="flex items-end justify-between gap-6 mt-3">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-navy leading-tight">
              Cinematic projects{' '}
              <span className="text-cyan">that convert</span>
            </h2>
            <span className="text-navy/40 text-sm font-semibold tabular-nums shrink-0">
              {String(activeIndex + 1).padStart(2, '0')} /{' '}
              {String(featuredTours.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-clip overflow-y-visible min-h-[480px] sm:min-h-[540px] lg:min-h-[580px] flex items-center">
          <div
            ref={trackRef}
            className="flex items-center gap-6 md:gap-8 will-change-transform"
            style={{
              paddingLeft: 'max(1.5rem, calc(50vw - 190px))',
              paddingRight: 'max(1.5rem, calc(50vw - 190px))',
            }}
          >
            {featuredTours.map((project, i) => (
              <OffsetCard key={project.id} project={project} index={i} />
            ))}
          </div>
        </div>

        <p className="text-center text-slate text-xs mt-4 tracking-wide shrink-0">
          Scroll to navigate · {featuredTours.length} tours
        </p>
      </div>
    </section>
  )
}
