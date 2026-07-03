import { PHONE_COUNTRIES_LIST } from './phoneCountries.generated'

export interface PhoneCountry {
  code: string
  name: string
  dialCode: string
  /** Expected national number length (fixed or range). */
  nationalLength: number | [number, number]
}

/** India first (default), then alphabetical — full international list. */
export const PHONE_COUNTRIES: PhoneCountry[] = PHONE_COUNTRIES_LIST.map((country) => ({
  ...country,
  nationalLength:
    typeof country.nationalLength === 'number'
      ? country.nationalLength
      : ([country.nationalLength[0], country.nationalLength[1]] as [number, number]),
}))

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]

export function findPhoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.code === code) ?? DEFAULT_PHONE_COUNTRY
}

export function countryFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export function phoneCountryLabel(country: PhoneCountry): string {
  return `${countryFlagEmoji(country.code)} +${country.dialCode}`
}

export function filterPhoneCountries(query: string): PhoneCountry[] {
  const normalized = query.trim().toLowerCase().replace(/^\+/, '')
  if (!normalized) return PHONE_COUNTRIES

  return PHONE_COUNTRIES.filter((country) => {
    const name = country.name.toLowerCase()
    const code = country.code.toLowerCase()
    const dial = country.dialCode
    return (
      name.includes(normalized) ||
      code.includes(normalized) ||
      dial.startsWith(normalized) ||
      `+${dial}`.includes(normalized)
    )
  })
}
