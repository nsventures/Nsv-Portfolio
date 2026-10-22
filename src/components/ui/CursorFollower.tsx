import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useMediaQuery, usePrefersReducedMotion } from '../../hooks/useMotion'

/** Rebuilt from the drone icon so the two rotors are separate, spinnable groups. */
function DroneSvg() {
  return (
    <svg
      viewBox="0 30 100 50"
      width="76"
      height="38"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <mask id="drone-cursor-holes">
        <rect x="0" y="30" width="100" height="50" fill="#fff" />
        <ellipse cx="42.2" cy="55.8" rx="2.8" ry="1.5" fill="#000" />
        <circle cx="50" cy="63.7" r="5.2" fill="#000" />
      </mask>

      <g mask="url(#drone-cursor-holes)">
        <path
          d="M33.8 49.5 L23.2 71.5"
          stroke="currentColor"
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <path
          d="M66.2 49.5 L76.8 71.5"
          stroke="currentColor"
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <rect x="21" y="43.2" width="58" height="5.2" rx="2.4" />
        <path d="M38.5 52.5h23a3.8 3.8 0 0 1 3.8 3.8v11.1a3.8 3.8 0 0 1-3.8 3.8h-23a3.8 3.8 0 0 1-3.8-3.8V56.3a3.8 3.8 0 0 1 3.8-3.8z" />
        <path d="M50 44.1c4.7 0 8.5 3.8 8.5 8.4h-17c0-4.6 3.8-8.4 8.5-8.4z" />
        <path d="M44 70.5c0 3.3 2.7 6 6 6s6-2.7 6-6z" />
        <rect x="20.1" y="40.9" width="6.6" height="4.6" rx="1.6" />
        <rect x="73.3" y="40.9" width="6.6" height="4.6" rx="1.6" />
      </g>

      <g className="drone-prop">
        <rect x="20.6" y="33.9" width="5.6" height="7.6" rx="2.2" />
        <ellipse cx="23.4" cy="37.9" rx="20.7" ry="2.35" />
      </g>
      <g className="drone-prop">
        <rect x="73.8" y="33.9" width="5.6" height="7.6" rx="2.2" />
        <ellipse cx="76.6" cy="37.9" rx="20.7" ry="2.35" />
      </g>
    </svg>
  )
}

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

  const active = isDesktop && !reducedMotion && !hidden && !overPortfolio

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
        className={`pointer-events-none fixed top-0 left-0 z-[9999] transition-colors duration-200 ${
          // Cyan vanishes on a cyan-filled button, so go navy over anything clickable.
          hovering ? 'text-navy' : 'text-cyan'
        }`}
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
            animate={{ scale: hovering ? 1.25 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <DroneSvg />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
