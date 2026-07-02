import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { BulkUploadPanel } from '../components/BulkUploadPanel'
import { AdminPageHeader } from '../components/AdminLayout'
import { migrateLegacyBulkDraft } from '../lib/bulkUploadDraft'
import { cn } from '../../lib/utils'

type BulkTab = 'tour' | 'video'

export function BulkUploadPage() {
  const [tab, setTab] = useState<BulkTab>('tour')

  useEffect(() => {
    migrateLegacyBulkDraft()
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Bulk upload"
        subtitle="Import virtual tours or YouTube videos state-wise with auto-generated thumbnails"
        action={
          <Link
            to="/admin/tours"
            className="text-sm font-semibold text-cyan hover:text-cyan-bright"
          >
            View portfolio →
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('tour')}
          className={cn(
            'rounded-full px-5 py-2.5 text-sm font-bold transition-all',
            tab === 'tour'
              ? 'bg-cyan text-navy shadow-lg shadow-cyan/20'
              : 'bg-white text-slate border border-border hover:border-cyan/40',
          )}
        >
          Virtual tours
        </button>
        <button
          type="button"
          onClick={() => setTab('video')}
          className={cn(
            'rounded-full px-5 py-2.5 text-sm font-bold transition-all',
            tab === 'video'
              ? 'bg-cyan text-navy shadow-lg shadow-cyan/20'
              : 'bg-white text-slate border border-border hover:border-cyan/40',
          )}
        >
          YouTube videos
        </button>
      </div>

      <div className={tab === 'tour' ? '' : 'hidden'}>
        <BulkUploadPanel kind="tour" mediaType="virtual-tour" />
      </div>
      <div className={tab === 'video' ? '' : 'hidden'}>
        <BulkUploadPanel kind="video" mediaType="video" />
      </div>
    </>
  )
}
