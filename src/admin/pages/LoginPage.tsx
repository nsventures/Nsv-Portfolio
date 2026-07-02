import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import { Logo } from '../../components/ui/Logo'
import { getSupabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { useAdminAuthContext } from '../context/AdminAuthContext'

type Mode = 'login' | 'forgot' | 'new-password'

export function LoginPage() {
  const { session, isAdmin, signIn, resetPassword, updatePassword, loading, error } =
    useAdminAuthContext()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('new-password')
        setSuccess(null)
        setLocalError(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!loading && session && isAdmin && mode !== 'new-password') {
    return <Navigate to="/admin" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      await resetPassword(email.trim())
      setSuccess('Password reset email sent. Check your inbox.')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not send reset email')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    setLocalError(null)
    setSubmitting(true)
    try {
      await updatePassword(newPassword)
      setSuccess('Password updated. You can sign in now.')
      setMode('login')
      setPassword('')
      setNewPassword('')
      setConfirmPassword('')
      await getSupabase().auth.signOut()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = localError || (mode === 'login' ? error : null)

  return (
    <div className="min-h-screen bg-navy-deep relative overflow-hidden flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(41,171,226,0.18),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(0,174,239,0.12),transparent_45%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <Logo size="lg" className="h-12 mx-auto" />
          </Link>
          <p className="mt-6 text-[10px] uppercase tracking-[0.4em] text-cyan font-semibold">
            Admin Portal
          </p>
          <h1 className="mt-3 font-display text-2xl font-bold text-white">
            {mode === 'forgot'
              ? 'Reset password'
              : mode === 'new-password'
                ? 'Set new password'
                : 'Welcome back'}
          </h1>
        </div>

        <form
          onSubmit={
            mode === 'forgot'
              ? handleForgot
              : mode === 'new-password'
                ? handleNewPassword
                : handleLogin
          }
          className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/20 space-y-5"
        >
          {displayError && (
            <div className="rounded-xl bg-red-500/10 border border-red-400/30 px-4 py-3 text-sm text-red-200">
              {displayError}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3 text-sm text-emerald-100">
              {success}
            </div>
          )}

          {mode !== 'new-password' && (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-cyan/90 font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-navy/40 border border-white/10 px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                placeholder="you@nsventures.in"
              />
            </div>
          )}

          {mode === 'login' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-[0.25em] text-cyan/90 font-semibold">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot')
                    setLocalError(null)
                    setSuccess(null)
                  }}
                  className="text-[10px] text-cyan/80 hover:text-cyan"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-navy/40 border border-white/10 px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                placeholder="••••••••"
              />
            </div>
          )}

          {mode === 'new-password' && (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-cyan/90 font-semibold mb-2">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl bg-navy/40 border border-white/10 px-4 py-3.5 text-white focus:outline-none focus:border-cyan"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-cyan/90 font-semibold mb-2">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl bg-navy/40 border border-white/10 px-4 py-3.5 text-white focus:outline-none focus:border-cyan"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className={cn(
              'w-full rounded-full py-3.5 text-sm font-bold tracking-wide transition-all',
              'bg-cyan text-navy hover:bg-cyan-bright shadow-lg shadow-cyan/25',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {submitting
              ? 'Please wait…'
              : mode === 'forgot'
                ? 'Send reset link'
                : mode === 'new-password'
                  ? 'Update password'
                  : 'Sign in'}
          </button>

          {mode !== 'login' && (
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setLocalError(null)
                setSuccess(null)
              }}
              className="w-full text-sm text-white/50 hover:text-cyan"
            >
              ← Back to sign in
            </button>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-white/35">
          <Link to="/" className="hover:text-cyan transition-colors">
            ← Back to website
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
