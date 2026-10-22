import { isSiteProtectionEnabled } from './siteProtection'
import { getSupabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'nsv-admin-gate-unlocked'

export function isAdminGateRequired(): boolean {
  return isSiteProtectionEnabled()
}

/**
 * Pre-migration fallback only. The real password lives hashed in Supabase and
 * is checked by `verify_admin_gate`; this is what the build used to compile
 * into the bundle, kept so an un-migrated deploy isn't locked out.
 */
function getLegacyGatePassword(): string {
  const fromEnv = import.meta.env.VITE_ADMIN_GATE_PASSWORD?.trim()
  if (fromEnv) return fromEnv
  return 'nsv@1234'
}

export function isAdminGateUnlocked(): boolean {
  if (!isAdminGateRequired()) return true
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markUnlocked(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

/** Postgres function missing — the migration hasn't been run on this project. */
function isMissingFunction(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST202' ||
    /could not find the function|does not exist/i.test(error.message ?? '')
  )
}

export async function unlockAdminGate(password: string): Promise<boolean> {
  if (!password) return false

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabase().rpc('verify_admin_gate', {
        p_password: password,
      })
      if (!error) {
        if (data === true) {
          markUnlocked()
          return true
        }
        return false
      }
      if (!isMissingFunction(error)) throw new Error(error.message)
      console.warn('[admin-gate] verify_admin_gate missing — run migration 030.')
    } catch (err) {
      console.warn('[admin-gate] falling back to the build-time password:', err)
    }
  }

  if (password !== getLegacyGatePassword()) return false
  markUnlocked()
  return true
}

export async function setAdminGatePassword(password: string): Promise<void> {
  const { error } = await getSupabase().rpc('set_admin_gate_password', {
    p_password: password,
  })
  if (error) throw new Error(error.message)
}

export async function getAdminGateUpdatedAt(): Promise<string | null> {
  const { data, error } = await getSupabase().rpc('admin_gate_updated_at')
  if (error) return null
  return typeof data === 'string' ? data : null
}
