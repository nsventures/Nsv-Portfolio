import { motion } from 'framer-motion'
import { useScrollPosition } from '../../hooks/useMotion'
import { cn } from '../../lib/utils'
import { contact } from '../../data/contact'
import { Logo } from '../ui/Logo'

interface NavbarProps {
  onCallbackClick?: () => void
}

const blueBtnClass = cn(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-cyan font-bold text-white',
  'shadow-lg shadow-cyan/25 transition-colors hover:bg-cyan-bright',
  'min-h-11 min-w-11 px-3 py-2 text-xs leading-none',
  'min-[400px]:min-w-0 min-[400px]:px-3.5',
  'sm:min-h-12 sm:px-5 sm:py-2.5 sm:text-sm',
  'md:px-6 md:py-3 md:text-base',
)

function CallbackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}

export function Navbar({ onCallbackClick }: NavbarProps) {
  const scrolled = useScrollPosition()

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-navy/40 backdrop-blur-xl border-b border-white/20 py-2.5 sm:py-3.5 shadow-sm shadow-navy/5'
          : 'bg-transparent py-3 sm:py-5 lg:py-6',
      )}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav
        className="mx-auto flex w-full max-w-[100vw] items-center justify-between gap-2 px-3 min-[400px]:gap-2.5 min-[400px]:px-4 sm:gap-3 sm:px-6 lg:px-10 xl:px-14"
        aria-label="Main navigation"
      >
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="flex min-w-0 shrink items-center"
          data-cursor="pointer"
        >
          <Logo
            size="md"
            className={cn(
              'h-9 w-auto max-w-[min(42vw,9.5rem)] transition-[height,max-width] duration-300',
              'min-[400px]:max-w-none min-[400px]:h-10',
              scrolled ? 'sm:h-11 md:h-12' : 'sm:h-12 md:h-14 lg:h-16',
            )}
          />
        </a>

        <div className="flex shrink-0 items-center gap-1.5 min-[400px]:gap-2 sm:gap-3">
          <motion.a
            href={contact.phoneTel}
            className={blueBtnClass}
            aria-label={`Call ${contact.phoneDisplay}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            data-cursor="pointer"
          >
            <PhoneIcon className="h-4 w-4 min-[400px]:hidden" />
            <span className="hidden min-[400px]:inline  sm:hidden">{contact.phoneDisplayCompact}</span>
            <span className="hidden sm:inline">{contact.phoneDisplay}</span>
          </motion.a>
          <motion.button
            type="button"
            onClick={onCallbackClick}
            className={blueBtnClass}
            aria-label="Get Callback"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            data-cursor="pointer"
          >
            <CallbackIcon className="h-4 w-4 min-[400px]:hidden" />
            <span className="hidden min-[400px]:inline sm:hidden">Callback</span>
            <span className="hidden sm:inline">Get Callback</span>
          </motion.button>
        </div>
      </nav>
    </motion.header>
  )
}
