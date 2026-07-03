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
          value={nationalNumber}
          onChange={(e) => onNationalNumberChange(e.target.value.replace(/[^\d\s-]/g, ''))}
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
