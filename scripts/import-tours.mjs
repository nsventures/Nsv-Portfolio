/**
 * Import virtual tours from a CSV sheet + auto-generate thumbnails.
 *
 * Setup (once):
 *   npm install
 *   npx playwright install chromium
 *
 * Usage:
 *   1. Export your sheet as CSV → save as data/tours.csv
 *      Columns: link (required), city (required), name (optional)
 *   2. npm run import:tours
 *
 * Output:
 *   - public/tour-thumbs/*.jpg
 *   - src/data/imported-tours.json
 *
 * For Supabase bulk import with admin UI + progress, use /admin/bulk-upload instead.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseCsvLine, slugFromUrl, nameFromSlug } from './lib/tour-import-utils.mjs'
import { launchTourBrowser, screenshotTourToFile } from './lib/tour-screenshot.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const CSV_PATH = process.argv.find((a) => a.startsWith('--csv='))?.slice(6) ?? join(ROOT, 'data/tours.csv')
const SKIP_SCREENSHOTS = process.argv.includes('--skip-screenshots')
const WAIT_MS = Number(process.argv.find((a) => a.startsWith('--wait='))?.slice(7) ?? 12000)
const PAN_PX = Number(process.argv.find((a) => a.startsWith('--pan='))?.slice(6) ?? 160)
const SCROLL_DELTA = Number(process.argv.find((a) => a.startsWith('--scroll='))?.slice(9) ?? 120)
const SETTLE_MS = Number(process.argv.find((a) => a.startsWith('--settle='))?.slice(9) ?? 1500)
const NO_PAN = process.argv.includes('--no-pan')

const THUMB_DIR = join(ROOT, 'public/tour-thumbs')
const OUT_JSON = join(ROOT, 'src/data/imported-tours.json')

const screenshotOptions = {
  waitMs: WAIT_MS,
  panPx: PAN_PX,
  scrollDelta: SCROLL_DELTA,
  settleMs: SETTLE_MS,
  noPan: NO_PAN,
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const linkIdx = headers.indexOf('link')
  const cityIdx = headers.indexOf('city')
  const nameIdx = headers.indexOf('name')

  if (linkIdx === -1) {
    throw new Error('CSV must have a "link" column')
  }

  return lines.slice(1).map((line, i) => {
    const cols = parseCsvLine(line)
    const link = cols[linkIdx]?.replace(/^"|"$/g, '')
    if (!link?.startsWith('http')) {
      throw new Error(`Row ${i + 2}: invalid link "${link}"`)
    }
    return {
      link,
      city: cityIdx >= 0 ? (cols[cityIdx] || 'Unknown').replace(/^"|"$/g, '') : 'Unknown',
      name: nameIdx >= 0 ? (cols[nameIdx] || '').replace(/^"|"$/g, '') : '',
    }
  })
}

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`\nMissing CSV: ${CSV_PATH}`)
    console.error('Export your sheet as CSV with columns: link, city, name')
    console.error('Copy data/tours.csv.example → data/tours.csv and fill it in.\n')
    process.exit(1)
  }

  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'))
  console.log(`Found ${rows.length} tours in ${CSV_PATH}`)

  mkdirSync(THUMB_DIR, { recursive: true })

  const entries = rows.map((row) => {
    const id = slugFromUrl(row.link)
    const thumbFile = `${id}.jpg`
    return {
      id,
      name: row.name || nameFromSlug(id),
      link: row.link,
      thumbnail: `/tour-thumbs/${thumbFile}`,
      city: row.city,
      mediaType: 'virtual-tour',
      _thumbPath: join(THUMB_DIR, thumbFile),
    }
  })

  if (!SKIP_SCREENSHOTS) {
    console.log(
      `\nLaunching browser (wait ${WAIT_MS / 1000}s, then pan down ${PAN_PX}px + scroll before capture)…\n`,
    )
    const { browser, page } = await launchTourBrowser()

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      process.stdout.write(`[${i + 1}/${entries.length}] ${entry.name} … `)
      try {
        await screenshotTourToFile(page, entry.link, entry._thumbPath, screenshotOptions)
        console.log('ok')
      } catch (err) {
        console.log('failed —', err.message)
        entry.thumbnail = null
      }
    }

    await browser.close()
  } else {
    console.log('Skipping screenshots (--skip-screenshots)')
  }

  const output = entries.map(({ _thumbPath, ...rest }) => rest)
  writeFileSync(OUT_JSON, JSON.stringify(output, null, 2) + '\n')

  console.log(`\nDone.`)
  console.log(`  Thumbnails: public/tour-thumbs/`)
  console.log(`  Data:       src/data/imported-tours.json`)
  console.log(`\nRestart dev server to see tours in the portfolio.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
