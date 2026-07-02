import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'

import { getPortfolioThumbnail } from '../../lib/portfolioMedia'
import { inferMediaTypeFromLink } from '../../lib/portfolioLink'
import { slugify } from '../../lib/utils'
import {
  createTour,
  deleteTourThumbnail,
  fetchAdminTour,
  updateTour,
  uploadTourThumbnail,
} from '../api/adminPortfolio'
import { AdminCard, AdminPageHeader } from '../components/AdminLayout'
import { INDIAN_STATES } from '../../data/indianStates'
import {
  clearTourFormDraft,
  getTourFormDraftKey,
  hasTourFormDraftContent,
  readTourFormDraft,
  writeTourFormDraft,
} from '../lib/tourFormDraft'
import type { TourFormValues } from '../types'

const emptyForm: TourFormValues = {
  id: '',
  name: '',
  link: '',
  state: '',
  builder_name: '',
  project_name: '',
  city_label: '',
  media_type: 'virtual-tour',
  is_published: true,
  sort_order: 0,
}

export function TourFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const draftKey = getTourFormDraftKey(isEdit, id)
  const skipNextSave = useRef(true)
  const serverLoaded = useRef(false)

  const [form, setForm] = useState<TourFormValues>(() => {
    if (isEdit) return emptyForm
    return readTourFormDraft(draftKey) ?? emptyForm
  })
  const [existingCategory, setExistingCategory] = useState<string | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [existingThumb, setExistingThumb] = useState<string | null>(null)
  const [thumbCacheKey, setThumbCacheKey] = useState(0)
  const [thumbUploading, setThumbUploading] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idTouched, setIdTouched] = useState(() => {
    if (isEdit) return true
    const draft = readTourFormDraft(draftKey)
    return Boolean(draft?.id)
  })

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    if (isEdit && !serverLoaded.current) return
    if (!hasTourFormDraftContent(form) && !isEdit) {
      clearTourFormDraft(draftKey)
      return
    }
    writeTourFormDraft(draftKey, form)
  }, [draftKey, form, isEdit])

  useEffect(() => {
    const persist = () => {
      if (!hasTourFormDraftContent(form) && !isEdit) return
      if (isEdit && !serverLoaded.current) return
      writeTourFormDraft(draftKey, form)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist()
    }

    window.addEventListener('pagehide', persist)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', persist)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [draftKey, form, isEdit])

  useEffect(() => {
    if (!isEdit || !id) return

    setLoading(true)
    fetchAdminTour(id)
      .then((tour) => {
        if (!tour) {
          setError('Tour not found')
          return
        }

        const draft = readTourFormDraft(draftKey)
        const link = draft?.link?.trim() || tour.link
        const loaded = {
          id: tour.id,
          name: tour.name,
          link: tour.link,
          state: tour.state ?? '',
          builder_name: tour.builder_name ?? '',
          project_name: tour.project_name?.trim() || tour.name,
          city_label: tour.city_label ?? tour.cities?.name ?? '',
          media_type: inferMediaTypeFromLink(link),
          is_published: tour.is_published,
          sort_order: tour.sort_order,
        }

        serverLoaded.current = true
        setExistingCategory(tour.category)
        setForm(
          draft && hasTourFormDraftContent(draft)
            ? { ...draft, media_type: inferMediaTypeFromLink(draft.link || tour.link) }
            : loaded,
        )
        setExistingThumb(tour.thumbnail_path)
        setIdTouched(true)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tour'))
      .finally(() => setLoading(false))
  }, [draftKey, id, isEdit])

  useEffect(() => {
    if (!thumbFile) {
      setThumbPreview(null)
      return
    }
    const url = URL.createObjectURL(thumbFile)
    setThumbPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [thumbFile])

  const handleProjectNameChange = (projectName: string) => {
    setForm((f) => ({
      ...f,
      project_name: projectName,
      name: projectName,
      id: !isEdit && !idTouched ? slugify(projectName) : f.id,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.id.trim() || !form.project_name.trim() || !form.link.trim() || !form.state.trim()) {
      setError('State, project name, ID, and link are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let thumbnailPath = existingThumb

      if (thumbFile) {
        thumbnailPath = await uploadTourThumbnail(form.id, thumbFile, existingThumb)
      }

      const projectName = form.project_name.trim()
      const payload = {
        id: form.id.trim(),
        name: projectName,
        link: form.link.trim(),
        state: form.state.trim(),
        builder_name: form.builder_name.trim() || null,
        project_name: projectName,
        city_label: form.city_label.trim() || null,
        city_id: null,
        media_type: form.media_type,
        category: existingCategory,
        is_published: form.is_published,
        sort_order: form.sort_order,
        thumbnail_path: thumbnailPath,
      }

      if (isEdit && id) {
        const { id: _omit, ...updates } = payload
        await updateTour(id, updates)
      } else {
        await createTour(payload)
      }

      clearTourFormDraft(draftKey)
      navigate('/admin/tours', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate text-sm">
        Loading tour…
      </div>
    )
  }

  const previewSrc =
    thumbPreview ?? getPortfolioThumbnail(existingThumb, thumbCacheKey || undefined)
  const hasThumbnail = Boolean(thumbPreview || existingThumb)

  const handleThumbFile = async (file: File | null) => {
    if (!file) return
    setThumbFile(file)
    setError(null)

    if (isEdit && id) {
      setThumbUploading(true)
      try {
        const path = await uploadTourThumbnail(form.id, file, existingThumb)
        await updateTour(id, { thumbnail_path: path })
        setExistingThumb(path)
        setThumbFile(null)
        setThumbCacheKey(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Thumbnail upload failed')
      } finally {
        setThumbUploading(false)
      }
    }
  }

  const handleRemoveThumbnail = async () => {
    if (isEdit && id && existingThumb) {
      try {
        await deleteTourThumbnail(existingThumb)
        await updateTour(id, { thumbnail_path: null })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove thumbnail')
        return
      }
    }
    setExistingThumb(null)
    setThumbFile(null)
    setThumbPreview(null)
    setThumbCacheKey(Date.now())
  }

  return (
    <>
      <AdminPageHeader
        title={isEdit ? 'Edit tour' : 'Add tour'}
        subtitle={isEdit ? 'Update portfolio item' : 'Create a new video or virtual tour'}
        action={
          <Link
            to="/admin/tours"
            className="text-sm font-semibold text-slate hover:text-cyan transition-colors"
          >
            ← Back to list
          </Link>
        }
      />

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        onSubmit={handleSubmit}
        className="grid lg:grid-cols-3 gap-6 lg:gap-8"
      >
        <div className="lg:col-span-2 space-y-6">
          <AdminCard className="p-6 sm:p-8 space-y-5 overflow-visible">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
                Builder name
              </label>
              <input
                value={form.builder_name}
                onChange={(e) => setForm((f) => ({ ...f, builder_name: e.target.value }))}
                className="w-full rounded-xl border border-border bg-off-white px-4 py-3.5 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                placeholder="e.g. DSPL"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
                Project name *
              </label>
              <input
                value={form.project_name}
                onChange={(e) => handleProjectNameChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-off-white px-4 py-3.5 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                placeholder="Ace Divino"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
                City
              </label>
              <input
                value={form.city_label}
                onChange={(e) => setForm((f) => ({ ...f, city_label: e.target.value }))}
                className="w-full rounded-xl border border-border bg-off-white px-4 py-3.5 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                placeholder="Patna"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
                URL slug *
              </label>
              <input
                value={form.id}
                disabled={isEdit}
                onChange={(e) => {
                  setIdTouched(true)
                  setForm((f) => ({ ...f, id: slugify(e.target.value) }))
                }}
                className="w-full rounded-xl border border-border bg-off-white px-4 py-3.5 text-navy font-mono text-sm focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:opacity-60"
                placeholder="ace-divino"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
                Tour / video link *
              </label>
              <input
                type="url"
                value={form.link}
                onChange={(e) => {
                  const link = e.target.value
                  setForm((f) => ({
                    ...f,
                    link,
                    media_type: inferMediaTypeFromLink(link),
                  }))
                }}
                className="w-full rounded-xl border border-border bg-off-white px-4 py-3.5 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                placeholder="https://nsventures.in/..."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
                  State *
                </label>
                <select
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-off-white px-4 py-3.5 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                >
                  <option value="">Select state…</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
                  Media type
                </label>
                <select
                  value={form.media_type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      media_type: e.target.value as TourFormValues['media_type'],
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-off-white px-4 py-3.5 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                >
                  <option value="virtual-tour">Virtual tour</option>
                  <option value="video">Video</option>
                </select>
                <p className="mt-2 text-xs text-slate-light">
                  YouTube links are auto-set to Video.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-cyan focus:ring-cyan"
                />
                <span className="text-sm font-medium text-navy">Published on live site</span>
              </label>
            </div>
          </AdminCard>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-cyan px-8 py-3.5 text-sm font-bold text-navy shadow-lg shadow-cyan/20 hover:bg-cyan-bright transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create tour'}
            </button>
            <Link
              to="/admin/tours"
              onClick={() => clearTourFormDraft(draftKey)}
              className="rounded-full border border-border px-8 py-3.5 text-sm font-semibold text-slate hover:border-cyan hover:text-cyan transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>

        <div>
          <AdminCard className="p-6 sticky top-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-4">
              Thumbnail
            </p>
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-navy/5 mb-4">
              <img src={previewSrc} alt="" className="w-full h-full object-cover" />
            </div>
            <label className="block">
              <span className="sr-only">Upload thumbnail</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={thumbUploading}
                onChange={(e) => void handleThumbFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-cyan file:text-navy file:font-bold file:text-xs hover:file:bg-cyan-bright disabled:opacity-60"
              />
            </label>
            {thumbUploading && (
              <p className="mt-2 text-xs text-cyan font-semibold">Uploading thumbnail…</p>
            )}
            {isEdit && !thumbUploading && (
              <p className="mt-2 text-xs text-slate-light">
                New image saves immediately on edit.
              </p>
            )}
            {hasThumbnail && (
              <button
                type="button"
                onClick={handleRemoveThumbnail}
                className="mt-3 w-full rounded-full border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                Remove thumbnail
              </button>
            )}
            <p className="mt-3 text-xs text-slate-light">JPG, PNG or WebP. Max 5 MB.</p>
          </AdminCard>
        </div>
      </motion.form>
    </>
  )
}
