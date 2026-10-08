import { useEffect, useRef, useState } from 'react'

import {
  padDatePart,
  padParts,
  partsAreInvalid,
  partsToYmd,
  sanitizeDatePart,
  ymdToParts,
  type DateParts,
} from '../../lib/publishedDateParts'

const FIELDS: { key: keyof DateParts; label: string; maxLen: number; width: string }[] = [
  { key: 'day', label: 'DD', maxLen: 2, width: 'w-14' },
  { key: 'month', label: 'MM', maxLen: 2, width: 'w-14' },
  { key: 'year', label: 'YYYY', maxLen: 4, width: 'w-20' },
]

export function PublishedDateInput({
  value,
  onChange,
  onInvalidChange,
  disabled,
}: {
  value: string
  onChange: (ymd: string) => void
  onInvalidChange?: (invalid: boolean) => void
  disabled?: boolean
}) {
  const [parts, setParts] = useState<DateParts>(() => ymdToParts(value))
  const partsRef = useRef(parts)
  const focused = useRef(false)
  const dayRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)
  const refs = { day: dayRef, month: monthRef, year: yearRef }

  // Only flag the field once the user has left it — not on every keystroke.
  const [blurred, setBlurred] = useState(false)
  const invalid = partsAreInvalid(parts)
  const showError = invalid && blurred

  useEffect(() => {
    if (focused.current) return
    const next = ymdToParts(value)
    partsRef.current = next
    setParts(next)
  }, [value])

  useEffect(() => {
    onInvalidChange?.(invalid)
  }, [invalid, onInvalidChange])

  const emit = (next: DateParts) => {
    partsRef.current = next
    setParts(next)
    onChange(partsToYmd(padParts(next)))
  }

  const focusNext = (key: keyof DateParts) => {
    if (key === 'day') monthRef.current?.focus()
    else if (key === 'month') yearRef.current?.focus()
  }

  return (
    <div data-published-date>
      <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
        Published date
      </label>
      <p className="-mt-1 mb-2 text-[11px] text-slate-light">
        Enter the date shown on YouTube — it saves exactly as typed.
      </p>
      <div className="flex items-end gap-2">
        {FIELDS.map((field, index) => (
          <div key={field.key} className="flex items-end gap-2">
            {index > 0 && (
              <span className="pb-3 text-lg font-semibold text-slate-light" aria-hidden>
                /
              </span>
            )}
            <div>
              <input
                ref={refs[field.key]}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                maxLength={field.maxLen}
                aria-label={field.label}
                aria-invalid={showError || undefined}
                placeholder={field.label}
                value={parts[field.key]}
                onFocus={(e) => {
                  focused.current = true
                  setBlurred(false)
                  e.currentTarget.select()
                }}
                onBlur={(e) => {
                  const root = e.currentTarget.closest('[data-published-date]')
                  const next = e.relatedTarget
                  // Pad "6" -> "06" even when focus stays inside the field group.
                  const padded = {
                    ...partsRef.current,
                    [field.key]: padDatePart(field.key, partsRef.current[field.key]),
                  }
                  if (padded[field.key] !== partsRef.current[field.key]) {
                    partsRef.current = padded
                    setParts(padded)
                  }
                  if (next instanceof Node && root?.contains(next)) return
                  focused.current = false
                  setBlurred(true)
                  onChange(partsToYmd(padParts(partsRef.current)))
                }}
                onChange={(e) => {
                  const { value: nextValue, complete } = sanitizeDatePart(
                    field.key,
                    e.target.value,
                    partsRef.current[field.key],
                  )
                  emit({ ...partsRef.current, [field.key]: nextValue })
                  if (complete) focusNext(field.key)
                }}
                className={`${field.width} rounded-xl border bg-off-white px-2 py-3.5 text-center text-navy font-semibold tracking-wider focus:outline-none focus:ring-2 disabled:opacity-60 ${
                  showError
                    ? 'border-amber-500 focus:border-amber-500 focus:ring-amber-500/20'
                    : 'border-border focus:border-cyan focus:ring-cyan/20'
                }`}
              />
              <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-light">
                {field.label}
              </p>
            </div>
          </div>
        ))}
      </div>
      {showError && (
        <p className="mt-2 text-xs text-amber-700">
          Enter a full, valid calendar date as DD / MM / YYYY (year 1990–2100).
        </p>
      )}
    </div>
  )
}
