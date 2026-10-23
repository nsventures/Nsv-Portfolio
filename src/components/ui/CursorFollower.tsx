import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useMediaQuery, usePrefersReducedMotion } from '../../hooks/useMotion'
import { DroneSvg } from './DroneSvg'

export function CursorFollower() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const reducedMotion = usePrefersReducedMotion()
  const [hovering, setHovering] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [overPortfolio, setOverPortfolio] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)

  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const bank = useMotionValue(0)
  const lift = useMotionValue(0)

  // Chase the pointer; the drone trails a touch so the bank reads as flight.
  const sx = useSpring(x, { stiffness: 380, damping: 30, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 380, damping: 30, mass: 0.6 })
  const sBank = useSpring(bank, { stiffness: 160, damping: 16, mass: 0.6 })
  const sLift = useSpring(lift, { stiffness: 160, damping: 16, mass: 0.6 })

  // Over links and buttons the plain pointer is clearer than the drone.
  const active = isDesktop && !reducedMotion && !hidden && !overPortfolio && !hovering

  useEffect(() => {
    if (!isDesktop || reducedMotion) return

    let frame = 0
    let last: { x: number; y: number } | null = null
    let idleTimer = 0
    let next = { x: 0, y: 0 }

    const apply = () => {
      frame = 0
      const dx = last ? next.x - last.x : 0
      const dy = last ? next.y - last.y : 0
      last = { ...next }

      x.set(next.x)
      y.set(next.y)
      // Bank into the turn and pitch on climb/dive, like a real quad.
      bank.set(Math.max(-26, Math.min(26, dx * 1.1)))
      lift.set(Math.max(-10, Math.min(10, dy * 0.35)))

      shellRef.current?.classList.add('is-flying')
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => {
        bank.set(0)
        lift.set(0)
        shellRef.current?.classList.remove('is-flying')
      }, 140)
    }

    const move = (e: MouseEvent) => {
      next = { x: e.clientX, y: e.clientY }
      if (!frame) frame = requestAnimationFrame(apply)
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      setHovering(!!target.closest('a, button, [data-cursor="pointer"]'))
      setOverPortfolio(!!target.closest('#portfolio, [data-no-drone-cursor]'))
    }

    const syncModalState = () => {
      setHidden(document.body.classList.contains('portfolio-modal-open'))
    }

    syncModalState()
    const observer = new MutationObserver(syncModalState)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    window.addEventListener('mousemove', move, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.clearTimeout(idleTimer)
      observer.disconnect()
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseover', onOver)
    }
  }, [bank, isDesktop, lift, reducedMotion, x, y])

  if (!active) return null

  return (
    <div data-cursor-follower aria-hidden>
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999] text-cyan"
        style={{
          x: sx,
          y: sy,
          // White halo keeps it readable over the cyan headline and the dark cards.
          filter:
            'drop-shadow(0 0 1.5px rgba(255,255,255,0.95)) drop-shadow(0 2px 5px rgba(0,45,84,0.35))',
        }}
      >
        <div className="-translate-x-1/2 -translate-y-1/2">
          <motion.div
            ref={shellRef}
            className="drone-cursor"
            style={{ rotate: sBank, y: sLift }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <DroneSvg />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
