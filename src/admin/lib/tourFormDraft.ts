import type { TourFormValues } from '../types'

const NEW_TOUR_DRAFT_KEY = 'admin-tour-form:new'

function editDraftKey(id: string) {
  return `admin-tour-form:edit:${id}`
}

export function getTourFormDraftKey(isEdit: boolean, id?: string) {
  return isEdit && id ? editDraftKey(id) : NEW_TOUR_DRAFT_KEY
}

export function readTourFormDraft(key: string): TourFormValues | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TourFormValues> & { city_id?: string }
    if (!parsed || typeof parsed !== 'object') return null
    return {
      id: parsed.id ?? '',
      name: parsed.name ?? '',
      link: parsed.link ?? '',
      state: parsed.state ?? '',
      builder_name: parsed.builder_name ?? '',
      project_name: parsed.project_name ?? parsed.name ?? '',
      city_label: parsed.city_label ?? '',
      media_type: parsed.media_type === 'video' ? 'video' : 'virtual-tour',
      is_published: parsed.is_published ?? true,
      sort_order: parsed.sort_order ?? 0,
    }
  } catch {
    return null
  }
}

export function writeTourFormDraft(key: string, form: TourFormValues) {
  try {
    localStorage.setItem(key, JSON.stringify(form))
  } catch {
    // ignore quota / private mode
  }
}

export function clearTourFormDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function hasTourFormDraftContent(form: TourFormValues) {
  return Boolean(
    form.project_name.trim() ||
      form.link.trim() ||
      form.id.trim() ||
      form.state.trim() ||
      form.builder_name.trim() ||
      form.city_label.trim(),
  )
}
