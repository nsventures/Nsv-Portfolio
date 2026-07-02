/**
 * Parse matrix-style "VR LINKS" CSV → flat data/tours.csv
 *
 * Usage: npm run parse:tours
 *        npm run parse:tours -- --file="VR LINKS FOR WEBSITE .csv"
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const INPUT =
  process.argv.find((a) => a.startsWith('--file='))?.slice(7) ??
  join(ROOT, 'VR LINKS FOR WEBSITE .csv')

const OUT = join(ROOT, 'data/tours.csv')

const CITY_HINTS = [
  ['delhi', 'Delhi NCR'],
  ['gurugram', 'Gurgaon'],
  ['gurgaon', 'Gurgaon'],
  ['noida', 'Noida'],
  ['mumbai', 'Mumbai'],
  ['thane', 'Thane'],
  ['pune', 'Pune'],
  ['bengaluru', 'Bangalore'],
  ['bangalore', 'Bangalore'],
  ['hyderabad', 'Hyderabad'],
  ['chennai', 'Chennai'],
  ['kolkata', 'Kolkata'],
  ['ahmedabad', 'Ahmedabad'],
  ['jaipur', 'Jaipur'],
  ['goa', 'Goa'],
  ['mohali', 'Mohali'],
  ['kasauli', 'Kasauli'],
  ['faridabad', 'Faridabad'],
  ['ghaziabad', 'Noida'],
  ['sonipat', 'Delhi NCR'],
  ['raipur', 'Raipur'],
  ['bhubneshwar', 'Bhubaneswar'],
  ['bubneshwar', 'Bhubaneswar'],
  ['cuttuck', 'Kolkata'],
  ['cuttack', 'Kolkata'],
  ['meerut', 'Delhi NCR'],
  ['aligarh', 'Delhi NCR'],
  ['surat', 'Surat'],
  ['walkeshwar', 'Mumbai'],
  ['jhajjar', 'Delhi NCR'],
  ['vasav', 'Mumbai'],
  ['joyville', 'Kolkata'],
  ['catriona', 'Gurgaon'],
]

function normalizeUrl(raw) {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('http')) return null
  try {
    const u = new URL(trimmed)
    return u.toString().replace(/\/$/, '') + '/'
  } catch {
    return null
  }
}

function nameFromUrl(url) {
  const path = new URL(url).pathname.replace(/^\/|\/$/g, '')
  return path
    .replace(/[-_]?NSV$/i, '')
    .replace(/[-_]?NS_Ventures$/i, '')
    .replace(/[-_]?NS-Ventures$/i, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferCity(url) {
  const hay = url.toLowerCase()
  for (const [hint, city] of CITY_HINTS) {
    if (hay.includes(hint)) return city
  }
  return 'Unknown'
}

function normalizeCityLabel(label) {
  const city = label.trim()
  const map = {
    Delhi: 'Delhi NCR',
    Bengaluru: 'Bangalore',
    Gurugram: 'Gurgaon',
    Bubneshwar: 'Bhubaneswar',
    Cuttuck: 'Kolkata',
  }
  return map[city] ?? city
}

function parseMatrixCsv(text) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((c) => c.trim()))

  const byUrl = new Map()
  let section = 'category'

  for (const row of rows) {
    const label = row[0]?.trim()
    if (!label) continue

    const lower = label.toLowerCase()
    if (lower === 'cities') {
      section = 'city'
      continue
    }
    if (lower === 'catgories' || lower === 'categories') continue

    const urls = row.slice(1).map(normalizeUrl).filter(Boolean)

    for (const link of urls) {
      const entry = {
        link,
        name: nameFromUrl(link),
        city: section === 'city' ? normalizeCityLabel(label) : inferCity(link),
      }

      const existing = byUrl.get(link)
      if (!existing) {
        byUrl.set(link, entry)
      } else if (section === 'city') {
        byUrl.set(link, { ...existing, city: entry.city })
      }
    }
  }

  return [...byUrl.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function toCsv(entries) {
  const lines = ['link,city,name', ...entries.map((e) => `"${e.link}","${e.city}","${e.name}"`)]
  return lines.join('\n') + '\n'
}

function main() {
  if (!existsSync(INPUT)) {
    console.error(`File not found: ${INPUT}`)
    process.exit(1)
  }

  const entries = parseMatrixCsv(readFileSync(INPUT, 'utf8'))
  writeFileSync(OUT, toCsv(entries))

  console.log(`\nParsed ${entries.length} tours → ${OUT}`)
  console.log('Run: npm run import:tours\n')
}

main()
