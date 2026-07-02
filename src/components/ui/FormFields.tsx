import { useState, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function FloatingInput({ label, error, className, id, ...props }: FloatingInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s/g, '-')
  const [focused, setFocused] = useState(false)
  const hasValue = props.value !== undefined && props.value !== ''

  return (
    <div className="relative">
      <input
        id={inputId}
        className={cn(
          'peer w-full bg-transparent border-b border-cream/15 py-4 text-cream text-sm',
          'focus:outline-none focus:border-gold transition-colors duration-400',
          'placeholder-transparent',
          error && 'border-red-400/60',
          className,
        )}
        placeholder={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'absolute left-0 text-cream-muted pointer-events-none transition-all duration-300',
          focused || hasValue || props.defaultValue
            ? '-top-1 text-[10px] tracking-[0.2em] uppercase text-gold'
            : 'top-4 text-sm',
        )}
      >
        {label}
      </label>
      {error && (
        <p id={`${inputId}-error`} className="text-red-400/80 text-xs mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface FloatingTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function FloatingTextarea({ label, error, className, id, ...props }: FloatingTextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s/g, '-')
  const [focused, setFocused] = useState(false)
  const hasValue = props.value !== undefined && props.value !== ''

  return (
    <div className="relative">
      <textarea
        id={inputId}
        rows={4}
        className={cn(
          'peer w-full bg-transparent border-b border-cream/15 py-4 text-cream text-sm resize-none',
          'focus:outline-none focus:border-gold transition-colors duration-400',
          'placeholder-transparent',
          error && 'border-red-400/60',
          className,
        )}
        placeholder={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={!!error}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'absolute left-0 text-cream-muted pointer-events-none transition-all duration-300',
          focused || hasValue
            ? '-top-1 text-[10px] tracking-[0.2em] uppercase text-gold'
            : 'top-4 text-sm',
        )}
      >
        {label}
      </label>
      {error && (
        <p className="text-red-400/80 text-xs mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface FloatingSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: string[]
  error?: string
}

export function FloatingSelect({ label, options, error, className, id, ...props }: FloatingSelectProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="relative">
      <select
        id={inputId}
        className={cn(
          'w-full bg-transparent border-b border-cream/15 py-4 text-cream text-sm appearance-none',
          'focus:outline-none focus:border-gold transition-colors duration-400',
          error && 'border-red-400/60',
          className,
        )}
        defaultValue=""
        aria-invalid={!!error}
        {...props}
      >
        <option value="" disabled hidden />
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-ink-light text-cream">
            {opt}
          </option>
        ))}
      </select>
      <label
        htmlFor={inputId}
        className="absolute -top-1 left-0 text-[10px] tracking-[0.2em] uppercase text-gold pointer-events-none"
      >
        {label}
      </label>
      <svg
        className="absolute right-0 top-5 w-4 h-4 text-cream-muted pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
      </svg>
      {error && (
        <p className="text-red-400/80 text-xs mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function SuccessMessage({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-4 p-6 border border-gold/30 bg-gold/5"
          role="status"
        >
          <div className="w-10 h-10 rounded-full border border-gold flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gold">
              <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-cream font-medium">Message sent successfully</p>
            <p className="text-cream-muted text-sm mt-0.5">
              We&apos;ll respond within 24 hours.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
