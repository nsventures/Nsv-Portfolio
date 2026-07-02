import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import {
  createCity,
  deleteCity,
  fetchAllAdminCities,
  mergeCities,
  setCityActive,
  updateCityState,
} from '../api/adminPortfolio'
import { AdminCard, AdminPageHeader } from '../components/AdminLayout'
import { INDIAN_STATES } from '../../data/indianStates'
import type { CityWithCount } from '../types'

export function CitiesPage() {
  const [cities, setCities] = useState<CityWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newState, setNewState] = useState('')
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')

  const load = () => {
    setLoading(true)
    fetchAllAdminCities()
      .then(setCities)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load cities'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    const state = newState.trim()
    if (!name || !state || adding) return

    setAdding(true)
    setError(null)
    try {
      await createCity(name, state)
      setNewName('')
      setNewState('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add city')
    } finally {
      setAdding(false)
    }
  }

  const handleStateChange = async (city: CityWithCount, state: string) => {
    if (!state || state === city.state) return

    setBusyId(city.id)
    try {
      await updateCityState(city.id, state)
      setCities((prev) =>
        prev.map((c) => (c.id === city.id ? { ...c, state } : c)),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = async (city: CityWithCount) => {
    setBusyId(city.id)
    try {
      await setCityActive(city.id, !city.is_active)
      setCities((prev) =>
        prev.map((c) => (c.id === city.id ? { ...c, is_active: !c.is_active } : c)),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (city: CityWithCount) => {
    const tourNote =
      city.tour_count > 0
        ? `\n\n${city.tour_count} tour(s) will be unassigned (not deleted).`
        : ''
    if (!confirm(`Delete "${city.name}"?${tourNote}\n\nThis cannot be undone.`)) return

    setBusyId(city.id)
    try {
      await deleteCity(city.id)
      setCities((prev) => prev.filter((c) => c.id !== city.id))
      if (mergeSourceId === city.id) {
        setMergeSourceId(null)
        setMergeTargetId('')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleMerge = async (source: CityWithCount) => {
    if (!mergeTargetId) {
      alert('Choose a city to merge into')
      return
    }

    const target = cities.find((c) => c.id === mergeTargetId)
    if (
      !confirm(
        `Merge "${source.name}" into "${target?.name}"?\n\n${source.tour_count} tour(s) will move to ${target?.name}, then "${source.name}" will be deleted.`,
      )
    ) {
      return
    }

    setBusyId(source.id)
    try {
      await mergeCities(source.id, mergeTargetId)
      setMergeSourceId(null)
      setMergeTargetId('')
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setBusyId(null)
    }
  }

  const activeCount = cities.filter((c) => c.is_active).length
  const mergeTargets = (sourceId: string) =>
    cities.filter((c) => c.id !== sourceId).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <AdminPageHeader
        title="Cities"
        subtitle={`${activeCount} active · Merge duplicates (e.g. Gurugram → Gurgaon) or delete unused cities`}
      />

      {error && (
        <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <AdminCard className="p-6 mb-6">
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New city name…"
            className="rounded-xl border border-border bg-off-white px-4 py-3 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          />
          <select
            value={newState}
            onChange={(e) => setNewState(e.target.value)}
            className="rounded-xl border border-border bg-off-white px-4 py-3 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          >
            <option value="">Select state…</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding || !newName.trim() || !newState}
            className="rounded-full bg-cyan px-6 py-3 text-sm font-bold text-navy hover:bg-cyan-bright transition-colors disabled:opacity-60"
          >
            {adding ? 'Adding…' : 'Add city'}
          </button>
        </form>
      </AdminCard>

      <AdminCard>
        {loading ? (
          <div className="p-12 text-center text-slate text-sm">Loading cities…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-off-white/80">
                  <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-semibold text-slate">
                    City
                  </th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-semibold text-slate">
                    State
                  </th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-semibold text-slate">
                    Tours
                  </th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-semibold text-slate">
                    Status
                  </th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-semibold text-slate text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city, i) => (
                  <motion.tr
                    key={city.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-5 py-4 font-semibold text-navy">{city.name}</td>
                    <td className="px-5 py-4">
                      <select
                        value={city.state ?? ''}
                        disabled={busyId === city.id}
                        onChange={(e) => handleStateChange(city, e.target.value)}
                        className="rounded-lg border border-border bg-off-white px-2 py-1.5 text-xs text-navy min-w-[160px]"
                      >
                        <option value="">No state</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-slate">{city.tour_count}</td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          city.is_active
                            ? 'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700'
                            : 'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate'
                        }
                      >
                        {city.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {mergeSourceId === city.id ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <select
                            value={mergeTargetId}
                            onChange={(e) => setMergeTargetId(e.target.value)}
                            className="rounded-lg border border-border bg-off-white px-2 py-1.5 text-xs text-navy"
                          >
                            <option value="">Merge into…</option>
                            {mergeTargets(city.id).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busyId === city.id || !mergeTargetId}
                            onClick={() => handleMerge(city)}
                            className="text-cyan font-semibold hover:text-cyan-bright disabled:opacity-50 text-xs"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMergeSourceId(null)
                              setMergeTargetId('')
                            }}
                            className="text-slate font-semibold hover:text-navy text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <button
                            type="button"
                            disabled={busyId === city.id}
                            onClick={() => toggleActive(city)}
                            className="text-cyan font-semibold hover:text-cyan-bright disabled:opacity-50"
                          >
                            {city.is_active ? 'Hide' : 'Activate'}
                          </button>
                          {city.tour_count > 0 && cities.length > 1 && (
                            <button
                              type="button"
                              disabled={busyId === city.id}
                              onClick={() => {
                                setMergeSourceId(city.id)
                                setMergeTargetId('')
                              }}
                              className="text-navy font-semibold hover:text-cyan disabled:opacity-50"
                            >
                              Merge
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === city.id}
                            onClick={() => handleDelete(city)}
                            className="text-red-500 font-semibold hover:text-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </>
  )
}
