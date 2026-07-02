import { isYoutubeLink } from '../../lib/portfolioLink'

export interface BulkRow {
  name: string
  link: string
  category?: string | null
  builderName?: string | null
  projectName?: string | null
  cityLabel?: string | null
}

export type BulkSheetKind = 'tour' | 'video'

function parseCsvLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur.trim())
  return cols
}

function normalizeLink(raw: string): string | null {
  const trimmed = raw.trim().replace(/^"|"$/g, '')
  if (!trimmed.startsWith('http')) return null
  try {
    const u = new URL(trimmed)
    return u.toString().replace(/\/$/, '') + '/'
  } catch {
    return null
  }
}

function nameFromLink(link: string): string {
  const path = new URL(link).pathname.replace(/^\/|\/$/g, '')
  return path
    .replace(/[-_]?nsv$/i, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findColumnIndex(headers: string[], matchers: ((h: string) => boolean)[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase())
  for (const match of matchers) {
    const idx = lower.findIndex(match)
    if (idx >= 0) return idx
  }
  return -1
}

function resolveColumns(headers: string[]) {
  const lower = headers.map((h) => h.trim().toLowerCase())

  const hasHeader =
    lower.includes('link') ||
    lower.includes('name') ||
    lower.includes('url') ||
    lower.includes('title') ||
    lower.some((h) => h.includes('youtube')) ||
    lower.some((h) => h.includes('category') || h.includes('catgor')) ||
    lower.some((h) => h.includes('builder')) ||
    lower.some((h) => h.includes('project')) ||
    lower.some((h) => h.includes('city'))

  const nameIdx = findColumnIndex(headers, [
    (h) => h === 'name',
    (h) => h === 'title',
    (h) => h.includes('project name'),
    (h) => h === 'project',
  ])

  const linkIdx = findColumnIndex(headers, [
    (h) => h === 'link',
    (h) => h === 'url',
    (h) => h.includes('youtube'),
  ])

  const categoryIdx = findColumnIndex(headers, [
    (h) => h.includes('category') || h.includes('catgor'),
  ])

  const builderIdx = findColumnIndex(headers, [(h) => h.includes('builder')])

  const projectIdx = findColumnIndex(headers, [
    (h) => h.includes('project name'),
    (h) => h === 'project',
  ])

  const cityIdx = findColumnIndex(headers, [
    (h) => h.includes('city name'),
    (h) => h === 'city',
  ])

  return { hasHeader, nameIdx, linkIdx, categoryIdx, builderIdx, projectIdx, cityIdx }
}

function cellValue(cols: string[], idx: number): string {
  if (idx < 0) return ''
  return (cols[idx] ?? '').replace(/^"|"$/g, '').trim()
}

function rowsFromTable(
  dataRows: string[][],
  nameIdx: number,
  linkIdx: number,
  kind: BulkSheetKind,
  categoryIdx = -1,
  builderIdx = -1,
  projectIdx = -1,
  cityIdx = -1,
): BulkRow[] {
  if (linkIdx === -1) {
    throw new Error(
      kind === 'video'
        ? 'Sheet must have a "Youtube Link" (or Link) column.'
        : 'Sheet must have a "Link" column (or Name in A, Link in B with no header).',
    )
  }

  const rows: BulkRow[] = []
  for (const cols of dataRows) {
    const link = normalizeLink(cols[linkIdx] ?? '')
    if (!link) continue
    if (kind === 'video' && !isYoutubeLink(link)) continue

    const projectName = cellValue(cols, projectIdx) || cellValue(cols, nameIdx)
    const builderName = cellValue(cols, builderIdx)
    const cityLabel = cellValue(cols, cityIdx)
    const categoryRaw = cellValue(cols, categoryIdx)

    rows.push({
      name: projectName || nameFromLink(link),
      link,
      category: categoryRaw || null,
      builderName: builderName || null,
      projectName: projectName || null,
      cityLabel: cityLabel || null,
    })
  }

  if (rows.length === 0) {
    throw new Error(
      kind === 'video'
        ? 'No valid YouTube links found in the file.'
        : 'No valid tour links found in the file.',
    )
  }

  return rows
}

function resolveIndices(
  hasHeader: boolean,
  kind: BulkSheetKind,
  indices: ReturnType<typeof resolveColumns>,
) {
  let {
    nameIdx,
    linkIdx,
    categoryIdx,
    builderIdx,
    projectIdx,
    cityIdx,
  } = indices

  if (!hasHeader) {
    if (kind === 'video') {
      categoryIdx = 0
      nameIdx = 1
      linkIdx = 2
    } else {
      nameIdx = 0
      linkIdx = 1
      categoryIdx = -1
    }
  }

  return { nameIdx, linkIdx, categoryIdx, builderIdx, projectIdx, cityIdx }
}

export function parseBulkCsv(text: string, kind: BulkSheetKind = 'tour'): BulkRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  const firstCols = parseCsvLine(lines[0])
  const resolved = resolveColumns(firstCols)
  const dataLines = resolved.hasHeader ? lines.slice(1) : lines
  const indices = resolveIndices(resolved.hasHeader, kind, resolved)
  const dataRows = dataLines.map((line) => parseCsvLine(line))

  return rowsFromTable(
    dataRows,
    indices.nameIdx,
    indices.linkIdx,
    kind,
    indices.categoryIdx,
    indices.builderIdx,
    indices.projectIdx,
    indices.cityIdx,
  )
}

export async function parseBulkFile(file: File, kind: BulkSheetKind = 'tour'): Promise<BulkRow[]> {
  const lower = file.name.toLowerCase()

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error('Excel file has no sheets')

    const sheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]

    if (matrix.length === 0) throw new Error('Sheet is empty')

    const headerRow = matrix[0].map((c) => String(c))
    const resolved = resolveColumns(headerRow)
    const dataRows = resolved.hasHeader ? matrix.slice(1) : matrix
    const indices = resolveIndices(resolved.hasHeader, kind, resolved)

    return rowsFromTable(
      dataRows.map((row) => row.map((c) => String(c))),
      indices.nameIdx,
      indices.linkIdx,
      kind,
      indices.categoryIdx,
      indices.builderIdx,
      indices.projectIdx,
      indices.cityIdx,
    )
  }

  return parseBulkCsv(await file.text(), kind)
}
