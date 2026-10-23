import { useId } from 'react'

/**
 * Rebuilt from the drone icon so the two rotors are separate, spinnable groups
 * (`.drone-prop`). Shared by the cursor and the portfolio loader, so the mask
 * id has to be unique per instance.
 */
export function DroneSvg({
  width = 76,
  height = 38,
  className,
}: {
  width?: number
  height?: number
  className?: string
}) {
  const maskId = `drone-holes-${useId()}`

  return (
    <svg
      viewBox="0 30 100 50"
      width={width}
      height={height}
      fill="currentColor"
      className={className}
      aria-hidden
      focusable="false"
    >
      <mask id={maskId}>
        <rect x="0" y="30" width="100" height="50" fill="#fff" />
        <ellipse cx="42.2" cy="55.8" rx="2.8" ry="1.5" fill="#000" />
        <circle cx="50" cy="63.7" r="5.2" fill="#000" />
      </mask>

      <g mask={`url(#${maskId})`}>
        <path
          d="M33.8 49.5 L23.2 71.5"
          stroke="currentColor"
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <path
          d="M66.2 49.5 L76.8 71.5"
          stroke="currentColor"
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <rect x="21" y="43.2" width="58" height="5.2" rx="2.4" />
        <path d="M38.5 52.5h23a3.8 3.8 0 0 1 3.8 3.8v11.1a3.8 3.8 0 0 1-3.8 3.8h-23a3.8 3.8 0 0 1-3.8-3.8V56.3a3.8 3.8 0 0 1 3.8-3.8z" />
        <path d="M50 44.1c4.7 0 8.5 3.8 8.5 8.4h-17c0-4.6 3.8-8.4 8.5-8.4z" />
        <path d="M44 70.5c0 3.3 2.7 6 6 6s6-2.7 6-6z" />
        <rect x="20.1" y="40.9" width="6.6" height="4.6" rx="1.6" />
        <rect x="73.3" y="40.9" width="6.6" height="4.6" rx="1.6" />
      </g>

      <g className="drone-prop">
        <rect x="20.6" y="33.9" width="5.6" height="7.6" rx="2.2" />
        <ellipse cx="23.4" cy="37.9" rx="20.7" ry="2.35" />
      </g>
      <g className="drone-prop">
        <rect x="73.8" y="33.9" width="5.6" height="7.6" rx="2.2" />
        <ellipse cx="76.6" cy="37.9" rx="20.7" ry="2.35" />
      </g>
    </svg>
  )
}
