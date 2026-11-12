import { isSiteProtectionEnabled } from './siteProtection'
import { getSupabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'nsv-admin-gate-unlocked'

export function isAdminGateRequired(): boolean {
  return isSiteProtectionEnabled()
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

/**
 * Checked in the database and nowhere else.
 *
 * There is deliberately no client-side fallback. The gate used to compare
 * against `VITE_ADMIN_GATE_PASSWORD`, defaulting to a literal in this file —
 * but every VITE_ variable is compiled into the public bundle, so the gate
 * password was readable by anyone who opened the JS. Only the bcrypt hash
 * exists now, in a table with no select policy, compared by a security-definer
 * function (migration 030).
 *
 * The cost of having no fallback is that a project without the migration can't
 * be unlocked at all. That is the intended failure direction: locked out beats
 * a published password.
 */
export async function unlockAdminGate(password: string): Promise<boolean> {
  if (!password) return false

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured, so the admin gate cannot be checked.')
  }

  const { data, error } = await getSupabase().rpc('verify_admin_gate', {
    p_password: password,
  })

  if (error) {
    if (isMissingFunction(error)) {
      throw new Error(
        'Admin gate is not set up on this project. Run migration 030_admin_gate_password.sql.',
      )
    }
    throw new Error(error.message)
  }

  if (data !== true) return false
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
