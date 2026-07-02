import { chromium } from 'playwright'
import {
  SCREENSHOT_VIEWPORT,
  screenshotBestMediaSurface,
  tryClickFullscreen,
} from './screenshot-utils.mjs'

export const DEFAULT_SCREENSHOT_OPTIONS = {
  waitMs: 12000,
  panPx: 200,
  scrollDelta: 120,
  settleMs: 1800,
  noPan: false,
}

async function nudgeTourView(page, options) {
  const { panPx, scrollDelta, settleMs } = options
  const { width, height } = page.viewportSize() ?? SCREENSHOT_VIEWPORT
  const cx = width / 2
  const cy = height / 2

  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx, cy - panPx, { steps: 14 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  await page.mouse.move(cx, cy)
  await page.mouse.wheel(0, scrollDelta)
  await page.waitForTimeout(settleMs)
}

export async function launchTourBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  })
  const context = await browser.newContext({
    viewport: SCREENSHOT_VIEWPORT,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
  })
  const page = await context.newPage()
  return { browser, page }
}

export async function screenshotTourToBuffer(page, url, options = {}) {
  const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, ...options }

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(opts.waitMs)

  if (!opts.noPan) {
    await nudgeTourView(page, opts)
  }

  await tryClickFullscreen(page)
  await page.waitForTimeout(800)

  return screenshotBestMediaSurface(page)
}

export async function screenshotTourToFile(page, url, outPath, options = {}) {
  const buffer = await screenshotTourToBuffer(page, url, options)
  const { writeFileSync } = await import('node:fs')
  writeFileSync(outPath, buffer)
}
