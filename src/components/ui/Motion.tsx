import { motion, type HTMLMotionProps } from 'framer-motion'
import { useRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface MagneticButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const variants = {
  primary:
    'bg-cyan text-navy hover:bg-cyan-bright border border-transparent font-semibold rounded-full shadow-lg shadow-cyan/20',
  secondary:
    'bg-transparent text-white border border-white/30 hover:border-cyan hover:text-cyan rounded-full font-semibold',
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
  className,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`
  }

  const handleMouseLeave = () => {
    const btn = ref.current
    if (!btn) return
    btn.style.transform = 'translate(0, 0)'
  }

  return (
    <motion.button
      ref={ref}
      className={cn(
        'relative inline-flex items-center justify-center transition-colors duration-400',
        variants[variant],
        sizes[size],
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
