import type { SVGProps } from 'react'

type IconName =
  | 'arrow'
  | 'bed'
  | 'calendar'
  | 'car'
  | 'check'
  | 'close'
  | 'external'
  | 'home'
  | 'image'
  | 'map'
  | 'minus'
  | 'pin'
  | 'sparkle'

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m9 18 6-6-6-6" />,
  bed: <path d="M3 6v12M21 18v-7a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v7M3 14h18M7 9V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />,
  calendar: <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />,
  car: <path d="m5 11 1.4-4.2A2 2 0 0 1 8.3 5h7.4a2 2 0 0 1 1.9 1.4L19 11M3 12a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5H3v-5ZM5 17v2M19 17v2M7 13h.01M17 13h.01" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />,
  home: <path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6" />,
  image: <path d="M4 5h16v14H4zM8 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM4 16l4-4 3 3 2-2 7 6" />,
  map: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15" />,
  minus: <path d="M5 12h14" />,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  sparkle: <path d="m12 3 1.2 4.1a5 5 0 0 0 3.6 3.6L21 12l-4.2 1.3a5 5 0 0 0-3.6 3.6L12 21l-1.2-4.1a5 5 0 0 0-3.6-3.6L3 12l4.2-1.3a5 5 0 0 0 3.6-3.6L12 3Z" />,
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
