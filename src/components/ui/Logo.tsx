import { cn } from '../../lib/utils'

type LogoProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 'light' = white wordmark for dark backgrounds, 'dark' = navy wordmark for light ones. */
  tone?: 'light' | 'dark'
}

const sizeClasses = {
  sm: 'h-9',
  md: 'h-11',
  lg: 'h-14',
  xl: 'h-16',
} as const

export function Logo({ className, size = 'md', tone = 'light' }: LogoProps) {
  return (
    <img
      src={tone === 'dark' ? '/logo_black.png' : '/logo.png'}
      alt="NS Ventures"
      className={cn(
        sizeClasses[size],
        'w-auto max-w-none shrink-0 object-contain',
        className,
      )}
      width={500}
      height={123}
      decoding="async"
    />
  )
}
