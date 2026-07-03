export interface PhoneCountry {
  code: string
  name: string
  dialCode: string
  /** Expected national number length (fixed or range). */
  nationalLength: number | [number, number]
}

/** India first (default), then common international markets. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'IN', name: 'India', dialCode: '91', nationalLength: 10 },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '971', nationalLength: 9 },
  { code: 'AU', name: 'Australia', dialCode: '61', nationalLength: 9 },
  { code: 'BH', name: 'Bahrain', dialCode: '973', nationalLength: 8 },
  { code: 'CA', name: 'Canada', dialCode: '1', nationalLength: 10 },
  { code: 'DE', name: 'Germany', dialCode: '49', nationalLength: [10, 11] },
  { code: 'GB', name: 'United Kingdom', dialCode: '44', nationalLength: 10 },
  { code: 'HK', name: 'Hong Kong', dialCode: '852', nationalLength: 8 },
  { code: 'ID', name: 'Indonesia', dialCode: '62', nationalLength: [9, 11] },
  { code: 'KW', name: 'Kuwait', dialCode: '965', nationalLength: 8 },
  { code: 'MY', name: 'Malaysia', dialCode: '60', nationalLength: [9, 10] },
  { code: 'NP', name: 'Nepal', dialCode: '977', nationalLength: 10 },
  { code: 'OM', name: 'Oman', dialCode: '968', nationalLength: 8 },
  { code: 'QA', name: 'Qatar', dialCode: '974', nationalLength: 8 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '966', nationalLength: 9 },
  { code: 'SG', name: 'Singapore', dialCode: '65', nationalLength: 8 },
  { code: 'US', name: 'United States', dialCode: '1', nationalLength: 10 },
  { code: 'ZA', name: 'South Africa', dialCode: '27', nationalLength: 9 },
]

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]

export function findPhoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.code === code) ?? DEFAULT_PHONE_COUNTRY
}

function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export function phoneCountryLabel(country: PhoneCountry): string {
  return `${flagEmoji(country.code)} +${country.dialCode}`
}
