import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '../../lib/utils'

const OTP_LENGTH = 6

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  hasError?: boolean
}

export function OtpInput({ value, onChange, disabled, hasError }: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '')

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  const updateAt = (index: number, char: string) => {
    const next = digits.slice()
    next[index] = char
    onChange(next.join('').slice(0, OTP_LENGTH))
  }

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      updateAt(index, '')
      return
    }

    if (cleaned.length > 1) {
      const merged = (digits.join('').slice(0, index) + cleaned).slice(0, OTP_LENGTH)
      onChange(merged)
      const focusIndex = Math.min(merged.length, OTP_LENGTH - 1)
      inputsRef.current[focusIndex]?.focus()
      return
    }

    updateAt(index, cleaned)
    if (index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
      updateAt(index - 1, '')
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    onChange(pasted)
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          className={cn(
            'portfolio-otp-cell h-12 w-10 sm:h-14 sm:w-12 rounded-xl border bg-off-white text-center text-lg sm:text-xl font-semibold text-navy',
            'focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/25 transition-all',
            hasError ? 'border-red-400' : 'border-border',
            disabled && 'opacity-60',
          )}
        />
      ))}
    </div>
  )
}
