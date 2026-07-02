import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import { AdminCard } from '../components/AdminLayout'
import { INDIAN_STATES } from '../../data/indianStates'
import { useAdminAuthContext } from '../context/AdminAuthContext'
import { useBulkImportContext } from '../context/BulkImportContext'
import {
  batchIsReady,
  createEmptyBatch,
  totalBatchRows,
  type BulkBatch,
} from '../lib/bulkBatches'
import {
  checkBulkImportServer,
  isRemoteBulkImport,
  type BulkMediaType,
} from '../lib/bulkImport'
import {
  clearBulkUploadDraft,
  hasBulkUploadDraftContent,
  readBulkUploadDraft,
  writeBulkUploadDraft,
  type BulkUploadKind,
} from '../lib/bulkUploadDraft'
import { parseBulkFile } from '../lib/parseBulkSheet'
import { isYoutubeLink } from '../../lib/portfolioLink'
import { cn } from '../../lib/utils'

const STATUS_LABEL: Record<string, string> = {
  checking: 'Checking…',
  thumbnail: 'Fetching thumbnail…',
  screenshot: 'Capturing thumbnail…',
  saving: 'Saving to database…',
  done: 'Done',
  skipped: 'Skipped',
  error: 'Failed',
}

interface BulkUploadPanelProps {
  kind: BulkUploadKind
  mediaType: BulkMediaType
}

const PANEL_COPY: Record<
  BulkUploadKind,
  { sheetHint: string; fileHint: string; thumbNote: string }
> = {
  tour: {
    sheetHint:
      'For each sheet: choose a state, then attach a CSV/Excel with Name + Link columns.',
    fileHint: 'Name + Link columns (virtual tour URLs)',
    thumbNote: 'Thumbnails: Playwright opens the tour and captures a frame.',
  },
  video: {
    sheetHint:
      'For each sheet: choose a state, then attach your YouTube CSV (Category + Title + Youtube Link).',
    fileHint: 'Builder + Project + City + Category + Youtube Link columns',
    thumbNote: 'Thumbnails: fetched from YouTube (original video poster).',
  },
}

