import { useEffect, useRef, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', handler)
    setMatches(media.matches)
    return () => media.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

interface CountUpOptions {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
}

export function useCountUp(
  { end, duration = 2, suffix = '', prefix = '' }: CountUpOptions,
  start: boolean,
) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start) return

    let startTime: number | null = null
    let frame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * end))

      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [start, end, duration])

  return `${prefix}${value}${suffix}`
}

export function useScrollPosition() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrolled
}

export function useInViewRef<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.2,
) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}
