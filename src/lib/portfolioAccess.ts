const STORAGE_KEY = 'nsv-portfolio-access-v3'

/** 24 hours — must match server ACCESS_TTL_SECONDS. */
export const PORTFOLIO_ACCESS_TTL_MS = 24 * 60 * 60 * 1000

export interface PortfolioAccessInfo {
  name: string
  email: string
  phone: string
  validatedAt: string
  expiresAt: string
  accessToken: string
}

export function clearPortfolioAccess(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('nsv-portfolio-access-v2')
  } catch {
    // ignore
  }
}

function isAccessRecordValid(parsed: PortfolioAccessInfo): boolean {
  if (!parsed.name?.trim() || !parsed.email?.trim() || !parsed.phone?.trim()) {
    return false
  }
  if (!parsed.accessToken?.trim() || !parsed.expiresAt) {
    return false
  }
  return Date.parse(parsed.expiresAt) > Date.now()
}

export function readPortfolioAccess(): PortfolioAccessInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PortfolioAccessInfo
    if (!isAccessRecordValid(parsed)) {
      clearPortfolioAccess()
      return null
    }
    return parsed
  } catch {
    clearPortfolioAccess()
    return null
  }
}

export function hasPortfolioAccess(): boolean {
  return readPortfolioAccess() !== null
}

export function getPortfolioAccessToken(): string | null {
  return readPortfolioAccess()?.accessToken ?? null
}

export function savePortfolioAccess(
  info: Pick<PortfolioAccessInfo, 'name' | 'email' | 'phone' | 'accessToken' | 'expiresAt'> & {
    verifiedAt?: string
  },
): PortfolioAccessInfo {
  const saved: PortfolioAccessInfo = {
    name: info.name.trim(),
    email: info.email.trim(),
    phone: info.phone.trim(),
    validatedAt: info.verifiedAt ?? new Date().toISOString(),
    expiresAt: info.expiresAt,
    accessToken: info.accessToken.trim(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  return saved
}

/** Delay before auto-showing the access gate (ms). */
export const PORTFOLIO_ACCESS_TIMER_MS = 18_000

/** Set true to require email OTP before viewing portfolio items. */
export const PORTFOLIO_ACCESS_VALIDATION_ENABLED = true

export class PortfolioSessionExpiredError extends Error {
  constructor(message = 'Your session expired. Please verify your email again.') {
    super(message)
    this.name = 'PortfolioSessionExpiredError'
  }
}
