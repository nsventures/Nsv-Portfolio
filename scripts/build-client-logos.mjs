#!/usr/bin/env node
/**
 * Regenerates src/data/clientLogos.ts from public/Client Logos/.
 *
 *   node scripts/build-client-logos.mjs
 *
 * FEATURED names go in the marquee's top row at a larger size; everything else
 * fills the second row. Match is on the file name, case/spacing-insensitive.
 */
import { readdirSync, writeFileSync } from 'node:fs'

const DIR = 'public/Client Logos'
const OUT = 'src/data/clientLogos.ts'

/** Exactly the brands asked for, in the order they should appear. */
const FEATURED = [
  'PURAVANKARA',
  'DLF',
  'Godrej Properties',
  'Emaar',
  'Prestige Group',
  'M3M',
  'DAMAC',
  'Lodha',
  'Shapoorji Pallonji',
  'Sobha Realty',
  'Tata Housing',
  'Purva',
  'House of Hiranandani',
  'Hero Realty',
  'Omaxe',
  'Provident',
  'Reliance Infrastructure',
  'EXPERION',
  'Birla Estates',
  'Central Park',
  'SMART WORLD',
  'Brigade Group',
  'Eldeco',
  'Eros Group',
  'Square Yards',
  'Housing.com',
  'REA Group',
  '99acres',
  'Magicbricks',
  'Bestech',
  'L&T Realty',
  'Sushma',
  'GHP Group',
  'American Express',
  'Urbanrise',
  'Unity Group',
  'Sunteck',
  'Shriram Properties',
  'ANAROCK',
]

const key = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Collapses "Brand", "BRAND" and "Brand-3" onto one key. */
const brandKey = (name) => key(name.replace(/[-\s]*\d+$/, ''))

/** WebP first: a .webp next to a .png is the optimised copy of it. */
const rank = (f) => (/\.webp$/i.test(f) ? 0 : 1)

const all = readdirSync(DIR)
  .filter((f) => /\.(webp|png|jpe?g|svg)$/i.test(f))
  .sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.length - b.length ||
      a.localeCompare(b),
  )

// One entry per brand — the shortest name wins, so "Brand" beats "Brand-3".
const seen = new Map()
const dropped = []
const superseded = []
for (const f of all) {
  const k = brandKey(f.replace(/\.[^.]+$/, ''))
  if (!seen.has(k)) {
    seen.set(k, f)
    continue
  }
  // A .png whose .webp we already took is just the unoptimised original.
  const kept = seen.get(k)
  const sameName = kept.replace(/\.[^.]+$/, '') === f.replace(/\.[^.]+$/, '')
  if (sameName && /\.png$/i.test(f)) superseded.push(f)
  else dropped.push(f)
}

const files = [...seen.values()].sort()

const byKey = new Map(files.map((f) => [key(f.replace(/\.[^.]+$/, '')), f]))

const featuredFiles = []
const missing = []
for (const name of FEATURED) {
  const file = byKey.get(key(name))
  if (file) featuredFiles.push(file)
  else missing.push(name)
}

const featuredSet = new Set(featuredFiles)

/**
 * Alphabetical order parks same-brand logos next to each other — the three
 * Suraksha projects, four Homelands and so on all scrolled past as a clump.
 * Deal one from each brand in rotation so they end up spread across the row.
 */
function spreadByBrand(list) {
  const groups = new Map()
  for (const file of list) {
    const first = file.replace(/\.[^.]+$/, '').split(/[\s–-]+/)[0].toLowerCase()
    if (!groups.has(first)) groups.set(first, [])
    groups.get(first).push(file)
  }

  // Biggest families first, so their members get the widest spacing.
  const queues = [...groups.values()].sort((a, b) => b.length - a.length)
  const out = []
  let moved = true
  while (moved) {
    moved = false
    for (const q of queues) {
      const next = q.shift()
      if (next) {
        out.push(next)
        moved = true
      }
    }
  }
  // The row is rendered twice to loop, so its last and first logos sit side by
  // side at the seam. Rotate until those two come from different brands.
  const brandOf = (f) => f.replace(/\.[^.]+$/, '').split(/[\s–-]+/)[0].toLowerCase()
  for (let i = 0; i < out.length && brandOf(out[0]) === brandOf(out[out.length - 1]); i++) {
    out.push(out.shift())
  }

  return out
}

const rest = spreadByBrand(files.filter((f) => !featuredSet.has(f)))

const row = (file) => {
  const name = file.replace(/\.[^.]+$/, '')
  return `  { name: ${JSON.stringify(name)}, file: ${JSON.stringify(file)} },`
}

writeFileSync(
  OUT,
  `/**
 * Logos live in \`public/Client Logos/\` — names carry spaces, so encode at use.
 * Regenerate with: node scripts/build-client-logos.mjs
 */
export interface ClientLogo {
  name: string
  file: string
}

/** Major builders — the marquee's top row, shown larger. */
export const FEATURED_CLIENT_LOGOS: ClientLogo[] = [
${featuredFiles.map(row).join('\n')}
]

/** Everything else — the second row. */
export const OTHER_CLIENT_LOGOS: ClientLogo[] = [
${rest.map(row).join('\n')}
]

export const CLIENT_LOGOS: ClientLogo[] = [
  ...FEATURED_CLIENT_LOGOS,
  ...OTHER_CLIENT_LOGOS,
]

export function clientLogoSrc(file: string): string {
  return encodeURI(\`\${import.meta.env.BASE_URL}Client Logos/\${file}\`)
}
`,
)

console.log(`featured: ${featuredFiles.length} · other: ${rest.length} · total: ${files.length}`)
if (superseded.length) {
  console.log(`${superseded.length} PNG original(s) superseded by their WebP copy`)
}
if (dropped.length) {
  console.log(`skipped ${dropped.length} duplicate${dropped.length === 1 ? '' : 's'}: ${dropped.join(', ')}`)
}
if (missing.length) console.log(`no logo file for: ${missing.join(', ')}`)
