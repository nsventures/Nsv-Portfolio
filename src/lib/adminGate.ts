import { isSiteProtectionEnabled } from './siteProtection'

const STORAGE_KEY = 'nsv-admin-gate-unlocked'

export function isAdminGateRequired(): boolean {
  return isSiteProtectionEnabled() && Boolean(getAdminGatePassword())
}

export function getAdminGatePassword(): string {
  const fromEnv = import.meta.env.VITE_ADMIN_GATE_PASSWORD?.trim()
  if (fromEnv) return fromEnv
  if (isSiteProtectionEnabled()) return 'nsv@1234'
  return ''
}

export function isAdminGateUnlocked(): boolean {
  if (!isAdminGateRequired()) return true
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function unlockAdminGate(password: string): boolean {
  if (password !== getAdminGatePassword()) return false
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore
  }
  return true
}
