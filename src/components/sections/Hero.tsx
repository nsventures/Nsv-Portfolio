import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { MagneticButton } from '../ui/Motion'
import { ClientLogoMarquee } from '../ui/ClientLogoMarquee'
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

const HERO_BUTTON_BASE =
  'hero-cta whitespace-nowrap px-3 py-3 text-[0.85rem] sm:px-10 sm:py-6 sm:text-lg xl:px-12 xl:text-xl'

/** Served from /public — the space-laden name needs encoding in the URL. */
const COMMERCIAL_PDF = {
  url: encodeURI(
    `${import.meta.env.BASE_URL}NS Ventures Proposal 7506203777 www.nsventures.in.pdf`,
  ),
  filename: 'NS Ventures Proposal.pdf',
}

const HERO_BUTTON = `${HERO_BUTTON_BASE} w-full sm:w-auto`

// Third pill: centred under the pair, matching one column's width exactly.
const HERO_BUTTON_WIDE = `${HERO_BUTTON_BASE} col-span-2 mx-auto w-[calc(50%-0.3125rem)] sm:col-auto sm:mx-0 sm:w-auto`

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
              className="hero-stats-label mt-2 block max-w-[7rem] text-[0.62rem] font-semibold uppercase leading-[1.3] tracking-[0.1em] text-slate sm:max-w-[13rem] sm:text-[0.8rem] sm:tracking-[0.14em] md:max-w-none md:whitespace-nowrap md:text-sm"
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
  const downloadCommercial = () => {
    const link = document.createElement('a')
    link.href = COMMERCIAL_PDF.url
    link.download = COMMERCIAL_PDF.filename
    // Served from /public — same origin, so `download` is honoured.
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative flex min-h-0 overflow-hidden bg-white sm:min-h-screen"
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

      <div className="relative z-10 flex w-full min-w-0 flex-col justify-center max-w-[1700px] mx-auto px-5 sm:px-6 lg:px-10 pt-36 pb-6 sm:pt-[clamp(5rem,10vh,7.5rem)] sm:pb-[clamp(1.25rem,3vh,2.75rem)]">
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-display w-full min-w-0 text-balance text-center text-[clamp(2.9rem,11.5vw,5.5rem)] font-bold text-navy leading-[1.1] sm:text-[clamp(2.25rem,7vw,5.5rem)] lg:text-[clamp(2.5rem,6.5vw,5rem)]"
        >
          <span className="block sm:whitespace-nowrap">India&apos;s Largest Real Estate</span>
          <span className="block text-cyan">Content Portfolio</span>
        </motion.h1>

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mx-auto mt-7 grid w-full min-w-0 max-w-[22rem] grid-cols-2 gap-2.5 sm:mt-[clamp(1.5rem,4vh,2.5rem)] sm:flex sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4"
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
            onClick={downloadCommercial}
            data-cursor="pointer"
          >
            Our Proposal
          </MagneticButton>
        </motion.div>
        <HeroStats className="mt-8 sm:mt-[clamp(1.25rem,3.4vh,2.75rem)]" />

        <div className="mt-14 sm:mt-[clamp(4rem,9.5vh,6.75rem)]">
          <ClientLogoMarquee className="logo-marquee--bleed" />
        </div>
      </div>
    </section>
  )
}
