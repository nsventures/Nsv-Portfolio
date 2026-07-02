import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useMediaQuery, usePrefersReducedMotion } from '../../hooks/useMotion'

export function CursorFollower() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const reducedMotion = usePrefersReducedMotion()
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!isDesktop || reducedMotion) return

    let frame = 0
    let nextPos = { x: 0, y: 0 }

    const move = (e: MouseEvent) => {
      nextPos = { x: e.clientX, y: e.clientY }
      if (frame) return
      frame = requestAnimationFrame(() => {
        setPos(nextPos)
        frame = 0
      })
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      setHovering(!!target.closest('a, button, [data-cursor="pointer"]'))
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
      observer.disconnect()
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseover', onOver)
    }
  }, [isDesktop, reducedMotion])

  if (!isDesktop || reducedMotion || hidden) return null

  return (
    <div data-cursor-follower aria-hidden>
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-cyan pointer-events-none z-[9999] mix-blend-difference"
        animate={{ x: pos.x - 4, y: pos.y - 4, scale: hovering ? 0.5 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-cyan/50 pointer-events-none z-[9998]"
        animate={{
          x: pos.x - 16,
          y: pos.y - 16,
          scale: hovering ? 1.8 : 1,
          opacity: hovering ? 0.6 : 0.3,
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}
      />
    </div>
  )
}
