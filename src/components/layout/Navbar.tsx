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

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c-2.72 0-3.06.01-4.12.06-1.06.05-1.79.22-2.43.47a4.9 4.9 0 00-1.77 1.15A4.9 4.9 0 002.53 5.45c-.25.64-.42 1.37-.47 2.43C2.01 8.94 2 9.28 2 12s.01 3.06.06 4.12c.05 1.06.22 1.79.47 2.43a4.9 4.9 0 001.15 1.77 4.9 4.9 0 001.77 1.15c.64.25 1.37.42 2.43.47C8.94 21.99 9.28 22 12 22s3.06-.01 4.12-.06c1.06-.05 1.79-.22 2.43-.47a4.9 4.9 0 001.77-1.15 4.9 4.9 0 001.15-1.77c.25-.64.42-1.37.47-2.43.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12c-.05-1.06-.22-1.79-.47-2.43a4.9 4.9 0 00-1.15-1.77 4.9 4.9 0 00-1.77-1.15c-.64-.25-1.37-.42-2.43-.47C15.06 2.01 14.72 2 12 2zm0 1.8c2.67 0 2.99.01 4.04.06.98.04 1.51.21 1.86.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.13.35.3.88.34 1.86.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.98-.21 1.51-.34 1.86-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.35.13-.88.3-1.86.34-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.98-.04-1.51-.21-1.86-.34a3.1 3.1 0 01-1.15-.75 3.1 3.1 0 01-.75-1.15c-.13-.35-.3-.88-.34-1.86-.05-1.05-.06-1.37-.06-4.04s.01-2.99.06-4.04c.04-.98.21-1.51.34-1.86.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.35-.13.88-.3 1.86-.34C9.01 3.81 9.33 3.8 12 3.8zm0 3.05a5.15 5.15 0 100 10.3 5.15 5.15 0 000-10.3zm0 8.5a3.35 3.35 0 110-6.7 3.35 3.35 0 010 6.7zm5.35-8.7a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.24 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.87h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 2H3.55A1.55 1.55 0 002 3.55v16.9A1.55 1.55 0 003.55 22h16.9A1.55 1.55 0 0022 20.45V3.55A1.55 1.55 0 0020.45 2zM8.34 18.34H5.67V9.75h2.67zM7 8.6a1.55 1.55 0 110-3.1 1.55 1.55 0 010 3.1zm11.34 9.74h-2.67v-4.18c0-1-.02-2.28-1.38-2.28-1.39 0-1.6 1.08-1.6 2.2v4.26H10V9.75h2.56v1.17h.04a2.8 2.8 0 012.53-1.4c2.71 0 3.21 1.78 3.21 4.1z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33zM9.75 15.02V8.48l5.75 3.27z" />
    </svg>
  )
}

const socialLinks = [
  {
    href: contact.social.instagram,
    label: 'Instagram',
    Icon: InstagramIcon,
    bg: 'bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5]',
  },
  { href: contact.social.youtube, label: 'YouTube', Icon: YoutubeIcon, bg: 'bg-[#FF0000]' },
  { href: contact.social.facebook, label: 'Facebook', Icon: FacebookIcon, bg: 'bg-[#1877F2]' },
  { href: contact.social.linkedin, label: 'LinkedIn', Icon: LinkedinIcon, bg: 'bg-[#0A66C2]' },
]

function SocialIconRow({
  sizeClassName,
  iconClassName,
}: {
  sizeClassName: string
  iconClassName: string
}) {
  return (
    <>
      {socialLinks.map(({ href, label, Icon, bg }) => (
        <motion.a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cn(
            'flex items-center justify-center rounded-full text-white shadow-md',
            'ring-1 ring-white/20 transition-shadow hover:shadow-lg',
            sizeClassName,
            bg,
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.94 }}
          data-cursor="pointer"
        >
          <Icon className={iconClassName} />
        </motion.a>
      ))}
    </>
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
        className="mx-auto flex w-full max-w-[100vw] flex-col gap-2 px-3 min-[400px]:gap-2.5 min-[400px]:px-4 sm:gap-0 sm:px-6 lg:px-10 xl:px-14"
        aria-label="Main navigation"
      >
        <div className="flex w-full items-center justify-between gap-2">
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
            <div
              className="hidden items-center gap-1.5 sm:flex sm:gap-2"
              aria-label="Social media links"
            >
              <SocialIconRow
                sizeClassName="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11"
                iconClassName="h-[18px] w-[18px] sm:h-5 sm:w-5 md:h-[22px] md:w-[22px]"
              />
            </div>
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
        </div>

        <div
          className="flex w-full items-center justify-center gap-3 sm:hidden"
          aria-label="Social media links"
        >
          <SocialIconRow sizeClassName="h-8 w-8" iconClassName="h-4 w-4" />
        </div>
      </nav>
    </motion.header>
  )
}
