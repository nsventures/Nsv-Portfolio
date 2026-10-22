import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import {
  getAdminGateUpdatedAt,
  isAdminGateRequired,
  setAdminGatePassword,
} from '../../lib/adminGate'
import { AdminCard, AdminPageHeader } from '../components/AdminLayout'

const MIN_LENGTH = 8

export function SettingsPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    void getAdminGateUpdatedAt().then(setUpdatedAt)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      await setAdminGatePassword(password)
      setPassword('')
      setConfirm('')
      setSuccess('Gate password updated. It applies immediately — no redeploy needed.')
      setUpdatedAt(await getAdminGateUpdatedAt())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-off-white px-4 py-3 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20'

  return (
    <>
      <AdminPageHeader title="Settings" subtitle="Access and security" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl"
      >
        <AdminCard className="p-6">
          <h2 className="font-display text-lg font-bold text-navy">Admin gate password</h2>
          <p className="mt-2 text-sm text-slate">
            The shared password on the <span className="font-semibold">/admin</span> door, asked
            before sign-in. Stored hashed in Supabase and checked on the server.
          </p>
          {!isAdminGateRequired() && (
            <p className="mt-3 rounded-xl bg-off-white px-3 py-2 text-xs text-slate">
              The gate is currently off in this environment (it turns on with{' '}
              <span className="font-semibold">VITE_IS_PRODUCTION</span>). You can still set the
              password here for the deployed site.
            </p>
          )}
          {updatedAt && (
            <p className="mt-3 text-xs text-slate-light">
              Last changed {new Date(updatedAt).toLocaleString('en-IN')}
            </p>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="gate-password"
                className="mb-1.5 block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold"
              >
                New password
              </label>
              <input
                id="gate-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                className={inputClass}
                placeholder={`At least ${MIN_LENGTH} characters`}
              />
            </div>

            <div>
              <label
                htmlFor="gate-password-confirm"
                className="mb-1.5 block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold"
              >
                Confirm password
              </label>
              <input
                id="gate-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  if (error) setError(null)
                }}
                className={inputClass}
                placeholder="Repeat it"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <button
              type="submit"
              disabled={saving || !password || !confirm}
              className="rounded-full bg-cyan px-8 py-3 text-sm font-bold text-navy shadow-lg shadow-cyan/20 hover:bg-cyan-bright transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Update gate password'}
            </button>
          </form>

          <p className="mt-5 text-xs text-slate-light">
            Anyone already past the gate stays in until they close the tab — the new password
            applies to the next person who opens /admin.
          </p>
        </AdminCard>
      </motion.div>
    </>
  )
}
