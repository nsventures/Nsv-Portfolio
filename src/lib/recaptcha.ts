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
      ready?: (cb: () => void) => void
      execute?: (siteKey: string, options: { action: string }) => Promise<string>
      render?: (...args: unknown[]) => number
      reset?: (widgetId?: number) => void
    }
  }
}

const SCRIPT_ID = 'google-recaptcha-v3'

let loadPromise: Promise<void> | null = null

function isGrecaptchaReady(): boolean {
  const g = window.grecaptcha
  return typeof g?.ready === 'function' && typeof g.execute === 'function'
}

function waitForGrecaptchaReady(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now()

    const tryReady = () => {
      if (isGrecaptchaReady()) {
        window.grecaptcha!.ready!(() => resolve())
        return
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Captcha failed to load. Please refresh and try again.'))
        return
      }
      window.setTimeout(tryReady, 50)
    }

    tryReady()
  })
}

/** Load the v3 script once and wait until grecaptcha.execute is ready. */
export function preloadRecaptcha(): Promise<void> {
  const siteKey = getRecaptchaSiteKey()
  if (!siteKey) return Promise.resolve()

  if (isGrecaptchaReady()) {
    return waitForGrecaptchaReady()
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null

    const onReady = () => {
      waitForGrecaptchaReady().then(resolve).catch(reject)
    }

    if (existing) {
      if (isGrecaptchaReady()) {
        onReady()
        return
      }
      existing.addEventListener('load', onReady, { once: true })
      existing.addEventListener(
        'error',
        () => {
          loadPromise = null
          reject(new Error('Failed to load captcha'))
        },
        { once: true },
      )
      // Script may already be loaded but grecaptcha not yet attached
      onReady()
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.defer = true
    script.onload = onReady
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load captcha'))
    }
    document.head.appendChild(script)
  }).catch((err) => {
    loadPromise = null
    throw err
  })

  return loadPromise
}

/**
 * Run invisible reCAPTCHA v3 and return a one-time token.
 * Returns null if site key is missing.
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
  const siteKey = getRecaptchaSiteKey()
  if (!siteKey) return null

  await preloadRecaptcha()

  if (!isGrecaptchaReady()) {
    throw new Error('Captcha failed to load. Please refresh and try again.')
  }

  const grecaptcha = window.grecaptcha!
  return new Promise((resolve, reject) => {
    grecaptcha.ready!(() => {
      grecaptcha
        .execute!(siteKey, { action })
        .then((token) => resolve(token))
        .catch(() => reject(new Error('Captcha failed. Please try again.')))
    })
  })
}
