import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { cn } from '../../lib/utils'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

interface SearchableFilterDropdownProps {
  id: string
  label?: string
  value: string
  options: FilterOption[]
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  onChange: (value: string) => void
  /** Shown when search has no selectable matches. String or derived from the query. */
  emptySearchMessage?: string | ((query: string) => string)
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn(
        'h-3.5 w-3.5 shrink-0 text-slate transition-transform duration-200',
        open && 'rotate-180 text-cyan',
      )}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-light">
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cyan">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function SearchableFilterDropdown({
  id,
  label,
  value,
  options,
  disabled,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  className,
  onChange,
  emptySearchMessage,
}: SearchableFilterDropdownProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = value ? options.find((option) => option.value === value) : undefined

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const list = listRef.current
    if (!list) return

    const stopPageScroll = (event: WheelEvent) => {
      event.stopPropagation()
    }

    list.addEventListener('wheel', stopPageScroll, { passive: true })
    return () => list.removeEventListener('wheel', stopPageScroll)
  }, [open])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((option) => option.label.toLowerCase().includes(normalized))
  }, [options, query])

  const resolvedEmptySearchMessage =
    typeof emptySearchMessage === 'function'
      ? emptySearchMessage(query)
      : emptySearchMessage ?? 'No matches found.'

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.25em] text-slate"
        >
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={label ?? placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listId}-listbox`}
        onClick={() => {
          if (disabled) return
          setOpen((current) => !current)
          if (open) setQuery('')
        }}
        className={cn(
          'group flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left shadow-sm shadow-navy/[0.03] transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/30',
          disabled
            ? 'cursor-not-allowed border-border/80 opacity-60'
            : open
              ? 'border-cyan ring-2 ring-cyan/15'
              : 'border-border hover:border-cyan/40 hover:shadow-md hover:shadow-navy/[0.06]',
        )}
        data-cursor="pointer"
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs font-semibold uppercase tracking-[0.05em] text-navy">
                {selected.label}
              </span>
              {selected.count !== undefined && (
                <span className="shrink-0 rounded-full bg-navy/8 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-navy/70">
                  {selected.count}
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.05em] text-navy/70">{placeholder}</span>
          )}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 flex max-h-[min(20rem,calc(100vh-8rem))] flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-2xl shadow-navy/10 ring-1 ring-navy/5"
          data-lenis-prevent
          data-cursor="pointer"
        >
          <div className="shrink-0 border-b border-border/70 bg-gradient-to-b from-off-white to-white p-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <SearchIcon />
              </span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Search ${(label ?? placeholder ?? 'options').toLowerCase()}`}
                className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm text-navy placeholder:text-slate-light focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              />
            </div>
          </div>

          <ul
            ref={listRef}
            id={`${listId}-listbox`}
            role="listbox"
            aria-label={label ?? 'Filter options'}
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5 [scrollbar-color:rgba(0,45,84,0.25)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-navy/25 [&::-webkit-scrollbar-track]:bg-transparent"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-light">{resolvedEmptySearchMessage}</li>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value

                return (
                  <li key={option.value || '__all__'} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors',
                        isSelected
                          ? 'bg-gradient-to-r from-cyan/12 to-cyan/5 text-navy'
                          : 'text-slate hover:bg-off-white hover:text-navy',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                            isSelected
                              ? 'border-cyan/30 bg-white'
                              : 'border-transparent bg-transparent',
                          )}
                        >
                          {isSelected && <CheckIcon />}
                        </span>
                        <span className="truncate text-sm font-semibold uppercase tracking-[0.04em]">
                          {option.label}
                        </span>
                      </span>
                      {option.count !== undefined && (
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                            isSelected
                              ? 'bg-navy text-white'
                              : 'bg-navy/8 text-navy/60',
                          )}
                        >
                          {option.count}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
