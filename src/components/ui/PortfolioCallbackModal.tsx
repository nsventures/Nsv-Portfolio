import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { submitPortfolioCallback } from '../../api/portfolioCallback'
import { pauseSmoothScroll, resumeSmoothScroll } from '../../lib/lenisControl'
import { cn } from '../../lib/utils'
import { Logo } from './Logo'

interface PortfolioCallbackModalProps {
  initialName?: string
  initialEmail?: string
  initialPhone?: string
  projectName?: string | null
  onClose: () => void
}

interface FormState {
  name: string
  email: string
  phone: string
  message: string
}

export function PortfolioCallbackModal({
  initialName = '',
  initialEmail = '',
  initialPhone = '',
  projectName,
  onClose,
}: PortfolioCallbackModalProps) {
  const [data, setData] = useState<FormState>({
    name: initialName,
    email: initialEmail,
    phone: initialPhone,
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    pauseSmoothScroll()
    return () => resumeSmoothScroll()
  }, [])

  const inputClass = (hasError?: boolean) =>
    cn(
      'w-full rounded-xl border bg-off-white px-4 py-3 text-sm text-navy placeholder:text-slate-light',
      'focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 transition-all',
      hasError ? 'border-red-400' : 'border-border',
    )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!data.name.trim() || !data.email.trim() || !data.phone.trim()) {
      setError('Please fill in name, email, and phone.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await submitPortfolioCallback({
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message || null,
        projectName,
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send request')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="portfolio-callback-modal fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="portfolio-access-gate-backdrop absolute inset-0"
        aria-label="Close callback form"
        onClick={onClose}
      />

      <div
        className="portfolio-access-gate-panel relative z-10 w-full max-w-md overflow-hidden"
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-callback-title"
      >
        <div className="portfolio-access-gate-header px-6 py-5 sm:px-7">
          <Logo size="sm" className="h-8 sm:h-9" />
          <h2 id="portfolio-callback-title" className="mt-3 font-display text-xl font-bold text-white">
            We&apos;ll call you back
          </h2>
          <p className="mt-1 text-sm text-white/75">
            Leave your details and our team will reach out shortly.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-7 sm:py-7">
          {sent ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="font-medium text-navy">Request received</p>
              <p className="mt-2 text-sm text-slate">
                We&apos;ve notified our team. Expect a call or email soon.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Name
                </label>
                <input
                  value={data.name}
                  onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass()}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Email
                </label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData((p) => ({ ...p, email: e.target.value }))}
                  className={inputClass()}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Phone
                </label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => setData((p) => ({ ...p, phone: e.target.value }))}
                  className={inputClass()}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Message <span className="font-normal normal-case text-slate-light">(optional)</span>
                </label>
                <textarea
                  value={data.message}
                  onChange={(e) => setData((p) => ({ ...p, message: e.target.value }))}
                  rows={3}
                  className={cn(inputClass(), 'resize-none')}
                  placeholder="Best time to call, project details…"
                />
              </div>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white shadow-lg shadow-navy/15 hover:bg-navy-light transition-colors disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Request callback'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-sm text-slate hover:text-navy transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
