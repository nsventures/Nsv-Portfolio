/**
 * Verify a Google reCAPTCHA v3 token with Google's siteverify API.
 * If RECAPTCHA_SECRET_KEY is unset, verification is skipped (local/dev convenience).
 *
 * Optional env:
 *   RECAPTCHA_MIN_SCORE — default 0.5 (0.0 = bot, 1.0 = human)
 */
export async function verifyRecaptchaV3(
  token: string | null | undefined,
  expectedAction?: string,
): Promise<{ ok: true; score?: number } | { ok: false; error: string }> {
  const secret = Deno.env.get('RECAPTCHA_SECRET_KEY')?.trim() ?? ''

  if (!secret) {
    console.warn('[recaptcha] RECAPTCHA_SECRET_KEY not set — skipping verification')
    return { ok: true }
  }

  const trimmed = token?.trim() ?? ''
  if (!trimmed) {
    return { ok: false, error: 'Security check failed. Please try again.' }
  }

  const body = new URLSearchParams({
    secret,
    response: trimmed,
  })

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    return { ok: false, error: 'Security check failed. Please try again.' }
  }

  const payload = (await res.json()) as {
    success?: boolean
    score?: number
    action?: string
    'error-codes'?: string[]
  }

  if (!payload.success) {
    const codes = payload['error-codes'] ?? []
    console.warn('[recaptcha] siteverify failed:', codes.join(', ') || 'unknown')
    return { ok: false, error: 'Security check expired or invalid. Please try again.' }
  }

  if (expectedAction && payload.action && payload.action !== expectedAction) {
    console.warn('[recaptcha] action mismatch:', payload.action, 'expected', expectedAction)
    return { ok: false, error: 'Security check failed. Please try again.' }
  }

  const minScore = Number(Deno.env.get('RECAPTCHA_MIN_SCORE') ?? '0.5')
  const score = typeof payload.score === 'number' ? payload.score : 0
  if (score < minScore) {
    console.warn('[recaptcha] low score:', score, 'min', minScore)
    return { ok: false, error: 'Could not verify you are human. Please try again.' }
  }

  return { ok: true, score }
}

/** @deprecated Use verifyRecaptchaV3 */
export const verifyRecaptchaV2 = verifyRecaptchaV3
