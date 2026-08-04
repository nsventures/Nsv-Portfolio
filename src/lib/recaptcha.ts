export function getRecaptchaSiteKey(): string | null {
  const key = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()
  return key || null
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(getRecaptchaSiteKey())
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
      render?: (...args: unknown[]) => number
      reset?: (widgetId?: number) => void
    }
  }
}

const SCRIPT_ID = 'google-recaptcha-v3'

function loadRecaptchaV3(siteKey: string): Promise<void> {
  if (window.grecaptcha?.execute) return Promise.resolve()

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.grecaptcha?.execute) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load captcha')), {
        once: true,
      })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load captcha'))
    document.head.appendChild(script)
  })
}

/**
 * Run invisible reCAPTCHA v3 and return a one-time token.
 * Returns null if site key is missing; throws if Google script/execute fails.
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
  const siteKey = getRecaptchaSiteKey()
  if (!siteKey) return null

  await loadRecaptchaV3(siteKey)

  const grecaptcha = window.grecaptcha
  if (!grecaptcha?.execute) {
    throw new Error('Captcha failed to load. Please refresh and try again.')
  }

  return new Promise((resolve, reject) => {
    grecaptcha.ready(() => {
      grecaptcha
        .execute(siteKey, { action })
        .then((token) => resolve(token))
        .catch(() => reject(new Error('Captcha failed. Please try again.')))
    })
  })
}
