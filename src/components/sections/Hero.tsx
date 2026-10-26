import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { MagneticButton } from '../ui/Motion'
import { ClientLogoMarquee } from '../ui/ClientLogoMarquee'
import { CommercialFlipbook } from '../ui/CommercialFlipbook'
import { scrollToPortfolioFilter, parseMediaFilter } from '../../lib/portfolioNav'
import type { PortfolioMediaType } from '../../types/portfolio'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

interface HeroStat {
  target: number
  suffix: string
  label: string
}

const HERO_STATS: HeroStat[] = [
  { target: 9, suffix: '+', label: 'Years of Experience' },
  { target: 300, suffix: '+', label: 'Cities Covered' },
  { target: 3000, suffix: '+', label: 'Projects Delivered' },
]

// Arbitrary values on purpose: `cn` is plain clsx, so the static padding
// and text classes from MagneticButton's `xl` size would otherwise win on
// stylesheet order and these would never apply.
const HERO_BUTTON_BASE =
  'hero-cta whitespace-nowrap px-[0.75rem] py-[0.625rem] text-[0.8rem] ' +
  'sm:px-[1.5rem] sm:py-[1.25rem] sm:text-[1rem] lg:px-[2.25rem] xl:px-[2.75rem] xl:text-[1.125rem]'

const HERO_BUTTON = `${HERO_BUTTON_BASE} w-full sm:w-auto`

// Third pill: centred under the pair, matching one column's width exactly.
const HERO_BUTTON_WIDE = `${HERO_BUTTON_BASE} col-span-2 mx-auto w-[calc(50%-0.4375rem)] sm:col-auto sm:mx-0 sm:w-auto`

const statsContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.4 },
  },
}

const statsItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
}

function HeroStatValue({ stat, active }: { stat: HeroStat; active: boolean }) {
  const count = useMotionValue(0)
  const display = useTransform(
    count,
    (v) => `${Math.round(v).toLocaleString('en-IN')}${stat.suffix}`,
  )
  const [text, setText] = useState(`0${stat.suffix}`)

  useEffect(() => {
    if (!active) {
      count.set(0)
      setText(`0${stat.suffix}`)
      return
    }

    const controls = animate(count, stat.target, {
      duration: stat.target >= 1000 ? 1.7 : 1.25,
      ease: [0.16, 1, 0.3, 1],
    })
    const unsub = display.on('change', (v) => setText(v))
    return () => {
      controls.stop()
      unsub()
    }
  }, [active, count, display, stat])

  return (
    <span className="hero-stats-value font-display font-bold uppercase leading-tight tracking-wide tabular-nums">
      {text}
    </span>
  )
}

function HeroStats({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })

  return (
    <motion.div
      ref={ref}
      className={`hero-stats z-20 w-full ${className}`}
      aria-label="Company highlights"
      variants={statsContainer}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      <div className="hero-stats-inner mx-auto grid w-full max-w-[26rem] grid-cols-3 gap-x-4 sm:max-w-xl sm:gap-x-8 md:flex md:max-w-none md:flex-wrap md:items-start md:justify-center md:gap-x-20 lg:gap-x-28">
        {HERO_STATS.map((stat) => (
          <motion.div
            key={stat.label}
            variants={statsItem}
            className="hero-stats-item flex flex-col items-center justify-center text-center"
          >
            <div className="hero-stats-value-row justify-center">
              <HeroStatValue stat={stat} active={inView} />
            </div>
            <span
              className="hero-stats-label mt-2 block max-w-[7rem] text-[0.62rem] font-extrabold uppercase leading-[1.3] tracking-[0.1em] text-slate sm:max-w-[13rem] sm:text-[0.8rem] sm:tracking-[0.14em] md:max-w-none md:whitespace-nowrap md:text-sm"
            >
              {stat.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeTab, setActiveTab] = useState<PortfolioMediaType>(() =>
    parseMediaFilter(window.location.hash),
  )

  useEffect(() => {
    const sync = () => setActiveTab(parseMediaFilter(window.location.hash))
    const onFilter = (e: Event) => {
      setActiveTab((e as CustomEvent<PortfolioMediaType>).detail)
    }
    window.addEventListener('hashchange', sync)
    window.addEventListener('portfolio-filter', onFilter)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('portfolio-filter', onFilter)
    }
  }, [])

  const goToVideos = () => {
    setActiveTab('video')
    scrollToPortfolioFilter('video')
  }
  const goToVirtualReality = () => {
    setActiveTab('virtual-tour')
    scrollToPortfolioFilter('virtual-tour')
  }
  const [commercialOpen, setCommercialOpen] = useState(false)

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative flex min-h-0 overflow-hidden bg-white sm:min-h-[min(100svh,58rem)]"
      aria-label="Hero"
    >
      {/* Brand wash: blue from the left edge, carrying past the centre before it clears. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan/35 from-0% via-cyan/16 via-35% to-transparent to-70%"
      />
      {/* Washes back out to white before the logo strip, whose tiles are opaque white. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-40% via-white/80 via-58% to-white to-68%"
      />

      <div className="relative z-10 flex w-full min-w-0 flex-col justify-center max-w-[1700px] mx-auto px-5 sm:px-6 lg:px-10 pt-48 pb-6 sm:pt-[clamp(4.5rem,11vh,9rem)] sm:pb-[clamp(1.25rem,3vh,2.75rem)]">
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-display w-full min-w-0 text-balance text-center text-[clamp(2.5rem,10vw,4.75rem)] font-bold text-navy leading-[1.1] sm:text-[clamp(2rem,6.3vw,4.75rem)] lg:text-[clamp(2.25rem,5.8vw,4.5rem)]"
        >
          <span className="block sm:whitespace-nowrap">India&apos;s Largest Real Estate</span>
          <span className="block text-cyan">Content Portfolio</span>
        </motion.h1>

        <HeroStats className="mt-7 sm:mt-[clamp(1.5rem,4vh,2.5rem)]" />

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mx-auto mt-8 grid w-full min-w-0 max-w-[22rem] grid-cols-2 gap-3.5 sm:mt-[clamp(1.25rem,3.4vh,2.75rem)] sm:flex sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4 lg:gap-6 xl:gap-8"
        >
          <MagneticButton
            size="xl"
            wave
            className={`${HERO_BUTTON} ${activeTab === 'video' ? 'border-cyan' : ''}`}
            variant="outline"
            onClick={goToVideos}
            data-cursor="pointer"
          >
            Video Portfolio
          </MagneticButton>
          <MagneticButton
            size="xl"
            wave
            className={`${HERO_BUTTON} ${activeTab === 'virtual-tour' ? 'border-cyan' : ''}`}
            variant="outline"
            onClick={goToVirtualReality}
            data-cursor="pointer"
          >
            Virtual Reality Tour
          </MagneticButton>
          <MagneticButton
            size="xl"
            wave
            className={HERO_BUTTON_WIDE}
            variant="outline"
            onClick={() => setCommercialOpen(true)}
            data-cursor="pointer"
          >
            Our Commercial
          </MagneticButton>
        </motion.div>
        
        <div className="mt-12 sm:mt-[clamp(1.75rem,4vh,5rem)]">
          <ClientLogoMarquee className="logo-marquee--bleed" />
        </div>
      </div>
      {commercialOpen && <CommercialFlipbook onClose={() => setCommercialOpen(false)} />}
    </section>
  )
}
