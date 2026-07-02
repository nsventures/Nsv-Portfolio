/**
 * Backfill video_published_at for existing YouTube portfolio items.
 *
 *   npm run backfill:youtube-dates
 */
import { createClient } from '@supabase/supabase-js'
import { fetchYoutubeMetadata } from './lib/youtube-metadata.mjs'

const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey)

const { data: items, error } = await admin
  .from('portfolio_items')
  .select('id, name, link')
  .eq('media_type', 'video')
  .is('video_published_at', null)

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`Backfilling ${items?.length ?? 0} videos…\n`)

let updated = 0
let failed = 0

for (const item of items ?? []) {
  try {
    const { publishedAt } = await fetchYoutubeMetadata(item.link)
    const { error: updateError } = await admin
      .from('portfolio_items')
      .update({ video_published_at: publishedAt })
      .eq('id', item.id)

    if (updateError) throw new Error(updateError.message)
    updated++
    console.log(`✓ ${item.name} → ${publishedAt}`)
  } catch (err) {
    failed++
    console.warn(`✗ ${item.name}: ${err.message}`)
  }
}

console.log(`\nDone. Updated ${updated}, failed ${failed}.`)
