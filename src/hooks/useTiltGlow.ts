import { useCallback, useRef } from 'react'

import { usePrefersReducedMotion } from './useMotion'

const MAX_TILT = 10

/**
 * Drives the `.btn-3d` look: tilts the element toward the cursor (--rx/--ry),
 * swings the border's conic gradient to match (--angle), and offsets the drop
 * shadow the opposite way (--sx/--sy) so the button reads as lifted.
 */
export function useTiltGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const frame = useRef(0)
  const reducedMotion = usePrefersReducedMotion()

  const onPointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      const el = ref.current
      if (!el || frame.current) return

      const { clientX, clientY } = e
      frame.current = requestAnimationFrame(() => {
        frame.current = 0
        const rect = el.getBoundingClientRect()
        const px = (clientX - rect.left) / rect.width
        const py = (clientY - rect.top) / rect.height
        const dx = px - 0.5
        const dy = py - 0.5

        el.style.setProperty('--glow', '1')
        // Start the sweep behind the pointer so the lit arc faces it.
        el.style.setProperty('--angle', `${(Math.atan2(dy, dx) * 180) / Math.PI + 90}deg`)

        if (reducedMotion) return
        el.style.setProperty('--ry', `${dx * 2 * MAX_TILT}deg`)
        el.style.setProperty('--rx', `${-dy * 2 * MAX_TILT}deg`)
        el.style.setProperty('--sx', `${-dx * 16}`)
        el.style.setProperty('--sy', `${-dy * 10}`)
      })
    },
    [reducedMotion],
  )

  const onPointerLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (frame.current) {
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
    for (const [name, value] of [
      ['--glow', '0'],
      ['--angle', '135deg'],
      ['--rx', '0deg'],
      ['--ry', '0deg'],
      ['--sx', '0'],
      ['--sy', '0'],
    ] as const) {
      el.style.setProperty(name, value)
    }
  }, [])

  return { ref, onPointerMove, onPointerLeave }
}
