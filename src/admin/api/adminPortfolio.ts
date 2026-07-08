import { slugify } from '../../lib/utils'
import { compressThumbnailFile } from '../../lib/compressThumbnail'
import { thumbStoragePath } from '../../lib/portfolioMedia'
import { getSupabase } from '../../lib/supabase'
import { canonicalCityName } from '../lib/cityNames'
import type {
  CityRow,
  CityWithCount,
  PortfolioItemRow,
  PortfolioStats,
} from '../types'

export async function fetchAdminCities(): Promise<CityRow[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cities')
    .select('id, name, state, sort_order, is_active')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as CityRow[]
}

/** All cities for admin filters (includes hidden cities assigned to tours). */
export async function fetchAdminFilterCities(): Promise<CityWithCount[]> {
  return fetchAllAdminCities()
}

async function findCityByName(name: string): Promise<CityRow | null> {
  const supabase = getSupabase()
  const canonical = canonicalCityName(name)

  for (const candidate of [canonical, name.trim()]) {
    if (!candidate) continue
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, state, sort_order, is_active')
      .ilike('name', candidate)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) return data as CityRow
  }

  return null
}

export async function createCity(name: string, state: string): Promise<CityRow> {
  const supabase = getSupabase()
  const trimmed = name.trim()
  const trimmedState = state.trim()
  if (!trimmed) throw new Error('City name is required')
  if (!trimmedState) throw new Error('State is required')

  const displayName = canonicalCityName(trimmed)
  const existing = await findCityByName(displayName)
  if (existing) return existing

  const { data: lastCity, error: sortError } = await supabase
    .from('cities')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sortError) throw new Error(sortError.message)

  const { data, error } = await supabase
    .from('cities')
    .insert({
      name: displayName,
      state: trimmedState,
      sort_order: (lastCity?.sort_order ?? 0) + 1,
      is_active: true,
    })
    .select('id, name, state, sort_order, is_active')
    .single()

  if (error) throw new Error(error.message)
  return data as CityRow
}

export async function updateCityState(id: string, state: string): Promise<void> {
  const supabase = getSupabase()
  const trimmedState = state.trim()
  if (!trimmedState) throw new Error('State is required')

  const { error } = await supabase.from('cities').update({ state: trimmedState }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchAdminTours(): Promise<PortfolioItemRow[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*, cities(name)')
    .order('sort_order')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as PortfolioItemRow[]
}

export async function fetchAdminTour(id: string): Promise<PortfolioItemRow | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*, cities(name)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as PortfolioItemRow | null
}

export async function fetchPortfolioStats(): Promise<PortfolioStats> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('media_type, is_published')

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Pick<PortfolioItemRow, 'media_type' | 'is_published'>[]
  return {
    total: rows.length,
    videos: rows.filter((r) => r.media_type === 'video').length,
    virtualTours: rows.filter((r) => r.media_type === 'virtual-tour').length,
    published: rows.filter((r) => r.is_published).length,
  }
}

export async function createTour(
  item: Omit<PortfolioItemRow, 'created_at' | 'updated_at' | 'cities'>,
): Promise<string> {
  const supabase = getSupabase()
  const baseId = slugify(item.id.trim()) || 'tour'
  const id = await uniqueTourId(baseId)

  const { error } = await supabase.from('portfolio_items').insert({ ...item, id })
  if (error) {
    if (error.message.includes('portfolio_items_pkey') || error.code === '23505') {
      throw new Error(
        `A tour with ID "${id}" already exists. Change the URL slug or edit the existing item.`,
      )
    }
    throw new Error(error.message)
  }

  return id
}

