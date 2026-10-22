/**
 * Supabase strips its tokens out of the URL as soon as the client is created,
 * and the matching PASSWORD_RECOVERY event fires once — before the lazily
 * loaded admin bundle has mounted a listener. Reading the link ourselves at
 * startup makes "set a new password" survive that race.
 */
const STORAGE_KEY = 'nsv-password-recovery'

/** Call once at startup, before anything touches the Supabase client. */
export function captureRecoveryFromUrl(): void {
  try {
    const hash = window.location.hash.replace(/^#/, '')
    const hashParams = new URLSearchParams(hash)
    const queryParams = new URLSearchParams(window.location.search)

    const type = hashParams.get('type') ?? queryParams.get('type')
    const hasToken =
      hashParams.has('access_token') ||
      queryParams.has('code') ||
      queryParams.has('token_hash')

    if (type === 'recovery' && hasToken) {
      sessionStorage.setItem(STORAGE_KEY, '1')
    }
  } catch {
    // Private mode / blocked storage — fall back to the auth event.
  }
}

export function isPasswordRecovery(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function beginPasswordRecovery(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

/** Clear once the new password has been saved (or the user backs out). */
export function endPasswordRecovery(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
