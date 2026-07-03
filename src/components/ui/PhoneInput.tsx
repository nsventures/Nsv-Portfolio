import { useId } from 'react'

import {
  findPhoneCountry,
  PHONE_COUNTRIES,
  phoneCountryLabel,
} from '../../data/phoneCountries'
import { cn } from '../../lib/utils'

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
          'flex overflow-hidden rounded-xl border bg-off-white transition-all',
          'focus-within:ring-2 focus-within:ring-cyan/20 focus-within:border-cyan',
          error ? 'border-red-400' : 'border-border',
          disabled && 'opacity-60',
        )}
      >
        <label htmlFor={`${inputId}-country`} className="sr-only">
          Country code
        </label>
        <select
          id={`${inputId}-country`}
          value={countryCode}
          disabled={disabled}
          onChange={(e) => onCountryChange(e.target.value)}
          className={cn(
            'shrink-0 w-[5.75rem] sm:w-[6.5rem] border-0 border-r border-border bg-off-white py-3 pl-2 pr-6',
            'text-sm text-navy focus:outline-none focus:ring-0',
            'appearance-none cursor-pointer',
          )}
          aria-label="Country code"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {phoneCountryLabel(c)} {c.name}
            </option>
          ))}
        </select>

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
            'min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-navy',
            'placeholder:text-slate-light focus:outline-none focus:ring-0',
          )}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
