/** Shared parse/format for the admin DD / MM / YYYY publish-date field. */

export interface DateParts {
  day: string
  month: string
  year: string
}

const EMPTY: DateParts = { day: '', month: '', year: '' }

export function digitsOnly(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

/** Keep only a day that can become 01–31. `5` becomes `05`; `55` is rejected. */
export function sanitizeDayInput(raw: string): { value: string; complete: boolean } {
  const digits = digitsOnly(raw, 2)
  if (!digits) return { value: '', complete: false }
  if (digits.length === 1) {
    const n = Number(digits)
    if (n >= 4) return { value: digits.padStart(2, '0'), complete: true }
    return { value: digits, complete: false }
  }
  const n = Number(digits)
  if (n >= 1 && n <= 31) return { value: String(n).padStart(2, '0'), complete: true }
  return { value: digits[0] <= '3' ? digits[0] : '', complete: false }
}

/** Keep only a month that can become 01–12. `2` becomes `02`; `22` is rejected. */
export function sanitizeMonthInput(raw: string): { value: string; complete: boolean } {
  const digits = digitsOnly(raw, 2)
  if (!digits) return { value: '', complete: false }
  if (digits.length === 1) {
    const n = Number(digits)
    if (n >= 2) return { value: digits.padStart(2, '0'), complete: true }
    return { value: digits, complete: false }
  }
  const n = Number(digits)
  if (n >= 1 && n <= 12) return { value: String(n).padStart(2, '0'), complete: true }
  return { value: digits[0] === '0' || digits[0] === '1' ? digits[0] : '', complete: false }
}

/** Year must be 1990–2100 when complete. */
export function sanitizeYearInput(raw: string): { value: string; complete: boolean } {
  const digits = digitsOnly(raw, 4)
  if (digits.length < 4) return { value: digits, complete: false }
  const n = Number(digits)
  if (n >= 1990 && n <= 2100) return { value: digits, complete: true }
  return { value: digits.slice(0, 3), complete: false }
}

const MAX_PART = { day: 31, month: 12, year: 2100 } as const

/**
 * Keystroke guard for one DD / MM / YYYY box. Impossible input is rejected
 * instead of displayed, so "66" can never land in the day field:
 *  - a lone digit that can only be a zero-prefixed value is padded (6 -> 06)
 *  - a second digit that would push the box out of range is dropped
 *  - the year must start with 1 or 2
 * `complete` says the box is full, so the caller can advance focus.
 */
export function sanitizeDatePart(
  key: keyof DateParts,
  raw: string,
  previous: string,
): { value: string; complete: boolean } {
  const maxLen = key === 'year' ? 4 : 2
  const digits = digitsOnly(raw, maxLen)
  const reject = { value: previous, complete: previous.length === maxLen }

  if (!digits) return { value: '', complete: false }

  if (key === 'year') {
    if (digits[0] !== '1' && digits[0] !== '2') return reject
    return { value: digits, complete: digits.length === 4 }
  }

  const max = MAX_PART[key]
  if (digits.length === 1) {
    const first = Number(digits)
    // 4..9 as a day (or 2..9 as a month) can only mean 04..09 / 02..09.
    if (first > Math.floor(max / 10)) return { value: `0${digits}`, complete: true }
    return { value: digits, complete: false }
  }

  const value = Number(digits)
  if (value < 1 || value > max) return reject
  return { value: digits, complete: true }
}

/** Blur normaliser: a lone day/month digit becomes two digits (6 -> 06). */
export function padDatePart(key: keyof DateParts, value: string): string {
  if (key === 'year' || value.length !== 1 || value === '0') return value
  return `0${value}`
}

export function padParts(parts: DateParts): DateParts {
  return {
    day: padDatePart('day', parts.day),
    month: padDatePart('month', parts.month),
    year: parts.year,
  }
}

/** True when the field holds something the user typed that is not a real date. */
export function partsAreInvalid(parts: DateParts): boolean {
  const padded = padParts(parts)
  const hasInput = Boolean(padded.day || padded.month || padded.year)
  return hasInput && !partsToYmd(padded)
}

export function ymdToParts(ymd: string | null | undefined): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd?.trim() ?? '')
  if (!match) return { ...EMPTY }
  return { year: match[1], month: match[2], day: match[3] }
}

export function isoToYmd(iso: string | null | undefined): string {
  if (!iso?.trim()) return ''
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso.trim())
  if (match) return match[1]
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isValidCivilDate(year: number, month: number, day: number): boolean {
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function partsToYmd(parts: DateParts): string {
  const day = digitsOnly(parts.day, 2)
  const month = digitsOnly(parts.month, 2)
  const year = digitsOnly(parts.year, 4)
  if (day.length === 0 && month.length === 0 && year.length === 0) return ''
  // Require 2-digit day/month so typing "1" for October does not lock as "01".
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return ''

  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  if (!isValidCivilDate(y, m, d)) return ''
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function ymdToIso(ymd: string | null | undefined): string | null {
  const parts = ymdToParts(ymd)
  if (!partsToYmd(parts)) return null
  return `${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`
}

/** Sheet values: 10082026, 10/08/2026, ISO, or an Excel serial. */
export function parsePublishedDateInput(raw: unknown): string | null {
  if (raw == null || raw === '') return null

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return ymdToIso(isoToYmd(raw.toISOString()))
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 10000000 && raw <= 31129999) {
      return parseDigitDate(String(Math.trunc(raw)))
    }
    // Excel serial (~45k in 2026) — not an 8-digit ddmmyyyy
    if (raw > 20000 && raw < 80000) {
      const utc = Date.UTC(1899, 11, 30) + Math.round(raw) * 86400000
      return ymdToIso(isoToYmd(new Date(utc).toISOString()))
    }
    return null
  }

  const text = String(raw).trim()
  if (!text) return null

  if (/^\d+(\.\d+)?$/.test(text)) {
    return parsePublishedDateInput(Number(text))
  }

  const iso = Date.parse(text)
  if (/^\d{4}-\d{2}-\d{2}/.test(text) && !Number.isNaN(iso)) {
    return new Date(iso).toISOString()
  }

  const digits = text.replace(/\D/g, '')
  return parseDigitDate(digits)
}

function parseDigitDate(digits: string): string | null {
  if (digits.length === 8) {
    return ymdToIso(partsToYmd({ day: digits.slice(0, 2), month: digits.slice(2, 4), year: digits.slice(4) }))
  }
  if (digits.length === 6) {
    const yy = Number(digits.slice(4))
    const year = yy >= 90 ? `19${digits.slice(4)}` : `20${digits.slice(4)}`
    return ymdToIso(partsToYmd({ day: digits.slice(0, 2), month: digits.slice(2, 4), year }))
  }
  return null
}

export function sameCalendarDay(iso: string | null | undefined, ymd: string | null | undefined): boolean {
  if (!iso || !ymd) return false
  return isoToYmd(iso) === ymd
}
