import { useId } from 'react'

import { findPhoneCountry } from '../../data/phoneCountries'
import { cn } from '../../lib/utils'
import { CountryCodePicker } from './CountryCodePicker'

interface PhoneInputProps {
  countryCode: string
  nationalNumber: string
  onCountryChange: (countryCode: string) => void
  onNationalNumberChange: (value: string) => void
  error?: string
  disabled?: boolean
  id?: string
}

export function PhoneInput({
  countryCode,
  nationalNumber,
  onCountryChange,
  onNationalNumberChange,
  error,
  disabled,
  id,
}: PhoneInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const country = findPhoneCountry(countryCode)
  const maxDigits =
    typeof country.nationalLength === 'number'
      ? country.nationalLength
      : country.nationalLength[1]
  const placeholder =
    typeof country.nationalLength === 'number'
      ? '9'.repeat(country.nationalLength)
      : '9'.repeat(country.nationalLength[0])

  return (
    <div>
      <div
        className={cn(
          'flex items-stretch overflow-hidden rounded-xl border bg-white transition-all',
          'focus-within:ring-2 focus-within:ring-cyan/20 focus-within:border-cyan',
          error ? 'border-red-400' : 'border-border',
          disabled && 'opacity-60',
        )}
      >
        <CountryCodePicker
          id={`${inputId}-country`}
          value={countryCode}
          onChange={onCountryChange}
          disabled={disabled}
        />

        <label htmlFor={inputId} className="sr-only">
          Phone number
        </label>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          maxLength={maxDigits + 2}
          value={nationalNumber}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^\d\s-]/g, '')
            let digitCount = 0
            let cutoff = cleaned.length
            for (let i = 0; i < cleaned.length; i++) {
              if (/\d/.test(cleaned[i])) {
                digitCount++
                if (digitCount > maxDigits) {
                  cutoff = i
                  break
                }
              }
            }
            onNationalNumberChange(cleaned.slice(0, cutoff))
          }}
          placeholder={placeholder}
          className={cn(
            'min-w-0 flex-1 border-0 bg-off-white px-3 py-2.5 text-sm text-navy',
            'placeholder:text-slate-light focus:outline-none focus:ring-0',
          )}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
