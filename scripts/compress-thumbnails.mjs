/**
 * Compress all portfolio thumbnails in Supabase storage to optimized WebP.
 *
 * Usage:
 *   node --env-file=.env.local scripts/compress-thumbnails.mjs --dry-run
 *   node --env-file=.env.local scripts/compress-thumbnails.mjs
 *
 * Options:
 *   --dry-run   Report savings without uploading or updating the database
 *   --id=foo    Process a single portfolio item id only
 */
import { createClient } from '@supabase/supabase-js'
import {
  compressThumbnailBuffer,
  thumbStoragePath,
} from './lib/compress-thumbnail.mjs'

const dryRun = process.argv.includes('--dry-run')
const singleId = process.argv.find((arg) => arg.startsWith('--id='))?.split('=')[1]

const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(
  /\/$/,
  '',
)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL in .env.local')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey)

function normalizeThumbPath(path) {
  return path?.replace(/^\/+/, '').replace(/^tour-thumbs\//, '') ?? ''
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function compressOne(item) {
  const oldPath = normalizeThumbPath(item.thumbnail_path)
  if (!oldPath) {
    return { id: item.id, skipped: true, reason: 'no thumbnail_path' }
  }

  const newPath = thumbStoragePath(item.id)

  const { data, error } = await admin.storage.from('tour-thumbs').download(oldPath)
  if (error || !data) {
    return { id: item.id, error: `download failed: ${error?.message ?? 'no data'}` }
  }

  const input = Buffer.from(await data.arrayBuffer())
  const compressed = await compressThumbnailBuffer(input)
  const savings = input.length - compressed.length
  const savingsPct = input.length > 0 ? Math.round((savings / input.length) * 100) : 0

  if (savings <= 0) {
    return {
      id: item.id,
      skipped: true,
      reason: `already optimal (${formatBytes(input.length)})`,
      oldPath,
    }
  }

  if (dryRun) {
    return {
      id: item.id,
      dryRun: true,
      oldPath,
      newPath,
      before: input.length,
      after: compressed.length,
      savings,
      savingsPct,
    }
  }

  const { error: upError } = await admin.storage.from('tour-thumbs').upload(newPath, compressed, {
    contentType: 'image/webp',
    upsert: true,
  })
  if (upError) {
    return { id: item.id, error: `upload failed: ${upError.message}` }
  }

  if (oldPath !== newPath) {
    const { error: rmError } = await admin.storage.from('tour-thumbs').remove([oldPath])
    if (rmError) {
      console.warn(`  [${item.id}] Could not remove old file ${oldPath}: ${rmError.message}`)
    }
  }

  if (item.thumbnail_path !== newPath) {
    const { error: dbError } = await admin
      .from('portfolio_items')
      .update({ thumbnail_path: newPath })
      .eq('id', item.id)
    if (dbError) {
      return { id: item.id, error: `db update failed: ${dbError.message}` }
    }
  }

  return {
    id: item.id,
    ok: true,
    oldPath,
    newPath,
    before: input.length,
    after: compressed.length,
    savings,
    savingsPct,
  }
}

async function main() {
  let query = admin
    .from('portfolio_items')
    .select('id, thumbnail_path')
    .not('thumbnail_path', 'is', null)
    .order('id')

  if (singleId) {
    query = query.eq('id', singleId)
  }

  const { data: items, error } = await query
  if (error) throw new Error(error.message)

  if (!items?.length) {
    console.log('No portfolio items with thumbnails found.')
    return
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Compressing ${items.length} thumbnail(s) to WebP…\n`,
  )

  let ok = 0
  let failed = 0
  let skipped = 0
  let totalBefore = 0
  let totalAfter = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    process.stdout.write(`[${i + 1}/${items.length}] ${item.id} … `)

    try {
      const result = await compressOne(item)

      if (result.skipped) {
        skipped++
        console.log(`skipped (${result.reason})`)
        continue
      }

      if (result.error) {
        failed++
        console.log(`error — ${result.error}`)
        continue
      }

      ok++
      totalBefore += result.before
      totalAfter += result.after
      const label = dryRun ? 'would save' : 'saved'
      console.log(
        `${label} ${formatBytes(result.savings)} (${result.savingsPct}%) — ${formatBytes(result.before)} → ${formatBytes(result.after)}`,
      )
    } catch (err) {
      failed++
      console.log(`error — ${err.message}`)
    }
  }

  const totalSavings = totalBefore - totalAfter
  const totalPct = totalBefore > 0 ? Math.round((totalSavings / totalBefore) * 100) : 0

  console.log('\n--- Summary ---')
  console.log(`Processed: ${ok}`)
  console.log(`Failed:    ${failed}`)
  console.log(`Skipped:   ${skipped}`)
  if (ok > 0) {
    console.log(
      `Total:     ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (${totalPct}% ${dryRun ? 'would be saved' : 'saved'})`,
    )
  }
  if (dryRun) {
    console.log('\nRe-run without --dry-run to apply changes.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
