import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { services } from '../../data/services'

gsap.registerPlugin(ScrollTrigger)

const ARC_RADIUS = 640

function getCardSpread() {
  return Math.min(Math.max(window.innerWidth * 0.46, 720), 980)
}

function positionCards(cards: HTMLDivElement[], floatIndex: number) {
  const total = services.length
  const spread = getCardSpread()

  cards.forEach((card, i) => {
    let rel = i - floatIndex
    if (rel > total / 2) rel -= total
    if (rel < -total / 2) rel += total

    const absRel = Math.abs(rel)
    const activeFactor = Math.max(0, 1 - absRel / 0.55)

    const angle = rel * 0.58
    const x = Math.sin(angle) * spread
    const arcY = (1 - Math.cos(angle)) * 24
    const z = -absRel * 280 - Math.abs(Math.cos(angle)) * 90
    const rotateY = -rel * 22
    const rotateZ = rel * 1.2
    const scale = Math.max(1.03 - absRel * 0.11, 0.58)

    gsap.set(card, {
      x,
      y: arcY,
      z,
      scale,
      rotateY,
      rotateZ,
      opacity: absRel > 2.6 ? 0 : Math.max(1 - absRel * 0.24, 0.35),
      zIndex: 40 - absRel * 10,
      force3D: true,
    })

    const inner = card.querySelector('.service-card-inner') as HTMLElement | null
    const glow = card.querySelector('.service-card-glow') as HTMLElement | null
    const detail = card.querySelector('.service-card-detail') as HTMLElement | null
    const img = card.querySelector('.service-card-img') as HTMLElement | null

    if (inner) {
      inner.style.boxShadow =
        activeFactor > 0.35
          ? `0 40px 80px -16px rgba(0,45,84,${0.25 + activeFactor * 0.2}), 0 0 0 3px rgba(41,171,226,${activeFactor * 0.65})`
          : '0 20px 48px -16px rgba(0,45,84,0.25)'
    }
    if (glow) glow.style.opacity = String(activeFactor)
    if (detail) {
      detail.style.opacity = String(activeFactor)
      detail.style.transform = `translateY(${20 * (1 - activeFactor)}px)`
    }
    if (img) {
      img.style.transform = `scale(${1 + activeFactor * 0.06})`
    }
  })
}

export function WhatWeOffer() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const progressRef = useRef<HTMLDivElement>(null)
  const activeTitleRef = useRef<HTMLSpanElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)
  const activeIndexRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const getCards = useCallback(
    () => cardsRef.current.filter(Boolean) as HTMLDivElement[],
    [],
  )

  useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    if (!section || !pin) return

    const setup = () => {
      const cards = getCards()
      if (cards.length === 0) return

      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === section) t.kill()
      })

      const scrollLen = window.innerHeight * (services.length - 1) * 0.9

      ScrollTrigger.create({
        trigger: section,
        pin: pin,
        scrub: 1.2,
        start: 'top top',
        end: () => `+=${scrollLen}`,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate(self) {
          const floatIdx = self.progress * (services.length - 1)
          positionCards(cards, floatIdx)

          if (progressRef.current) {
            progressRef.current.style.width = `${self.progress * 100}%`
          }

          const idx = Math.round(floatIdx)
          if (idx !== activeIndexRef.current) {
            activeIndexRef.current = idx
            const service = services[idx]
            if (activeTitleRef.current) activeTitleRef.current.textContent = service.title
            if (counterRef.current) {
              counterRef.current.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(services.length).padStart(2, '0')}`
            }
            setActiveIndex(idx)
          }
        },
      })

      positionCards(cards, 0)
      ScrollTrigger.refresh()
    }

    const ctx = gsap.context(setup, section)
    const refresh = () => requestAnimationFrame(setup)

    window.addEventListener('resize', refresh)
    window.addEventListener('load', refresh)
    const timer = setTimeout(refresh, 200)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', refresh)
      window.removeEventListener('load', refresh)
      ctx.revert()
    }
  }, [getCards])

  const active = services[activeIndex]

  return (
    <section
      id="what-we-offer"
      ref={sectionRef}
      className="relative z-20 isolate bg-white"
      aria-label="What we offer"
    >
      <div ref={pinRef} className="relative z-20 h-screen flex flex-col bg-white">
        <div className="relative z-30 max-w-[1400px] mx-auto px-6 lg:px-12 w-full shrink-0 pt-24 lg:pt-28 pb-4 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <span className="text-[11px] tracking-[0.35em] uppercase text-cyan font-bold">
                Services
              </span>
              <h2 className="font-display text-3xl lg:text-5xl font-bold text-navy mt-2">
                What We Offer
              </h2>
            </div>
            <div className="flex items-center gap-4 lg:max-w-xs w-full lg:w-auto">
              <div className="flex-1 h-1 bg-navy/10 relative overflow-hidden rounded-full">
                <div
                  ref={progressRef}
                  className="absolute inset-y-0 left-0 bg-cyan rounded-full transition-none"
                  style={{ width: '0%' }}
                />
              </div>
              <span ref={counterRef} className="text-navy/40 text-xs font-bold tabular-nums shrink-0">
                {String(activeIndex + 1).padStart(2, '0')} / {String(services.length).padStart(2, '0')}
              </span>
            </div>
          </div>
          <p className="text-slate text-sm mt-4 max-w-lg font-light">
            Scroll to explore —{' '}
            <span ref={activeTitleRef} className="text-navy font-semibold">
              {active.title}
            </span>
          </p>
        </div>

        <div
          className="relative z-10 flex-1 flex items-center justify-center min-h-0 overflow-x-clip overflow-y-hidden px-0"
          style={{ perspective: `${ARC_RADIUS * 2.5}px` }}
        >
          <div
            className="relative w-full max-w-[100vw] h-full max-h-[min(560px,62vh)] flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {services.map((service, i) => (
              <div
                key={service.id}
                ref={(el) => {
                  cardsRef.current[i] = el
                }}
                className="service-card absolute w-[300px] sm:w-[350px] lg:w-[400px] will-change-transform"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="service-card-inner relative h-[440px] sm:h-[490px] lg:h-[540px] rounded-3xl overflow-hidden bg-navy">
                  <div className="service-card-glow absolute -inset-px rounded-3xl bg-gradient-to-b from-cyan/50 via-transparent to-cyan/30 opacity-0 pointer-events-none z-10" />

                  <img
                    src={service.image}
                    alt=""
                    className="service-card-img absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-navy/15" />

                  <div className="relative z-20 h-full flex flex-col justify-between p-8 lg:p-10">
                    <div className="flex items-start justify-between">
                      <span className="inline-flex px-3 py-1 rounded-full bg-cyan/20 border border-cyan/40 text-cyan text-xs font-bold tracking-[0.2em]">
                        {service.index}
                      </span>
                      <span className="text-white/20 font-display text-6xl lg:text-7xl font-bold leading-none">
                        {service.index}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-2xl lg:text-3xl font-bold text-white leading-tight">
                        {service.title}
                      </h3>
                      <p className="text-cyan text-sm mt-3 font-medium">
                        {service.tagline}
                      </p>

                      <div className="service-card-detail mt-5 opacity-0 translate-y-5">
                        <p className="text-white/75 text-sm lg:text-base leading-relaxed font-light">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-30 text-center text-slate text-[10px] tracking-[0.25em] uppercase pb-6 shrink-0 bg-white">
          Scroll to navigate services
        </p>
      </div>
    </section>
  )
}
