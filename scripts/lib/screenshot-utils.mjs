export const SCREENSHOT_VIEWPORT = { width: 1920, height: 1080 }
export const SCREENSHOT_JPEG_QUALITY = 88
export const VIDEO_CAPTURE_AT_SECONDS = 10

export function screenshotJpegOptions(overrides = {}) {
  return {
    type: 'jpeg',
    quality: SCREENSHOT_JPEG_QUALITY,
    fullPage: false,
    ...overrides,
  }
}

export async function trySkipYoutubeAd(page) {
  const selectors = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-modern',
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
    'button:has-text("Skip Ad")',
    'button:has-text("Skip")',
  ]

  for (const selector of selectors) {
    const btn = page.locator(selector).first()
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(800)
      return true
    }
  }
  return false
}

/** Skip ads, then wait until main video is at least `targetSeconds` in. */
export async function skipAdsAndWaitVideoSeconds(
  page,
  targetSeconds = VIDEO_CAPTURE_AT_SECONDS,
  maxWaitMs = 90_000,
) {
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    await trySkipYoutubeAd(page)

    const ready = await page.evaluate((target) => {
      const adShowing = () => {
        for (const sel of ['.ytp-ad-module', '.ytp-ad-player-overlay', '.video-ads']) {
          const el = document.querySelector(sel)
          if (!el) continue
          const style = getComputedStyle(el)
          if (style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent) {
            return true
          }
        }
        return false
      }

      if (adShowing()) return false

      const video =
        document.querySelector('video.html5-main-video') ||
        document.querySelector('#movie_player video') ||
        document.querySelector('video')

      if (!video || video.closest('.ytp-ad-module, .video-ads')) return false

      if (video.paused) video.play().catch(() => {})

      const player = document.querySelector('#movie_player')
      if (player?.classList.contains('ytp-error')) return false

      const errText = document.querySelector('.ytp-error-content-wrap, .html5-error-message')
      if (errText?.textContent?.includes('Error 150')) return false

      return video.readyState >= 2 && video.currentTime >= target
    }, targetSeconds)

    if (ready) return true
    await page.waitForTimeout(500)
  }

  return false
}

/**
 * Prefer the largest on-page media surface (video/canvas) for a full-width frame.
 */
export async function screenshotBestMediaSurface(page, fallbackOptions = {}) {
  const candidates = page.locator('video, canvas')
  const count = await candidates.count()

  let best = null
  let bestArea = 0

  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i)
    const visible = await el.isVisible().catch(() => false)
    if (!visible) continue

    const inAd = await el
      .evaluate((node) => !!node.closest('.ytp-ad-module, .video-ads'))
      .catch(() => false)
    if (inAd) continue

    const box = await el.boundingBox().catch(() => null)
    if (!box) continue

    const area = box.width * box.height
    if (box.width >= 640 && area > bestArea) {
      bestArea = area
      best = el
    }
  }

  if (best) {
    return best.screenshot(screenshotJpegOptions())
  }

  return page.screenshot(screenshotJpegOptions(fallbackOptions))
}

export async function tryClickFullscreen(page) {
  const selectors = [
    'button[aria-label="Full screen"]',
    'button[aria-label="Fullscreen"]',
    '.ytp-fullscreen-button',
    'button.ytp-fullscreen-button',
    '[title="Fullscreen"]',
    '[title="Full screen"]',
    '.fullscreen-button',
    '.vr-fullscreen',
    'button:has-text("Fullscreen")',
  ]

  for (const selector of selectors) {
    const btn = page.locator(selector).first()
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(600)
      return true
    }
  }

  return false
}

export async function tryTheaterMode(page) {
  const theater = page.locator(
    '.ytp-size-button, button.ytp-size-button, button[aria-label="Theater mode"]',
  )
  if (await theater.isVisible({ timeout: 1500 }).catch(() => false)) {
    await theater.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(500)
  }
}
