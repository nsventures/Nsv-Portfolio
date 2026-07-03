import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  filterPhoneCountries,
  findPhoneCountry,
  type PhoneCountry,
} from '../../data/phoneCountries'
import { cn } from '../../lib/utils'
import { CountryFlag } from './CountryFlag'

interface CountryCodePickerProps {
  value: string
  onChange: (countryCode: string) => void
  disabled?: boolean
  id?: string
}

interface DropdownPosition {
  left: number
  top: number
  width: number
  maxHeight: number
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn(
        'h-3 w-3 shrink-0 text-slate transition-transform duration-200',
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

function CountryRow({
  country,
  selected,
  onSelect,
}: {
  country: PhoneCountry
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
        selected ? 'bg-cyan/10 text-navy' : 'text-slate hover:bg-off-white hover:text-navy',
      )}
    >
      <CountryFlag countryCode={country.code} className="h-4 w-6" title={country.name} />
      <span className="min-w-0 flex-1 truncate font-medium">{country.name}</span>
      <span className="shrink-0 tabular-nums text-slate-light">+{country.dialCode}</span>
    </button>
  )
}

function measureDropdownPosition(trigger: HTMLElement): DropdownPosition {
  const rect = trigger.getBoundingClientRect()
  const width = Math.min(320, window.innerWidth - 16)
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
  const gap = 6
  const preferredHeight = 360
  const spaceBelow = window.innerHeight - rect.bottom - gap - 8
  const spaceAbove = rect.top - gap - 8

  if (spaceBelow >= 180 || spaceBelow >= spaceAbove) {
    return {
      left,
      width,
      top: rect.bottom + gap,
      maxHeight: Math.min(preferredHeight, Math.max(160, spaceBelow)),
    }
  }

  const maxHeight = Math.min(preferredHeight, Math.max(160, spaceAbove))
  return {
    left,
    width,
    top: Math.max(8, rect.top - gap - maxHeight),
    maxHeight,
  }
}

export function CountryCodePicker({ value, onChange, disabled, id }: CountryCodePickerProps) {
  const autoId = useId()
  const buttonId = id ?? autoId
  const listId = `${buttonId}-listbox`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState<DropdownPosition | null>(null)

  const selected = findPhoneCountry(value)
  const filtered = useMemo(() => filterPhoneCountries(query), [query])

  const updatePosition = () => {
    if (!triggerRef.current) return
    setPosition(measureDropdownPosition(triggerRef.current))
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
      setQuery('')
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
    if (open) requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  const handleSelect = (code: string) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  const dropdown =
    open && !disabled && position
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[200] flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl shadow-navy/20 ring-1 ring-navy/5"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            data-lenis-prevent
          >
            <div className="shrink-0 border-b border-border/70 bg-off-white p-2.5">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code…"
                aria-label="Search country"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-light focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              />
            </div>

            <ul
              id={listId}
              role="listbox"
              aria-label="Country codes"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 [scrollbar-width:thin]"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-5 text-center text-sm text-slate-light">No countries found</li>
              ) : (
                filtered.map((country) => (
                  <li key={country.code} role="presentation">
                    <CountryRow
                      country={country}
                      selected={country.code === value}
                      onSelect={() => handleSelect(country.code)}
                    />
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div className="relative shrink-0 self-stretch border-r border-border">
        <button
          ref={triggerRef}
          id={buttonId}
          type="button"
          disabled={disabled}
          aria-label={`Country code ${selected.name} +${selected.dialCode}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (disabled) return
            setOpen((current) => !current)
            if (open) setQuery('')
          }}
          className={cn(
            'flex h-full w-full items-center gap-1 rounded-l-xl bg-off-white px-2 py-2.5',
            'text-xs text-navy transition-colors hover:bg-white/80',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan/30',
            disabled && 'cursor-not-allowed',
            open && 'bg-white',
          )}
        >
          <CountryFlag countryCode={selected.code} className="h-3.5 w-5 shrink-0" title={selected.name} />
          <span className="shrink-0 font-semibold tabular-nums leading-none">+{selected.dialCode}</span>
          <ChevronIcon open={open} />
        </button>
      </div>
      {dropdown}
    </>
  )
}