export async function updateTour(
  id: string,
  item: Partial<Omit<PortfolioItemRow, 'id' | 'created_at' | 'updated_at' | 'cities'>>,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('portfolio_items').update(item).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTour(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('portfolio_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadTourThumbnail(
  id: string,
  file: File,
  previousPath?: string | null,
): Promise<string> {
  const supabase = getSupabase()
  const compressed = await compressThumbnailFile(file, thumbStoragePath(id))
  const path = thumbStoragePath(id)

  const { error } = await supabase.storage.from('tour-thumbs').upload(path, compressed, {
    upsert: true,
    contentType: 'image/webp',
  })

  if (error) throw new Error(error.message)

  if (previousPath && previousPath !== path) {
    try {
      await deleteTourThumbnail(previousPath)
    } catch {
      // ignore cleanup errors
    }
  }

  return path
}

export async function deleteTourThumbnail(path: string): Promise<void> {
  const supabase = getSupabase()
  const normalized = path.replace(/^\/+/, '').replace(/^tour-thumbs\//, '')
  if (!normalized) return
  await supabase.storage.from('tour-thumbs').remove([normalized])
}

export async function fetchAllAdminCities(): Promise<CityWithCount[]> {
  const supabase = getSupabase()
  const [{ data: cities, error: citiesError }, { data: tours, error: toursError }] =
    await Promise.all([
      supabase
        .from('cities')
        .select('id, name, state, sort_order, is_active')
        .order('sort_order')
        .order('name'),
      supabase.from('portfolio_items').select('city_id'),
    ])

  if (citiesError) throw new Error(citiesError.message)
  if (toursError) throw new Error(toursError.message)

  const counts: Record<string, number> = {}
  for (const row of tours ?? []) {
    if (row.city_id) counts[row.city_id] = (counts[row.city_id] ?? 0) + 1
  }

  return ((cities ?? []) as CityRow[]).map((city) => ({
    ...city,
    tour_count: counts[city.id] ?? 0,
  }))
}

export async function setCityActive(id: string, isActive: boolean): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('cities').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCity(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('cities').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Move all tours from one city to another, then delete the source city. */
export async function mergeCities(sourceId: string, targetId: string): Promise<number> {
  if (sourceId === targetId) throw new Error('Choose a different city to merge into')

  const supabase = getSupabase()

  const { data: tours, error: fetchError } = await supabase
    .from('portfolio_items')
    .select('id')
    .eq('city_id', sourceId)

  if (fetchError) throw new Error(fetchError.message)

  if (tours?.length) {
    const { error: updateError } = await supabase
      .from('portfolio_items')
      .update({ city_id: targetId })
      .eq('city_id', sourceId)

    if (updateError) throw new Error(updateError.message)
  }

  await deleteCity(sourceId)
  return tours?.length ?? 0
}

export async function reorderTours(orderedIds: string[]): Promise<void> {
  const supabase = getSupabase()
  const updates = orderedIds.map((id, index) =>
    supabase.from('portfolio_items').update({ sort_order: index }).eq('id', id),
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
}

async function uniqueTourId(base: string): Promise<string> {
  let candidate = base
  let n = 2
  while (await fetchAdminTour(candidate)) {
    candidate = `${base}-${n}`
    n++
  }
  return candidate
}

export async function duplicateTour(id: string): Promise<string> {
  const tour = await fetchAdminTour(id)
  if (!tour) throw new Error('Tour not found')

  const baseId = slugify(`${tour.id}-copy`)
  const newId = await uniqueTourId(baseId)
  const supabase = getSupabase()

  let thumbnailPath: string | null = null
  if (tour.thumbnail_path) {
    const normalized = tour.thumbnail_path.replace(/^\/+/, '').replace(/^tour-thumbs\//, '')
    const newPath = thumbStoragePath(newId)
    const { data: blob, error: dlError } = await supabase.storage
      .from('tour-thumbs')
      .download(normalized)

    if (blob && !dlError) {
      const compressed = await compressThumbnailFile(blob, newPath)
      const { error: upError } = await supabase.storage
        .from('tour-thumbs')
        .upload(newPath, compressed, { upsert: true, contentType: 'image/webp' })
      if (!upError) thumbnailPath = newPath
    }
  }

  const { data: last } = await supabase
    .from('portfolio_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  await createTour({
    id: newId,
    name: `${tour.project_name?.trim() || tour.name} (Copy)`,
    link: tour.link,
    thumbnail_path: thumbnailPath,
    city_id: null,
    state: tour.state,
    builder_name: tour.builder_name,
    project_name: tour.project_name?.trim() || tour.name,
    city_label: tour.city_label,
    media_type: tour.media_type,
    category: tour.category,
    is_published: false,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  return newId
}
