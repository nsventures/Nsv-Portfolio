import { motion, type HTMLMotionProps } from 'framer-motion'
import { useRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { useTiltGlow } from '../../hooks/useTiltGlow'

interface MagneticButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Sweep a colour fill in from the left edge on hover. */
  wave?: boolean
  /** Pull the button toward the pointer. Off by default when `wave` is set. */
  magnetic?: boolean
  /** Gradient border that lights up and tilts toward the pointer. */
  glow?: boolean
}

const variants = {
  primary:
    'bg-cyan text-navy hover:bg-cyan-bright border border-transparent font-semibold rounded-full shadow-lg shadow-cyan/20',
  secondary:
    'bg-transparent text-white border border-white/30 hover:border-cyan hover:text-cyan rounded-full font-semibold',
  // Same shape as `secondary`, for light backgrounds.
  outline:
    'bg-white text-navy border border-navy/15 hover:border-cyan rounded-full font-semibold shadow-sm shadow-navy/5',
  ghost: 'bg-transparent text-navy/70 hover:text-cyan border border-transparent',
}

const sizes = {
  sm: 'px-5 py-2.5 text-xs tracking-wide',
  md: 'px-7 py-3.5 text-sm tracking-wide',
  lg: 'px-9 py-4 text-sm tracking-wide',
  xl: 'px-11 py-5 text-base tracking-wide sm:px-12 sm:py-5 sm:text-lg',
}

export function MagneticButton({
  children,
  variant = 'primary',
  size = 'md',
  wave = false,
  magnetic = !wave,
  glow = wave,
  className,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const { ref: tiltRef, onPointerMove: onTiltMove, onPointerLeave: onTiltLeave } =
    useTiltGlow<HTMLButtonElement>()

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current
    if (!btn || !magnetic) return
    const rect = btn.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`
  }

  const handleMouseLeave = () => {
    const btn = ref.current
    if (!btn || !magnetic) return
    btn.style.transform = 'translate(0, 0)'
  }

  const setRefs = (node: HTMLButtonElement | null) => {
    ref.current = node
    tiltRef.current = node
  }

  return (
    <motion.button
      ref={setRefs}
      className={cn(
        'relative inline-flex items-center justify-center transition-colors duration-400',
        variants[variant],
        sizes[size],
        wave && 'btn-wave',
        glow && 'btn-3d',
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        handleMouseLeave()
        if (glow) onTiltLeave()
      }}
      onPointerMove={glow ? onTiltMove : undefined}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {wave && <span className="btn-wave-fill" aria-hidden />}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
