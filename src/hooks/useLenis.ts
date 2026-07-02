import { useEffect } from 'react'
import { registerLenis } from '../lib/lenisControl'

export function useLenis() {
  useEffect(() => {
    let lenis: InstanceType<(typeof import('lenis'))['default']> | null = null
    let rafId = 0
    let cancelled = false

    const init = async () => {
      if (cancelled) return

      const [{ default: Lenis }, gsapModule, scrollTriggerModule] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])

      if (cancelled) return

      const gsap = gsapModule.default
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)

      const instance = new Lenis({
        duration: 1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        lerp: 0.1,
      })
      lenis = instance
      registerLenis(instance)

      instance.on('scroll', ScrollTrigger.update)

      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value) {
          if (arguments.length && value !== undefined && lenis) {
            lenis.scrollTo(value, { immediate: true })
          }
          return lenis?.scroll ?? 0
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          }
        },
      })

      const raf = (time: number) => {
        lenis?.raf(time)
        rafId = requestAnimationFrame(raf)
      }
      rafId = requestAnimationFrame(raf)

      ScrollTrigger.defaults({ scroller: document.documentElement })
      ScrollTrigger.refresh()
    }

    const idleId =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(() => void init(), { timeout: 2000 })
        : window.setTimeout(() => void init(), 300)

    return () => {
      cancelled = true
      if (typeof cancelIdleCallback !== 'undefined' && typeof idleId === 'number') {
        cancelIdleCallback(idleId)
      } else {
        clearTimeout(idleId as number)
      }
      cancelAnimationFrame(rafId)
      lenis?.destroy()
      registerLenis(null)
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        ScrollTrigger.scrollerProxy(document.documentElement, {})
        ScrollTrigger.getAll().forEach((t) => t.kill())
      })
    }
  }, [])
}

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
