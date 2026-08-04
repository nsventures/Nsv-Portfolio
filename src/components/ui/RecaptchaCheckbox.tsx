import { useEffect, useId, useRef } from 'react'
import { getRecaptchaSiteKey } from '../../lib/recaptcha'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      render: (
        container: string | HTMLElement,
        parameters: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark'
          size?: 'normal' | 'compact'
        },
      ) => number
      reset: (widgetId?: number) => void
    }
    ___grecaptcha_cfg?: unknown
  }
}

const SCRIPT_ID = 'google-recaptcha-v2'
const SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit'

function loadRecaptchaScript(): Promise<void> {
  if (window.grecaptcha?.render) return Promise.resolve()

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load captcha')), {
        once: true,
      })
      if (window.grecaptcha) resolve()
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load captcha'))
    document.head.appendChild(script)
  })
}

interface RecaptchaCheckboxProps {
  onChange: (token: string | null) => void
  className?: string
}

/** Google reCAPTCHA v2 checkbox (“I’m not a robot”). Renders nothing if site key is missing. */
export function RecaptchaCheckbox({ onChange, className }: RecaptchaCheckboxProps) {
  const siteKey = getRecaptchaSiteKey()
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)
  const onChangeRef = useRef(onChange)
  const reactId = useId().replace(/:/g, '')

  onChangeRef.current = onChange

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false

    void loadRecaptchaScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.grecaptcha) return

        window.grecaptcha.ready(() => {
          if (cancelled || !containerRef.current || !window.grecaptcha) return
          if (widgetIdRef.current !== null) return

          containerRef.current.innerHTML = ''
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => onChangeRef.current(token),
            'expired-callback': () => onChangeRef.current(null),
            'error-callback': () => onChangeRef.current(null),
            theme: 'light',
            size: 'normal',
          })
        })
      })
      .catch(() => {
        onChangeRef.current(null)
      })

    return () => {
      cancelled = true
      widgetIdRef.current = null
      onChangeRef.current(null)
    }
  }, [siteKey, reactId])

  if (!siteKey) return null

  return (
    <div className={className}>
      <div ref={containerRef} data-recaptcha={reactId} className="flex justify-center min-h-[78px]" />
    </div>
  )
}

export function resetRecaptcha(): void {
  try {
    window.grecaptcha?.reset()
  } catch {
    // ignore
  }
}
