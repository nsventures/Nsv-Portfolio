import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { useBulkImportContext } from '../context/BulkImportContext'
import { cn } from '../../lib/utils'

const STATUS_LABEL: Record<string, string> = {
  checking: 'Checking…',
  thumbnail: 'Fetching…',
  screenshot: 'Capturing…',
  saving: 'Saving…',
  done: 'Done',
  skipped: 'Skipped',
  error: 'Failed',
}

export function BulkImportStatusBar() {
  const { job, isImporting } = useBulkImportContext()

  if (!job) return null

  const pct = job.total > 0 ? Math.min(100, Math.round((job.progress / job.total) * 100)) : 0
  const latest = [...job.log].filter(Boolean).pop()

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t shadow-2xl',
        isImporting
          ? 'bg-navy border-cyan/30'
          : job.fatalError
            ? 'bg-red-950 border-red-400/30'
            : 'bg-emerald-950 border-emerald-400/30',
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-white">
            {isImporting
              ? `Bulk import in progress — ${pct}%`
              : job.fatalError
                ? 'Bulk import failed'
                : 'Bulk import finished'}
          </p>
          <Link
            to="/admin/bulk-upload"
            className="text-xs font-bold text-cyan hover:text-cyan-bright"
          >
            View details →
          </Link>
        </div>

        {isImporting && (
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
            <motion.div
              className="h-full bg-cyan"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <p className="text-xs text-white/70 truncate">
          {isImporting && latest
            ? `${latest.globalIndex}/${job.total} · ${latest.name} — ${STATUS_LABEL[latest.status] ?? latest.status}`
            : job.summary ?? job.fatalError ?? ''}
        </p>
      </div>
    </div>
  )
}
