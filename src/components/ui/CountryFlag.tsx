import { cn } from '../../lib/utils'

interface CountryFlagProps {
  countryCode: string
  className?: string
  title?: string
}

export function CountryFlag({ countryCode, className, title }: CountryFlagProps) {
  const code = countryCode.toLowerCase()

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt=""
      aria-label={title ?? `${countryCode} flag`}
      width={24}
      height={16}
      loading="lazy"
      decoding="async"
      className={cn(
        'h-4 w-6 shrink-0 rounded-sm object-cover shadow-sm ring-1 ring-navy/10',
        className,
      )}
    />
  )
}
