import type { BulkBatch } from './bulkBatches'
import type { BulkRow } from './parseBulkSheet'

export type BulkUploadKind = 'tour' | 'video'

export interface BulkUploadDraft {
  batches: BulkBatch[]
  skipExisting: boolean
}

const DRAFT_KEYS: Record<BulkUploadKind, string> = {
  tour: 'admin-bulk-upload:tour',
  video: 'admin-bulk-upload:video',
}

function isBulkRow(value: unknown): value is BulkRow {
  if (!value || typeof value !== 'object') return false
  const row = value as BulkRow
  return typeof row.name === 'string' && typeof row.link === 'string'
}

function isBulkBatch(value: unknown): value is BulkBatch & { cityId?: string } {
  if (!value || typeof value !== 'object') return false
  const batch = value as BulkBatch & { cityId?: string }
  return (
    typeof batch.id === 'string' &&
    (batch.fileName === null || typeof batch.fileName === 'string') &&
    (batch.stateId === undefined || typeof batch.stateId === 'string') &&
    Array.isArray(batch.rows) &&
    batch.rows.every(isBulkRow)
  )
}

function normalizeBulkBatch(batch: BulkBatch & { cityId?: string }): BulkBatch {
  return {
    id: batch.id,
    fileName: batch.fileName,
    stateId: batch.stateId ?? '',
    rows: batch.rows,
  }
}

export function readBulkUploadDraft(kind: BulkUploadKind): BulkUploadDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEYS[kind])
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<BulkUploadDraft>
    if (!parsed || !Array.isArray(parsed.batches) || !parsed.batches.every(isBulkBatch)) {
      return null
    }

    return {
      batches: parsed.batches.map(normalizeBulkBatch),
      skipExisting: parsed.skipExisting ?? true,
    }
  } catch {
    return null
  }
}

export function writeBulkUploadDraft(kind: BulkUploadKind, draft: BulkUploadDraft) {
  try {
    localStorage.setItem(DRAFT_KEYS[kind], JSON.stringify(draft))
  } catch {
    // ignore quota / private mode
  }
}

export function clearBulkUploadDraft(kind: BulkUploadKind) {
  try {
    localStorage.removeItem(DRAFT_KEYS[kind])
  } catch {
    // ignore
  }
}

export function hasBulkUploadDraftContent(draft: BulkUploadDraft): boolean {
  return draft.batches.some(
    (b) => Boolean(b.stateId || b.fileName || b.rows.length > 0),
  )
}

/** Migrate legacy single-key draft into tour tab. */
export function migrateLegacyBulkDraft(): void {
  try {
    const legacy = localStorage.getItem('admin-bulk-upload:draft')
    if (!legacy || localStorage.getItem(DRAFT_KEYS.tour)) return
    localStorage.setItem(DRAFT_KEYS.tour, legacy)
    localStorage.removeItem('admin-bulk-upload:draft')
  } catch {
    // ignore
  }
}
