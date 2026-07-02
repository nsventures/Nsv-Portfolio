import type { ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import { BulkImportStatusBar } from './BulkImportStatusBar'
import { Logo } from '../../components/ui/Logo'
import { cn } from '../../lib/utils'
import { useAdminAuthContext } from '../context/AdminAuthContext'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  {
    to: '/admin/tours',
    label: 'Portfolio',
    isActive: (pathname: string) =>
      pathname === '/admin/tours' ||
      (pathname.startsWith('/admin/tours/') && pathname !== '/admin/tours/new'),
  },
  { to: '/admin/tours/new', label: 'Add tour', end: true },
  { to: '/admin/cities', label: 'Cities', end: true },
  { to: '/admin/bulk-upload', label: 'Bulk upload', end: true },
] as const

export function AdminLayout() {
  const { user, signOut } = useAdminAuthContext()
  const navigate = useNavigate()
  const location = useLocation()

  const isNavActive = (item: (typeof navItems)[number]) => {
    const path = location.pathname.replace(/\/$/, '') || '/'

    if ('isActive' in item) {
      return item.isActive(path)
    }

    const to = item.to.replace(/\/$/, '') || '/'
    if ('end' in item && item.end) {
      return path === to
    }

    return path === to || path.startsWith(`${to}/`)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-off-white flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-gradient-to-b from-navy-deep via-navy to-navy-card text-white border-r border-white/10">
        <div className="px-6 py-8 border-b border-white/10">
          <Logo size="md" className="h-10" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const active = isNavActive(item)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'block rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300',
                  active
                    ? 'bg-cyan text-navy shadow-lg shadow-cyan/20'
                    : 'text-white/70 hover:bg-white/5 hover:text-white',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-6 border-t border-white/10 space-y-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl px-4 py-3 text-sm font-medium text-white/60 hover:text-cyan hover:bg-white/5 transition-colors"
          >
            View live site ↗
          </a>
          <p className="px-4 text-xs text-white/40 truncate">{user?.email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-40 bg-navy/95 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <Logo size="sm" className="h-8" />
          <div className="flex items-center gap-2">
            <Link
              to="/admin/tours"
              className="text-xs font-semibold text-cyan px-3 py-2 rounded-full bg-white/5"
            >
              Tours
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-semibold text-white/60 px-3 py-2"
            >
              Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 lg:p-10 pb-24">
          <Outlet />
        </main>
      </div>

      <BulkImportStatusBar />
    </div>
  )
}

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy">{title}</h1>
        {subtitle && <p className="mt-2 text-slate text-sm sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  )
}

export function AdminCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-border shadow-sm shadow-navy/5 overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}
