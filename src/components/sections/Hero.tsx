import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import { HERO_VIDEO, HERO_POSTER } from '../../constants/hero'
import { MagneticButton } from '../ui/Motion'
import { scrollToPortfolioFilter, parseMediaFilter } from '../../lib/portfolioNav'
import type { PortfolioMediaType } from '../../types/portfolio'

gsap.registerPlugin(ScrollTrigger)

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)
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

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return

    const loadVideo = () => {
      video.play().catch(() => {})
    }

    const onLoadedData = () => loadVideo()
    if (video.readyState >= 2) {
      loadVideo()
    } else {
      video.addEventListener('loadeddata', onLoadedData, { once: true })
    }

    const setupScroll = () => {
      gsap.to(video, {
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
    }

    const scrollId =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(setupScroll, { timeout: 3000 })
        : window.setTimeout(setupScroll, 1200)

    return () => {
      video.removeEventListener('loadeddata', onLoadedData)
      if (typeof cancelIdleCallback !== 'undefined' && typeof scrollId === 'number') {
        cancelIdleCallback(scrollId)
      } else {
        clearTimeout(scrollId as number)
      }
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === section) t.kill()
      })
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

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative h-screen min-h-[700px] overflow-hidden bg-navy"
      aria-label="Hero"
    >
      <video
        ref={videoRef}
        src={HERO_VIDEO}
        className={`absolute inset-0 w-full h-full object-cover brightness-[0.45] transition-opacity duration-700 ${
          videoReady ? 'opacity-100' : 'opacity-0'
        }`}
        poster={HERO_POSTER}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        onCanPlay={() => setVideoReady(true)}
        onError={() => setVideoReady(false)}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-navy/90 from-0% via-navy/55 via-45% to-navy/15 to-100% pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-navy/10 pointer-events-none" />

      <div className="relative z-10 flex h-full w-full min-w-0 flex-col justify-center max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 pt-20 sm:pt-24">
        <h1 className="font-display w-full min-w-0 text-[clamp(1.75rem,8vw,5.5rem)] font-bold text-white leading-[1.1] sm:text-[clamp(2.25rem,7vw,5.5rem)] lg:text-[clamp(2.75rem,7.5vw,5.5rem)]">
          <span className="block sm:whitespace-nowrap">India&apos;s Largest Real Estate</span>
          <span className="block text-cyan">Content Portfolio</span>
        </h1>

        {/* <motion.p
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-6 text-white/90 text-base lg:text-lg max-w-xl font-normal leading-relaxed"
        >
          Premium real estate marketing videos, aerial cinematography, and visual
          campaigns crafted for developers who demand excellence.
        </motion.p> */}

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-8 flex w-full min-w-0 flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4"
        >
          <MagneticButton
            size="xl"
            className="w-full px-14 py-6 text-lg text-white sm:w-auto sm:px-16 sm:py-6 sm:text-xl"
            variant={activeTab === 'video' ? 'primary' : 'secondary'}
            onClick={goToVideos}
            data-cursor="pointer"
          >
            Video Production
          </MagneticButton>
          <MagneticButton
            size="xl"
            className="w-full px-14 py-6 text-lg text-white sm:w-auto sm:px-16 sm:py-6 sm:text-xl"
            variant={activeTab === 'virtual-tour' ? 'primary' : 'secondary'}
            onClick={goToVirtualReality}
            data-cursor="pointer"
          >
            Virtual Reality
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}
