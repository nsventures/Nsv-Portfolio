import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from '../data/phoneCountries'

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function nationalLengthOk(length: number, rule: PhoneCountry['nationalLength']): boolean {
  if (typeof rule === 'number') return length === rule
  return length >= rule[0] && length <= rule[1]
}

export function validateNationalNumber(country: PhoneCountry, nationalNumber: string): string | null {
  const digits = digitsOnly(nationalNumber)
  if (!digits) return 'Phone number is required'
  if (!nationalLengthOk(digits.length, country.nationalLength)) {
    if (typeof country.nationalLength === 'number') {
      return `Enter a valid ${country.nationalLength}-digit number`
    }
    return `Enter a valid ${country.nationalLength[0]}–${country.nationalLength[1]}-digit number`
  }
  return null
}

export function toE164(country: PhoneCountry, nationalNumber: string): string {
  return `+${country.dialCode}${digitsOnly(nationalNumber)}`
}

export function parseE164Phone(
  raw: string,
  defaultCountryCode = DEFAULT_PHONE_COUNTRY.code,
): { countryCode: string; nationalNumber: string } {
  const trimmed = raw.trim()
  const digits = digitsOnly(trimmed)

  if (trimmed.startsWith('+') && digits.length >= 8) {
    const byDial = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length)
    for (const country of byDial) {
      if (digits.startsWith(country.dialCode)) {
        return {
          countryCode: country.code,
          nationalNumber: digits.slice(country.dialCode.length),
        }
      }
    }
    return { countryCode: defaultCountryCode, nationalNumber: digits }
  }

  if (digits.length === 10) {
    return { countryCode: 'IN', nationalNumber: digits }
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return { countryCode: 'IN', nationalNumber: digits.slice(2) }
  }

  return { countryCode: defaultCountryCode, nationalNumber: digits }
}
