/**
 * Verify a Google reCAPTCHA v2 checkbox token with Google's siteverify API.
 * If RECAPTCHA_SECRET_KEY is unset, verification is skipped (local/dev convenience).
 */
export async function verifyRecaptchaV2(
  token: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = Deno.env.get('RECAPTCHA_SECRET_KEY')?.trim() ?? ''

  if (!secret) {
    console.warn('[recaptcha] RECAPTCHA_SECRET_KEY not set — skipping verification')
    return { ok: true }
  }

  const trimmed = token?.trim() ?? ''
  if (!trimmed) {
    return { ok: false, error: 'Please complete the captcha' }
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
    return { ok: false, error: 'Captcha verification failed. Please try again.' }
  }

  const payload = (await res.json()) as {
    success?: boolean
    'error-codes'?: string[]
  }

  if (!payload.success) {
    const codes = payload['error-codes'] ?? []
    console.warn('[recaptcha] siteverify failed:', codes.join(', ') || 'unknown')
    return { ok: false, error: 'Captcha expired or invalid. Please try again.' }
  }

  return { ok: true }
}
