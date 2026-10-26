#!/usr/bin/env node
/**
 * Renders the commercial PDF into page images for the in-site flipbook, and
 * pulls the URLs/phone numbers out of the text layer so they can be overlaid
 * as real links (the PDF itself carries no link annotations).
 *
 *   node scripts/build-commercial-pages.mjs [path/to/deck.pdf]
 *
 * Needs poppler's `pdftoppm` on PATH (brew install poppler) for the images;
 * links come from pdf.js.
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'

// Kept outside public/ on purpose: the deck is read in the flipbook, not downloaded.
const SOURCE = process.argv[2] ?? 'source-docs/commercial.pdf'
const OUT_DIR = 'public/commercial'
const MANIFEST = 'src/data/commercialPages.ts'
const WIDTH = 1100

if (!existsSync(SOURCE)) {
  console.error(`Source PDF not found: ${SOURCE}`)
  process.exit(1)
}

/**
 * Link hotspots, read with pdf.js:
 *   1. real hyperlink annotations — exact, and what a deck exported with
 *      links will give you;
 *   2. failing that, URLs and phone numbers in the text layer, each with its
 *      own position (pdf.js keeps text runs separate, so the social icons map
 *      individually instead of collapsing into one wide box).
 */
const LINK_PATTERN =
  // Joined lines run URLs together ("...@NSVentureshttps://..."), so each
  // match has to stop as soon as the next scheme begins.
  /(https?:\/\/(?:(?!https?:\/\/)\S)+|www\.(?:(?!https?:\/\/)[^\s/])+\.[a-z]{2,}(?:\/(?:(?!https?:\/\/)\S)*)?|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s-]{8,}\d)/i

function toHref(raw) {
  const text = raw.trim().replace(/[.,)]+$/, '')
  if (/^https?:\/\//i.test(text)) return text
  if (/^www\./i.test(text)) return `https://${text}`
  if (text.includes('@')) return `mailto:${text}`
  return `tel:${text.replace(/[^\d+]/g, '')}`
}

function labelFor(href) {
  if (href.startsWith('tel:')) return 'Phone'
  if (href.startsWith('mailto:')) return 'Email'
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return 'Link'
  }
}

const pct = (value, total) => +((value / total) * 100).toFixed(2)

