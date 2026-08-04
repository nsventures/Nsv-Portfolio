export function getRecaptchaSiteKey(): string | null {
  const key = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()
  return key || null
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(getRecaptchaSiteKey())
}
