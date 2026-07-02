import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  sendPortfolioEmailOtp,
  verifyPortfolioEmailOtp,
} from '../../api/portfolioOtp'
import { pauseSmoothScroll, resumeSmoothScroll } from '../../lib/lenisControl'
import { savePortfolioAccess } from '../../lib/portfolioAccess'
import { cn } from '../../lib/utils'
import { Logo } from './Logo'
import { OtpInput } from './OtpInput'

interface PortfolioAccessGateModalProps {
  pendingProjectName?: string | null
  onValidated: () => void
}

type Step = 'details' | 'otp'

interface FormState {
  name: string
  email: string
  phone: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  otp?: string
  submit?: string
}

function validateDetails(data: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim()) errors.name = 'Name is required'
  if (!data.email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Enter a valid email'
  }
  const digits = data.phone.replace(/\D/g, '')
  if (!digits) errors.phone = 'Phone number is required'
  else if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith('91'))) {
    errors.phone = 'Enter a valid 10-digit mobile number'
  }
  return errors
}

export function PortfolioAccessGateModal({
  pendingProjectName,
  onValidated,
}: PortfolioAccessGateModalProps) {
  const [step, setStep] = useState<Step>('details')
  const [data, setData] = useState<FormState>({ name: '', email: '', phone: '' })
  const [otp, setOtp] = useState('')
  const [emailMasked, setEmailMasked] = useState('')
  const [phoneMasked, setPhoneMasked] = useState('')
  const [whatsappSent, setWhatsappSent] = useState(false)
  const [whatsappError, setWhatsappError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  useEffect(() => {
    pauseSmoothScroll()
    return () => resumeSmoothScroll()
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const update = (key: keyof FormState, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined, submit: undefined }))
  }

  const inputClass = (hasError: boolean) =>
    cn(
      'w-full rounded-xl border bg-off-white px-4 py-3 text-sm text-navy placeholder:text-slate-light',
      'focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 transition-all',
      hasError ? 'border-red-400' : 'border-border',
    )

  const sendOtp = async () => {
    const nextErrors = validateDetails(data)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const result = await sendPortfolioEmailOtp({
        name: data.name,
        email: data.email,
        phone: data.phone,
        projectName: pendingProjectName,
      })
      setEmailMasked(result.emailMasked)
      setPhoneMasked(result.phoneMasked)
      setWhatsappSent(result.whatsappSent)
      setWhatsappError(result.whatsappError ?? null)
      setResendIn(60)
      setOtp('')
      setStep('otp')
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Could not send verification code',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDetailsSubmit = (e: FormEvent) => {
    e.preventDefault()
    void sendOtp()
  }

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!/^\d{6}$/.test(otp.trim())) {
      setErrors({ otp: 'Enter the full 6-digit code' })
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const profile = await verifyPortfolioEmailOtp({
        email: data.email.trim(),
        otp: otp.trim(),
      })
      savePortfolioAccess({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        accessToken: profile.accessToken,
        expiresAt: profile.expiresAt,
        verifiedAt: profile.verifiedAt,
      })
      onValidated()
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Verification failed',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
        className="portfolio-access-gate fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
        role="presentation"
      >
        <div className="portfolio-access-gate-backdrop absolute inset-0" aria-hidden />

        <div
          className="portfolio-access-gate-panel relative z-10 w-full max-w-md overflow-hidden"
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-labelledby="portfolio-access-title"
        >
          <div className="portfolio-access-gate-header px-6 py-5 sm:px-7">
            <div className="flex items-center justify-between gap-3">
              <Logo size="sm" className="h-8 sm:h-9" />
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-1.5 w-6 rounded-full transition-colors',
                    step === 'details' ? 'bg-cyan' : 'bg-white/30',
                  )}
                />
                <span
                  className={cn(
                    'h-1.5 w-6 rounded-full transition-colors',
                    step === 'otp' ? 'bg-cyan' : 'bg-white/30',
                  )}
                />
              </div>
            </div>
            <h2
              id="portfolio-access-title"
              className="mt-3 font-display text-xl sm:text-2xl font-bold text-white"
            >
              {step === 'otp' ? 'Check your email & WhatsApp' : 'View our work'}
            </h2>
            <p className="mt-1.5 text-sm text-white/75 leading-relaxed">
              {step === 'otp' ? (
                <>
                  We sent a 6-digit code to{' '}
                  <span className="text-white/90">{emailMasked || 'your email'}</span>
                  {whatsappSent && phoneMasked ? (
                    <>
                      {' '}
                      and WhatsApp{' '}
                      <span className="text-white/90">{phoneMasked}</span>.
                    </>
                  ) : (
                    '.'
                  )}
                  {!whatsappSent ? (
                    <span className="mt-1 block text-white/60">
                      {whatsappError?.toLowerCase().includes('invalid end point') ||
                      whatsappError?.toLowerCase().includes('invalid endpoint')
                        ? 'WhatsApp failed — set AUTHYO_AUTHORIZED_ENDPOINT=http://localhost:5173 in .env.local and Authyo dashboard, then run npm run dev:all.'
                        : whatsappError?.includes('relay')
                          ? 'WhatsApp relay offline — run npm run dev:all (needs import server on :3001).'
                          : whatsappError ?? 'WhatsApp delivery failed — use the code from your email.'}
                    </span>
                  ) : null}
                </>
              ) : pendingProjectName ? (
                `Verify your details to watch ${pendingProjectName}.`
              ) : (
                'Verify your details to explore our portfolio.'
              )}
            </p>
          </div>

          <div className="px-6 py-6 sm:px-7 sm:py-7">
            {step === 'details' ? (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
                    Name
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className={inputClass(!!errors.name)}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
                    Email
                  </label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className={inputClass(!!errors.email)}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={data.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    className={inputClass(!!errors.phone)}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                </div>

                {errors.submit && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                    {errors.submit}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white shadow-lg shadow-navy/15 hover:bg-navy-light transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending code…' : 'Send verification code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div>
                  <label className="mb-3 block text-center text-xs font-semibold uppercase tracking-wide text-slate">
                    Enter verification code
                  </label>
                  <OtpInput
                    value={otp}
                    onChange={(value) => {
                      setOtp(value)
                      if (errors.otp || errors.submit) {
                        setErrors((prev) => ({ ...prev, otp: undefined, submit: undefined }))
                      }
                    }}
                    disabled={submitting}
                    hasError={!!errors.otp}
                  />
                  {errors.otp && (
                    <p className="mt-2 text-center text-xs text-red-500">{errors.otp}</p>
                  )}
                </div>

                {errors.submit && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                    {errors.submit}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || otp.length < 6}
                  className="w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white shadow-lg shadow-navy/15 hover:bg-navy-light transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Verifying…' : 'Verify & continue'}
                </button>

                <div className="flex items-center justify-between gap-3 text-xs">
                  {/* <button
                    type="button"
                    onClick={() => {
                      setStep('details')
                      setOtp('')
                      setErrors({})
                    }}
                    className="text-slate hover:text-navy transition-colors"
                  >
                    ← Edit details
                  </button> */}
                  <button
                    type="button"
                    disabled={submitting || resendIn > 0}
                    onClick={() => void sendOtp()}
                    className="font-medium text-cyan hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-light">
              We use your details to verify access and share portfolio updates.
            </p>
          </div>
        </div>
      </div>,
    document.body,
  )
}