export function BulkUploadPanel({ kind, mediaType }: BulkUploadPanelProps) {
  const copy = PANEL_COPY[kind]
  const { session } = useAdminAuthContext()
  const { job, isImporting, runBulkImportJob } = useBulkImportContext()
  const skipNextSave = useRef(true)
  const batchesRef = useRef<BulkBatch[]>([])
  const skipExistingRef = useRef(true)

  const [batches, setBatches] = useState<BulkBatch[]>(() => {
    const draft = readBulkUploadDraft(kind)
    if (draft?.batches.length) return draft.batches
    return [createEmptyBatch()]
  })
  const [skipExisting, setSkipExisting] = useState(
    () => readBulkUploadDraft(kind)?.skipExisting ?? true,
  )
  const [serverReady, setServerReady] = useState<boolean | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsingBatchId, setParsingBatchId] = useState<string | null>(null)

  batchesRef.current = batches
  skipExistingRef.current = skipExisting

  useEffect(() => {
    checkBulkImportServer().then(setServerReady)
  }, [])

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    const draft = { batches, skipExisting }
    if (!hasBulkUploadDraftContent(draft)) {
      clearBulkUploadDraft(kind)
      return
    }
    writeBulkUploadDraft(kind, draft)
  }, [batches, skipExisting, kind])

  useEffect(() => {
    const persist = () => {
      const draft = { batches: batchesRef.current, skipExisting: skipExistingRef.current }
      if (!hasBulkUploadDraftContent(draft)) return
      writeBulkUploadDraft(kind, draft)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist()
    }

    window.addEventListener('pagehide', persist)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      persist()
      window.removeEventListener('pagehide', persist)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [kind])

  const readyBatches = batches.filter(batchIsReady)
  const totalRows = totalBatchRows(readyBatches)
  const youtubeOnTourTab = useMemo(() => {
    if (kind !== 'tour') return 0
    return batches.reduce(
      (n, b) => n + b.rows.filter((r) => isYoutubeLink(r.link)).length,
      0,
    )
  }, [batches, kind])

  const updateBatch = (batchId: string, patch: Partial<BulkBatch>) => {
    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, ...patch } : b)))
  }

  const handleSlotFile = async (batchId: string, file: File | null) => {
    if (!file || isImporting) return

    setParseError(null)
    setParsingBatchId(batchId)

    try {
      const rows = await parseBulkFile(file, kind)
      updateBatch(batchId, { fileName: file.name, rows })
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not parse file')
      updateBatch(batchId, { fileName: null, rows: [] })
    } finally {
      setParsingBatchId(null)
    }
  }

  const addSheet = () => {
    if (isImporting) return
    setBatches((prev) => [...prev, createEmptyBatch()])
  }

  const removeBatch = (batchId: string) => {
    if (isImporting) return
    setBatches((prev) => {
      const next = prev.filter((b) => b.id !== batchId)
      return next.length > 0 ? next : [createEmptyBatch()]
    })
  }

  const clearBatches = () => {
    if (isImporting) return
    setBatches([createEmptyBatch()])
    clearBulkUploadDraft(kind)
  }

  const handleImport = async () => {
    if (!session?.access_token || readyBatches.length === 0 || isImporting) return

    setParseError(null)

    await runBulkImportJob({
      accessToken: session.access_token,
      mediaType,
      skipExisting,
      batches: readyBatches.map((batch) => ({
        state: batch.stateId,
        fileName: batch.fileName ?? 'sheet',
        rows: batch.rows,
      })),
    })
  }

  const showJob = job && job.mediaType === mediaType
  const progress = showJob ? job.progress : 0
  const total = showJob ? job.total : totalRows
  const log = showJob ? job.log : []
  const summary = showJob ? job.summary : null
  const warning = showJob ? job.warning : null
  const fatalError = showJob ? job.fatalError : null
  const pct = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0
  const filledSlots = batches.filter((b) => b.fileName).length

  return (
    <>
      {serverReady === false && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Import server not reachable</p>
          <p className="mt-1 text-amber-800/90">
            {isRemoteBulkImport() ? (
              <>
                Check that the bulk-import service is running and{' '}
                <code className="rounded bg-amber-100 px-1.5 py-0.5">VITE_BULK_IMPORT_API_URL</code>{' '}
                points to it (e.g. Railway / Render / your VPS).
              </>
            ) : (
              <>
                Run <code className="rounded bg-amber-100 px-1.5 py-0.5">npm run dev:all</code> to
                start the bulk import server locally.
              </>
            )}
          </p>
        </div>
      )}

      {warning && (
        <p className="mb-6 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          {warning}
        </p>
      )}

      {fatalError && (
        <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {fatalError}
        </p>
      )}

      {parseError && (
        <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {parseError}
        </p>
      )}

      {youtubeOnTourTab > 0 && (
        <p className="mb-6 text-sm text-cyan-900 bg-cyan/5 border border-cyan/20 rounded-xl px-4 py-3">
          {youtubeOnTourTab} YouTube link{youtubeOnTourTab === 1 ? '' : 's'} detected — they will
          import as <strong>Video</strong>. For a dedicated YouTube workflow, use the{' '}
          <strong>YouTube videos</strong> tab.
        </p>
      )}

      {summary && (
        <p className="mb-6 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          {summary}
        </p>
      )}

      <AdminCard className="p-6 mb-6 space-y-5">
        <p className="text-xs text-slate">
          {copy.sheetHint} Your work is saved if you switch tabs or minimize. {copy.thumbNote}
        </p>

        <div className="space-y-4">
          {batches.map((batch, index) => {
            const isParsing = parsingBatchId === batch.id
            const locationMissing = batch.fileName && !batch.stateId
            const fileMissing = batch.stateId && !batch.fileName

            return (
              <div
                key={batch.id}
                className={cn(
                  'rounded-xl border p-4 sm:p-5 space-y-4',
                  batchIsReady(batch)
                    ? 'border-cyan/30 bg-cyan/[0.03]'
                    : 'border-border bg-off-white/60',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate">
                    Sheet {index + 1}
                  </p>
                  {batches.length > 1 && (
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={() => removeBatch(batch.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
                      State
                    </label>
                    <select
                      value={batch.stateId}
                      disabled={isImporting}
                      onChange={(e) => updateBatch(batch.id, { stateId: e.target.value })}
                      className="w-full rounded-xl border border-border bg-off-white px-4 py-3.5 text-navy focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:opacity-60"
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
                      Sheet file
                    </label>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      disabled={isImporting || isParsing}
                      onChange={(e) => void handleSlotFile(batch.id, e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-slate file:mr-3 file:rounded-full file:border-0 file:bg-cyan file:px-4 file:py-2 file:text-sm file:font-semibold file:text-navy hover:file:bg-cyan-bright disabled:opacity-50"
                    />
                    {isParsing && <p className="mt-2 text-xs text-slate">Reading file…</p>}
                    {batch.fileName && !isParsing && (
                      <p className="mt-2 text-xs text-navy font-medium">
                        {batch.fileName} · {batch.rows.length} row
                        {batch.rows.length === 1 ? '' : 's'}
                      </p>
                    )}
                    {!batch.fileName && !isParsing && (
                      <p className="mt-2 text-xs text-slate-light">{copy.fileHint}</p>
                    )}
                  </div>
                </div>

                {locationMissing && (
                  <p className="text-xs text-amber-700">Select a state for this sheet.</p>
                )}
                {fileMissing && (
                  <p className="text-xs text-amber-700">Attach a sheet file for this state.</p>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          disabled={isImporting}
          onClick={addSheet}
          className={cn(
            'w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-cyan',
            'hover:border-cyan hover:bg-cyan/5 transition-colors disabled:opacity-50',
          )}
        >
          + Add another sheet
        </button>

        <label className="flex items-center gap-2 text-sm text-slate cursor-pointer">
          <input
            type="checkbox"
            checked={skipExisting}
            disabled={isImporting}
            onChange={(e) => setSkipExisting(e.target.checked)}
            className="rounded border-border text-cyan focus:ring-cyan"
          />
          Skip items that already exist (same link). Uncheck to replace thumbnails for existing tours.
        </label>

        {filledSlots > 0 && (
          <p className="text-sm text-navy font-medium">
            {readyBatches.length} of {batches.length} sheet{batches.length === 1 ? '' : 's'} ready ·{' '}
            {totalRows} row{totalRows === 1 ? '' : 's'} total
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={
              isImporting ||
              readyBatches.length === 0 ||
              !session?.access_token ||
              serverReady === false
            }
            onClick={() => void handleImport()}
            className={cn(
              'rounded-full px-8 py-3 text-sm font-bold tracking-wide transition-all',
              'bg-navy text-white hover:bg-navy-light shadow-lg shadow-navy/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isImporting ? `Importing… ${pct}%` : 'Start import'}
          </button>

          {filledSlots > 0 && (
            <button
              type="button"
              disabled={isImporting}
              onClick={clearBatches}
              className="rounded-full px-6 py-3 text-sm font-semibold text-slate border border-border hover:border-slate disabled:opacity-50"
            >
              Clear all
            </button>
          )}
        </div>
      </AdminCard>

      {(isImporting || log.length > 0) && (
        <AdminCard className="p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-lg font-bold text-navy">Progress</h2>
            <span className="text-sm text-slate tabular-nums">
              {progress} / {total || totalRows}
            </span>
          </div>

          <div className="h-2 rounded-full bg-off-white overflow-hidden mb-6">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan to-cyan-bright"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          <ul className="max-h-80 overflow-y-auto space-y-2 text-sm">
            {log.filter(Boolean).map((item) => (
              <li
                key={`${item.globalIndex}-${item.id ?? item.name}`}
                className={cn(
                  'rounded-lg px-3 py-2',
                  item.status === 'done' && 'bg-emerald-50 text-emerald-800',
                  item.status === 'skipped' && 'bg-slate-50 text-slate',
                  item.status === 'error' && 'bg-red-50 text-red-700',
                  (item.status === 'thumbnail' ||
                    item.status === 'screenshot' ||
                    item.status === 'saving' ||
                    item.status === 'checking') &&
                    'bg-cyan/5 text-navy',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="shrink-0 text-xs">
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate mt-0.5 truncate">{item.batchLabel}</p>
                {item.message && (
                  <p className="text-[11px] mt-0.5 opacity-80">{item.message}</p>
                )}
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      {readyBatches.length > 0 && !isImporting && log.length === 0 && (
        <AdminCard className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-display text-lg font-bold text-navy">Preview</h2>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {readyBatches.map((batch) => (
              <div key={batch.id} className="p-4 sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate mb-2">
                  {batch.stateId} ← {batch.fileName}
                </p>
                <ul className="space-y-1 text-sm">
                  {batch.rows.slice(0, 5).map((row) => (
                    <li key={row.link} className="flex gap-3 truncate text-sm">
                      <span className="text-slate shrink-0 max-w-[28%] truncate">
                        {row.builderName || '—'}
                      </span>
                      <span className="font-medium text-navy shrink-0 max-w-[32%] truncate">
                        {row.projectName || row.name}
                      </span>
                      <span className="text-slate truncate">{row.cityLabel || row.link}</span>
                    </li>
                  ))}
                  {batch.rows.length > 5 && (
                    <li className="text-xs text-slate pt-1">+ {batch.rows.length - 5} more</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </AdminCard>
      )}
    </>
  )
}