async function extractLinks() {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = getDocument({
    data: new Uint8Array(readFileSync(SOURCE)),
    isEvalSupported: false,
  })
  const doc = await loadingTask.promise

  const byPage = new Map()

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 1 })
    const { width: vw, height: vh } = viewport
    const links = []
    const seen = new Set()

    const push = (href, left, top, w, h) => {
      if (w <= 0 || h <= 0) return
      const key = `${href}@${Math.round(left)},${Math.round(top)}`
      if (seen.has(key)) return
      seen.add(key)
      links.push({
        href,
        label: labelFor(href),
        x: pct(left, vw),
        y: pct(top, vh),
        w: pct(w, vw),
        h: pct(h, vh),
      })
    }

    for (const a of await page.getAnnotations({ intent: 'display' })) {
      if (a.subtype !== 'Link' || !a.url || !a.rect) continue
      const [x1, y1] = viewport.convertToViewportPoint(a.rect[0], a.rect[1])
      const [x2, y2] = viewport.convertToViewportPoint(a.rect[2], a.rect[3])
      push(a.url, Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
    }

    if (links.length === 0) {
      const { items } = await page.getTextContent()

      /*
       * pdf.js splits runs wherever the PDF does — one link arrived as
       * "https:/" + "/youtu.be/...", so matching item by item missed it.
       * Rebuild each line, match against that, then map the match back to the
       * items it spans and union their boxes.
       */
      const lines = new Map()
      for (const item of items) {
        const text = item.str ?? ''
        if (!text || !item.transform) continue
        const baseline = Math.round(item.transform[5])
        const key = [...lines.keys()].find((k) => Math.abs(k - baseline) <= 3) ?? baseline
        if (!lines.has(key)) lines.set(key, [])
        lines.get(key).push(item)
      }

      const candidates = []
      for (const [, lineItems] of lines) {
        lineItems.sort((a, b) => a.transform[4] - b.transform[4])

        let text = ''
        const spans = []
        for (const item of lineItems) {
          spans.push({ from: text.length, to: text.length + item.str.length, item })
          text += item.str
        }

        for (const match of text.matchAll(new RegExp(LINK_PATTERN, 'gi'))) {
          const from = match.index
          const to = from + match[0].length
          const hit = spans.filter((s) => s.from < to && s.to > from).map((s) => s.item)
          if (!hit.length) continue

          const left = Math.min(...hit.map((it) => it.transform[4]))
          const right = Math.max(...hit.map((it) => it.transform[4] + (it.width ?? 0)))
          const h = Math.max(...hit.map((it) => it.height ?? 0))
          const topEdge = Math.min(...hit.map((it) => vh - it.transform[5] - (it.height ?? 0)))

          candidates.push({ href: toHref(match[0]), left, top: topEdge, w: right - left, h })
        }
      }

      /*
       * The social URLs sit in the text layer of every page, including ones
       * that don't draw the footer — on those they'd land on unrelated
       * artwork. Treat the footer as present only when the website and phone
       * (which are visible text) are both there.
       */
      const hasFooter =
        candidates.some((c) => c.href.startsWith('https://www.nsventures.in')) &&
        candidates.some((c) => c.href.startsWith('tel:'))

      for (const c of candidates) {
        const isFooterIcon =
          !c.href.startsWith('tel:') &&
          !c.href.includes('nsventures.in/') &&
          /youtube\.com|linkedin|instagram|facebook|pinterest/i.test(c.href)
        if (isFooterIcon && !hasFooter) continue
        push(c.href, c.left, c.top, c.w, c.h)
      }
    }

    if (links.length) byPage.set(i, links)
    page.cleanup()
  }

  await loadingTask.destroy()
  return byPage
}

const work = mkdtempSync(join(tmpdir(), 'commercial-pages-'))

try {
  execFileSync('pdftoppm', ['-png', '-r', '150', SOURCE, join(work, 'page')])

  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const rendered = readdirSync(work)
    .filter((f) => f.endsWith('.png'))
    .sort()

  let bytes = 0
  for (const file of rendered) {
    const n = file.match(/(\d+)/)[1]
    const info = await sharp(join(work, file))
      .resize({ width: WIDTH })
      .webp({ quality: 82 })
      .toFile(join(OUT_DIR, `page-${n}.webp`))
    bytes += info.size
  }

  const links = await extractLinks()

  const entries = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.webp'))
    .sort()
    .map((file, i) => {
      const pageLinks = links.get(i + 1) ?? []
      const rendered = pageLinks
        .map(
          (l) =>
            `      { href: ${JSON.stringify(l.href)}, label: ${JSON.stringify(l.label)}, x: ${l.x}, y: ${l.y}, w: ${l.w}, h: ${l.h} },`,
        )
        .join('\n')
      return [
        '  {',
        '    src: `${import.meta.env.BASE_URL}commercial/' + file + '`,',
        pageLinks.length ? `    links: [\n${rendered}\n    ],` : '    links: [],',
        '  },',
      ].join('\n')
    })
    .join('\n')

  writeFileSync(
    MANIFEST,
    `/**
 * Commercial deck pages, rendered from the source PDF, with the URLs and phone
 * numbers found in its text layer as overlay hotspots.
 * Regenerate with: node scripts/build-commercial-pages.mjs
 */
export interface CommercialLink {
  href: string
  label: string
  /** Percentages of the page image, so overlays scale with it. */
  x: number
  y: number
  w: number
  h: number
}

export interface CommercialPage {
  src: string
  links: CommercialLink[]
}

export const COMMERCIAL_PAGES: CommercialPage[] = [
${entries}
]
`,
  )

  const linkCount = [...links.values()].reduce((a, l) => a + l.length, 0)
  console.log(
    `${rendered.length} pages → ${OUT_DIR} (${Math.round(bytes / 1024)} KB), ${linkCount} links`,
  )
} finally {
  rmSync(work, { recursive: true, force: true })
}
