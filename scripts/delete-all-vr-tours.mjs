/**
 * Delete portfolio virtual tours (DB rows) and their thumbnails.
 *
 * Usage:
 *   node --env-file=.env.local scripts/delete-all-vr-tours.mjs
 *     → deletes all virtual-tour rows + their thumbnails only
 *
 *   node --env-file=.env.local scripts/delete-all-vr-tours.mjs --orphans-only
 *     → removes storage files not linked in DB
 */
import { createClient } from '@supabase/supabase-js'

const orphansOnly = process.argv.includes('--orphans-only')

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

async function listAllStorageFiles() {
  const files = []
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await admin.storage.from('tour-thumbs').list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) throw new Error(error.message)
    if (!data?.length) break

    for (const file of data) {
      if (file.id) files.push(file.name)
    }

    if (data.length < limit) break
    offset += limit
  }

  return files
}

async function deleteStoragePaths(paths) {
  if (!paths.length) return 0

  const chunkSize = 100
  let removed = 0

  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize)
    const { error } = await admin.storage.from('tour-thumbs').remove(chunk)
    if (error) throw new Error(error.message)
    removed += chunk.length
  }

  return removed
}

async function cleanupOrphanThumbnails() {
  const { data: items, error } = await admin
    .from('portfolio_items')
    .select('thumbnail_path')

  if (error) throw new Error(error.message)

  const inUse = new Set(
    (items ?? [])
      .map((item) => normalizeThumbPath(item.thumbnail_path))
      .filter(Boolean),
  )

  const allFiles = await listAllStorageFiles()
  const orphans = allFiles.filter((name) => !inUse.has(name))

  if (!orphans.length) {
    console.log('No orphan thumbnails in storage.')
    return 0
  }

  const removed = await deleteStoragePaths(orphans)
  console.log(`Removed ${removed} orphan thumbnail(s) from storage.`)
  return removed
}

async function deleteAllVirtualTours() {
  const { data: tours, error } = await admin
    .from('portfolio_items')
    .select('id, name, thumbnail_path')
    .eq('media_type', 'virtual-tour')

  if (error) throw new Error(error.message)

  if (!tours?.length) {
    console.log('No virtual tours in database.')
    return
  }

  console.log(`Found ${tours.length} virtual tour(s). Deleting…`)

  const thumbPaths = tours
    .map((tour) => normalizeThumbPath(tour.thumbnail_path))
    .filter(Boolean)

  if (thumbPaths.length > 0) {
    try {
      const removed = await deleteStoragePaths(thumbPaths)
      console.log(`Removed ${removed} virtual tour thumbnail(s) from storage.`)
    } catch (err) {
      console.warn('Storage cleanup warning:', err.message)
    }
  }

  const { error: deleteError } = await admin
    .from('portfolio_items')
    .delete()
    .eq('media_type', 'virtual-tour')

  if (deleteError) throw new Error(deleteError.message)

  console.log(`Deleted ${tours.length} virtual tour(s) from portfolio_items.`)
}

try {
  if (!orphansOnly) {
    await deleteAllVirtualTours()
  }
  await cleanupOrphanThumbnails()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}

console.log('Done.')
