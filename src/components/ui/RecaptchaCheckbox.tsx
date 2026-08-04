/**
 * @deprecated reCAPTCHA v3 is invisible — use executeRecaptcha() from lib/recaptcha.
 * Kept so old imports do not break builds during transition.
 */
export { executeRecaptcha, isRecaptchaConfigured } from '../../lib/recaptcha'

export function RecaptchaCheckbox(_props: { onChange?: (token: string | null) => void; className?: string }) {
  return null
}

export function resetRecaptcha(): void {
  // v3 tokens are one-shot; nothing to reset in the widget
}
