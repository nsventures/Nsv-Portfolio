#!/usr/bin/env node
/**
 * Turns every PNG/JPEG dropped into public/Client Logos/ into a normalised
 * WebP beside it. The shipped set is WebP only; originals aren't kept.
 *
 *   node scripts/optimize-client-logos.mjs
 *
 * Each one is trimmed of its own whitespace, scaled to a consistent size, then
 * centred on the same 368x160 white canvas the original set uses. Trimming
 * first matters: a square source padded into a 2.3:1 canvas ends up padded
 * twice and renders visibly smaller than its neighbours. Run this after adding
 * logos, then `node scripts/build-client-logos.mjs`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'

const DIR = 'public/Client Logos'
const WIDTH = 368
const HEIGHT = 160
/*
 * How much of the canvas the artwork may occupy.
 *
 * Wide wordmarks are limited by width. Logos that are blocky (wide *and* tall)
 * would otherwise fill most of the slot and tower over their neighbours, so
 * they keep the standard cap. Only genuinely portrait marks — stacked
 * lockups whose text would otherwise be squeezed twice — get the extra height.
 */
const FILL_W = 0.85
const FILL_H = 0.85
const PORTRAIT_FILL_H = 0.96
/** Trimmed width/height below this counts as portrait. */
const PORTRAIT_RATIO = 1.1
const QUALITY = 85

const pngs = readdirSync(DIR).filter((f) => /\.(png|jpe?g)$/i.test(f))

if (pngs.length === 0) {
  console.log(`No PNG/JPEG to convert in ${DIR} — the set is already WebP.`)
  process.exit(0)
}

let updated = 0
let before = 0
let after = 0

for (const file of pngs) {
  const src = join(DIR, file)
  const out = src.replace(/\.(png|jpe?g)$/i, '.webp')

  const white = { r: 255, g: 255, b: 255, alpha: 1 }

  // Trim the logo's own padding so every mark scales from its real bounds.
  let trimmed
  try {
    trimmed = await sharp(src).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).toBuffer()
  } catch {
    trimmed = await sharp(src).flatten({ background: '#ffffff' }).toBuffer()
  }

  // Scale the artwork to the target size, then pad out to the canvas. Padding
  // with extend (not a second resize) is what keeps FILL meaningful.
  const { width: tw = 1, height: th = 1 } = await sharp(trimmed).metadata()
  const fillH = tw / th < PORTRAIT_RATIO ? PORTRAIT_FILL_H : FILL_H

  const scaled = await sharp(trimmed)
    .resize(Math.round(WIDTH * FILL_W), Math.round(HEIGHT * fillH), { fit: 'inside' })
    .toBuffer({ resolveWithObject: true })

  const left = Math.max(0, Math.round((WIDTH - scaled.info.width) / 2))
  const top = Math.max(0, Math.round((HEIGHT - scaled.info.height) / 2))

  const buffer = await sharp(scaled.data)
    .extend({
      left,
      top,
      right: Math.max(0, WIDTH - scaled.info.width - left),
      bottom: Math.max(0, HEIGHT - scaled.info.height - top),
      background: white,
    })
    .flatten({ background: '#ffffff' })
    .webp({ quality: QUALITY })
    .toBuffer()

  let existing = null
  try {
    existing = readFileSync(out)
  } catch {
    // first run for this logo
  }

  before += statSync(src).size
  after += buffer.length

  if (!existing || !existing.equals(buffer)) {
    writeFileSync(out, buffer)
    updated++
  }
}

console.log(
  `${pngs.length} PNG -> WebP at ${WIDTH}x${HEIGHT} · ${updated} written · ` +
    `${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`,
)
