import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { contact } from '../../data/contact'

export interface InquiryFormData {
  name: string
  email: string
  phone: string
  company: string
  projectType: string
  city: string
  timeline: string
  message: string
}

interface ProjectInquiryModalProps {
  isOpen: boolean
  onClose: () => void
}

const initialData: InquiryFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  projectType: '',
  city: '',
  timeline: '',
  message: '',
}

const projectTypes = [
  'Property Marketing Film',
  'Drone Cinematography',
  'Brand Storytelling',
  'Social Media Content',
  'Full Marketing Campaign',
  'Other',
]

const timelines = ['ASAP', 'Within 2 weeks', 'Within 1 month', 'Flexible / Planning stage']

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] tracking-[0.2em] uppercase text-slate font-semibold mb-2">
      {children}
      {required && <span className="text-cyan ml-1">*</span>}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
  error?: string
}) {
  return (
    <div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-off-white border text-navy text-sm placeholder:text-slate-light',
          'focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all duration-300',
          error ? 'border-red-400' : 'border-border',
        )}
      />
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  )
}

export function ProjectInquiryModal({ isOpen, onClose }: ProjectInquiryModalProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<InquiryFormData>(initialData)
  const [errors, setErrors] = useState<Partial<Record<keyof InquiryFormData, string>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setData(initialData)
      setErrors({})
      setSubmitted(false)
      setIsSubmitting(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  const handleClose = () => onClose()

  const update = (key: keyof InquiryFormData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validateStep1 = () => {
    const next: Partial<Record<keyof InquiryFormData, string>> = {}
    if (!data.name.trim()) next.name = 'Name is required'
    if (!data.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) next.email = 'Enter a valid email'
    if (!data.phone.trim()) next.phone = 'Phone is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const validateStep2 = () => {
    const next: Partial<Record<keyof InquiryFormData, string>> = {}
    if (!data.projectType) next.projectType = 'Select a project type'
    if (!data.city.trim()) next.city = 'City is required'
    if (!data.message.trim()) next.message = 'Tell us about your project'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2() || isSubmitting) return

    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setIsSubmitting(false)
    setSubmitted(true)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            className="absolute inset-0 bg-navy/75 backdrop-blur-md"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl shadow-navy/20"
            data-lenis-prevent
            initial={{ y: 32, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-modal-title"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full text-slate hover:text-navy hover:bg-off-white transition-colors"
              aria-label="Close form"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>

            <div className="p-6 sm:p-8">
              {!submitted ? (
                <>
                  <div className="mb-6 pr-8">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-cyan font-bold">
                      Start a project
                    </span>
                    <h2
                      id="inquiry-modal-title"
                      className="font-display text-2xl sm:text-3xl font-bold text-navy mt-2"
                    >
                      {step === 1 ? 'Tell us about you' : 'About your project'}
                    </h2>
                    <p className="text-slate text-sm mt-2 font-light">
                      Step {step} of 2 — {step === 1 ? 'Your contact details' : 'Project requirements'}
                    </p>
                  </div>

                  <div className="flex gap-2 mb-8">
                    {[1, 2].map((s) => (
                      <div
                        key={s}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all duration-500',
                          s <= step ? 'bg-cyan' : 'bg-navy/10',
                        )}
                      />
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-5"
                      >
                        <div>
                          <FieldLabel required>Full Name</FieldLabel>
                          <TextInput
                            value={data.name}
                            onChange={(v) => update('name', v)}
                            placeholder="Your name"
                            error={errors.name}
                          />
                        </div>
                        <div>
                          <FieldLabel required>Email</FieldLabel>
                          <TextInput
                            type="email"
                            value={data.email}
                            onChange={(v) => update('email', v)}
                            placeholder="you@company.com"
                            error={errors.email}
                          />
                        </div>
                        <div>
                          <FieldLabel required>Phone</FieldLabel>
                          <TextInput
                            type="tel"
                            value={data.phone}
                            onChange={(v) => update('phone', v)}
                            placeholder={contact.phoneDisplay}
                            error={errors.phone}
                          />
                        </div>
                        <div>
                          <FieldLabel>Company / Developer</FieldLabel>
                          <TextInput
                            value={data.company}
                            onChange={(v) => update('company', v)}
                            placeholder="Company name (optional)"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="w-full mt-2 py-3.5 rounded-full bg-cyan text-navy text-sm font-bold tracking-wide hover:bg-cyan-bright transition-colors duration-300"
                          data-cursor="pointer"
                        >
                          Continue
                        </button>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-5"
                        onSubmit={handleSubmit}
                      >
                        <div>
                          <FieldLabel required>Project Type</FieldLabel>
                          <select
                            value={data.projectType}
                            onChange={(e) => update('projectType', e.target.value)}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl bg-off-white border text-navy text-sm',
                              'focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all duration-300',
                              errors.projectType ? 'border-red-400' : 'border-border',
                              !data.projectType && 'text-slate-light',
                            )}
                          >
                            <option value="" disabled>
                              Select project type
                            </option>
                            {projectTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                          {errors.projectType && (
                            <p className="text-red-500 text-xs mt-1.5">{errors.projectType}</p>
                          )}
                        </div>
                        <div>
                          <FieldLabel required>City / Location</FieldLabel>
                          <TextInput
                            value={data.city}
                            onChange={(v) => update('city', v)}
                            placeholder="e.g. Mumbai, Goa"
                            error={errors.city}
                          />
                        </div>
                        <div>
                          <FieldLabel>Timeline</FieldLabel>
                          <select
                            value={data.timeline}
                            onChange={(e) => update('timeline', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-off-white border border-border text-navy text-sm focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all duration-300"
                          >
                            <option value="">Select timeline (optional)</option>
                            {timelines.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <FieldLabel required>Project Details</FieldLabel>
                          <textarea
                            value={data.message}
                            onChange={(e) => update('message', e.target.value)}
                            rows={4}
                            placeholder="Briefly describe your property, goals, and deliverables..."
                            className={cn(
                              'w-full px-4 py-3 rounded-xl bg-off-white border text-navy text-sm resize-none',
                              'focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all duration-300',
                              errors.message ? 'border-red-400' : 'border-border',
                            )}
                          />
                          {errors.message && (
                            <p className="text-red-500 text-xs mt-1.5">{errors.message}</p>
                          )}
                        </div>
                        <div className="flex gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex-1 py-3.5 rounded-full border border-border text-navy text-sm font-semibold hover:border-cyan hover:text-cyan transition-colors duration-300"
                            data-cursor="pointer"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] py-3.5 rounded-full bg-navy text-white text-sm font-bold tracking-wide hover:bg-navy-card transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                            data-cursor="pointer"
                          >
                            {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-4 sm:py-6"
                >
                  <div className="w-14 h-14 rounded-full bg-cyan/15 flex items-center justify-center mx-auto">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-cyan" aria-hidden>
                      <path
                        d="M5 12l5 5L20 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-navy mt-6">
                    Thank you!
                  </h3>
                  <p className="text-slate text-sm mt-3 font-light leading-relaxed max-w-sm mx-auto">
                    We&apos;ve received your inquiry and will get back to you within 24 hours.
                  </p>

                  <button
                    onClick={handleClose}
                    className="w-full mt-8 py-3.5 rounded-full bg-cyan text-navy text-sm font-bold tracking-wide hover:bg-cyan-bright transition-colors duration-300"
                    data-cursor="pointer"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
