import { useEffect, useRef, useState } from 'react'

import {
  digitsOnly,
  partsToYmd,
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
  disabled,
}: {
  value: string
  onChange: (ymd: string) => void
  disabled?: boolean
}) {
  const [parts, setParts] = useState<DateParts>(() => ymdToParts(value))
  const focused = useRef(false)
  const dayRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)
  const refs = { day: dayRef, month: monthRef, year: yearRef }

  useEffect(() => {
    if (focused.current) return
    setParts(ymdToParts(value))
  }, [value])

  const commit = (next: DateParts) => {
    setParts(next)
    onChange(partsToYmd(next))
  }

  const focusNext = (key: keyof DateParts) => {
    if (key === 'day') monthRef.current?.focus()
    else if (key === 'month') yearRef.current?.focus()
  }

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.25em] text-slate font-semibold mb-2">
        Published date
      </label>
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
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                maxLength={field.maxLen}
                aria-label={field.label}
                placeholder={field.label}
                value={parts[field.key]}
                onFocus={() => {
                  focused.current = true
                }}
                onBlur={() => {
                  focused.current = false
                  commit({
                    ...parts,
                    [field.key]: parts[field.key],
                  })
                }}
                onChange={(e) => {
                  const nextValue = digitsOnly(e.target.value, field.maxLen)
                  const next = { ...parts, [field.key]: nextValue }
                  commit(next)
                  if (nextValue.length === field.maxLen) focusNext(field.key)
                }}
                className={`${field.width} rounded-xl border border-border bg-off-white px-2 py-3.5 text-center text-navy font-semibold tracking-wider focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:opacity-60`}
              />
              <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-light">
                {field.label}
              </p>
            </div>
          </div>
        ))}
      </div>
      {parts.day && parts.month && parts.year.length === 4 && !partsToYmd(parts) && (
        <p className="mt-2 text-xs text-amber-700">Enter a valid calendar date.</p>
      )}
    </div>
  )
}
