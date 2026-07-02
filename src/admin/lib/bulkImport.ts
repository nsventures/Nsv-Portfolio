import type { BulkRow } from './parseBulkSheet'

export type BulkMediaType = 'virtual-tour' | 'video'

export type BulkItemStatus =
  | 'checking'
  | 'thumbnail'
  | 'screenshot'
  | 'saving'
  | 'done'
  | 'skipped'
  | 'error'

export interface BulkImportItemEvent {
  index: number
  total: number
  name: string
  status: BulkItemStatus
  message?: string
  id?: string
}

export interface BulkImportCompleteEvent {
  success: number
  failed: number
  skipped: number
  total: number
}

type BulkImportHandler = {
  onStart?: (total: number) => void
  onItem?: (event: BulkImportItemEvent) => void
  onComplete?: (event: BulkImportCompleteEvent) => void
  onWarn?: (message: string) => void
  onFatal?: (message: string) => void
}

function bulkImportApiBase(): string {
  return (import.meta.env.VITE_BULK_IMPORT_API_URL ?? '').replace(/\/$/, '')
}

function bulkImportUrl(path: string): string {
  const base = bulkImportApiBase()
  return base ? `${base}${path}` : path
}

function parseSseChunk(chunk: string, handlers: BulkImportHandler) {
  const blocks = chunk.split('\n\n')
  for (const block of blocks) {
    if (!block.trim()) continue

    let eventName = 'message'
    let dataLine = ''

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) eventName = line.slice(7).trim()
      if (line.startsWith('data: ')) dataLine = line.slice(6)
    }

    if (!dataLine) continue

    try {
      const data = JSON.parse(dataLine) as Record<string, unknown>
      if (eventName === 'start') handlers.onStart?.(data.total as number)
      else if (eventName === 'item') handlers.onItem?.(data as unknown as BulkImportItemEvent)
      else if (eventName === 'complete')
        handlers.onComplete?.(data as unknown as BulkImportCompleteEvent)
      else if (eventName === 'warn') handlers.onWarn?.(String(data.message))
      else if (eventName === 'fatal') handlers.onFatal?.(String(data.message))
    } catch {
      // ignore malformed events
    }
  }
}

export function isRemoteBulkImport(): boolean {
  return Boolean(bulkImportApiBase())
}

export async function checkBulkImportServer(): Promise<boolean> {
  try {
    const res = await fetch(bulkImportUrl('/api/bulk-import/health'))
    if (!res.ok) return false
    const data = (await res.json()) as { configured?: boolean }
    return Boolean(data.configured)
  } catch {
    return false
  }
}

export async function runBulkImport(
  accessToken: string,
  state: string,
  rows: BulkRow[],
  skipExisting: boolean,
  mediaType: BulkMediaType,
  handlers: BulkImportHandler,
): Promise<void> {
  const res = await fetch(bulkImportUrl('/api/bulk-import'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ state, rows, skipExisting, mediaType }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? `Import failed (${res.status})`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response stream from import server')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      parseSseChunk(part + '\n\n', handlers)
    }
  }

  if (buffer.trim()) {
    parseSseChunk(buffer + '\n\n', handlers)
  }
}
