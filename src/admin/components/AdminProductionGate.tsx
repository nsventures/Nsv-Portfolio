import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '../../components/ui/Logo'
import { isAdminGateUnlocked, unlockAdminGate } from '../../lib/adminGate'
import { cn } from '../../lib/utils'

interface AdminProductionGateProps {
  children: React.ReactNode
}

export function AdminProductionGate({ children }: AdminProductionGateProps) {
  const [unlocked, setUnlocked] = useState(isAdminGateUnlocked)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (unlocked) {
    return <>{children}</>
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const ok = unlockAdminGate(password)
    if (ok) {
      setUnlocked(true)
      setPassword('')
    } else {
      setError('Incorrect password.')
    }

    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-card/80 p-8 shadow-2xl shadow-black/30">
        <Logo size="sm" className="h-8" />
        <h1 className="mt-5 font-display text-xl font-bold text-white">Admin access</h1>
        <p className="mt-2 text-sm text-white/60">
          Enter the admin gate password to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="admin-gate-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50"
            >
              Password
            </label>
            <input
              id="admin-gate-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError(null)
              }}
              autoComplete="current-password"
              autoFocus
              className={cn(
                'w-full rounded-xl border bg-navy-deep/60 px-4 py-3 text-sm text-white placeholder:text-white/30',
                'focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20',
                error ? 'border-red-400/80' : 'border-white/10',
              )}
              placeholder="Enter password"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full rounded-xl bg-cyan py-3 text-sm font-semibold text-navy hover:bg-cyan-bright transition-colors disabled:opacity-50"
          >
            {submitting ? 'Checking…' : 'Continue'}
          </button>
        </form>

        <Link
          to="/"
          className="mt-5 block text-center text-sm text-white/50 hover:text-cyan transition-colors"
        >
          ← Back to site
        </Link>
      </div>
    </div>
  )
}
