import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

import {
  runBulkImport,
  type BulkImportCompleteEvent,
  type BulkImportItemEvent,
  type BulkMediaType,
} from '../lib/bulkImport'
import type { BulkRow } from '../lib/parseBulkSheet'

export interface BulkImportLogEntry extends BulkImportItemEvent {
  batchLabel: string
  globalIndex: number
}

interface BulkImportJob {
  mediaType: BulkMediaType
  total: number
  progress: number
  log: BulkImportLogEntry[]
  summary: string | null
  warning: string | null
  fatalError: string | null
  running: boolean
}

interface RunBulkImportParams {
  accessToken: string
  batches: { state: string; fileName: string; rows: BulkRow[] }[]
  skipExisting: boolean
  mediaType: BulkMediaType
}

interface BulkImportContextValue {
  job: BulkImportJob | null
  isImporting: boolean
  runBulkImportJob: (params: RunBulkImportParams) => Promise<void>
  clearJob: () => void
}

const BulkImportContext = createContext<BulkImportContextValue | null>(null)

export function BulkImportProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<BulkImportJob | null>(null)
  const abortRef = useRef(false)

  const clearJob = useCallback(() => {
    abortRef.current = true
    setJob(null)
  }, [])

  const runBulkImportJob = useCallback(async (params: RunBulkImportParams) => {
    const { accessToken, batches, skipExisting, mediaType } = params
    const totalRows = batches.reduce((sum, b) => sum + b.rows.length, 0)

    abortRef.current = false
    setJob({
      mediaType,
      total: totalRows,
      progress: 0,
      log: [],
      summary: null,
      warning: null,
      fatalError: null,
      running: true,
    })

    const totals: BulkImportCompleteEvent = {
      success: 0,
      failed: 0,
      skipped: 0,
      total: totalRows,
    }
    let batchOffset = 0

    try {
      for (const batch of batches) {
        if (abortRef.current) break

        const batchLabel = `${batch.fileName} · ${batch.state}`

        await runBulkImport(
          accessToken,
          batch.state,
          batch.rows,
          skipExisting,
          mediaType,
          {
            onItem: (event) => {
              const globalIndex = batchOffset + event.index
              const isFinished =
                event.status === 'done' || event.status === 'skipped' || event.status === 'error'

              setJob((prev) => {
                if (!prev) return prev
                const log = [...prev.log]
                log[globalIndex - 1] = { ...event, batchLabel, globalIndex }
                return {
                  ...prev,
                  log,
                  progress: isFinished ? globalIndex : prev.progress,
                }
              })
            },
            onComplete: (result) => {
              totals.success += result.success
              totals.failed += result.failed
              totals.skipped += result.skipped
            },
            onWarn: (message) => {
              setJob((prev) => (prev ? { ...prev, warning: message } : prev))
            },
            onFatal: (message) => {
              setJob((prev) => (prev ? { ...prev, fatalError: message } : prev))
            },
          },
        )

        batchOffset += batch.rows.length
      }

      setJob((prev) =>
        prev
          ? {
              ...prev,
              running: false,
              progress: totalRows,
              summary: `Imported ${totals.success} item${totals.success === 1 ? '' : 's'} · ${totals.skipped} skipped · ${totals.failed} failed across ${batches.length} sheet${batches.length === 1 ? '' : 's'}`,
            }
          : prev,
      )
    } catch (err) {
      setJob((prev) =>
        prev
          ? {
              ...prev,
              running: false,
              fatalError: err instanceof Error ? err.message : 'Import failed',
            }
          : prev,
      )
    }
  }, [])

  return (
    <BulkImportContext.Provider
      value={{
        job,
        isImporting: Boolean(job?.running),
        runBulkImportJob,
        clearJob,
      }}
    >
      {children}
    </BulkImportContext.Provider>
  )
}

export function useBulkImportContext() {
  const ctx = useContext(BulkImportContext)
  if (!ctx) {
    throw new Error('useBulkImportContext must be used within BulkImportProvider')
  }
  return ctx
}
