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
]

const key = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Collapses "Brand", "BRAND" and "Brand-3" onto one key. */
const brandKey = (name) => key(name.replace(/[-\s]*\d+$/, ''))

const all = readdirSync(DIR)
  .filter((f) => /\.(webp|png|jpe?g|svg)$/i.test(f))
  .sort((a, b) => a.length - b.length || a.localeCompare(b))

// One entry per brand — the shortest name wins, so "Brand" beats "Brand-3".
const seen = new Map()
const dropped = []
for (const f of all) {
  const k = brandKey(f.replace(/\.[^.]+$/, ''))
  if (seen.has(k)) dropped.push(f)
  else seen.set(k, f)
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
const rest = files.filter((f) => !featuredSet.has(f))

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
if (dropped.length) {
  console.log(`skipped ${dropped.length} duplicate${dropped.length === 1 ? '' : 's'}: ${dropped.join(', ')}`)
}
if (missing.length) console.log(`no logo file for: ${missing.join(', ')}`)
