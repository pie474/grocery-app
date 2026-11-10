// A friendly "nothing here" panel: an icon, a title, an optional hint and
// an optional action button. Used wherever a list can come up empty, so
// every empty screen looks the same and points at what to do next.
export default function EmptyState({ icon = 'list', title, hint, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        {ICONS[icon] || ICONS.list}
      </span>
      <p className="empty-state-title">{title}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {actionLabel && onAction && (
        <button type="button" className="empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

const svgProps = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const ICONS = {
  // shopping basket
  list: (
    <svg {...svgProps}>
      <path d="M4 10h16l-1.5 9a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z" />
      <path d="M8 10l3-6M16 10l-3-6" />
      <path d="M9.5 14v3M14.5 14v3" />
    </svg>
  ),
  // shop front
  store: (
    <svg {...svgProps}>
      <path d="M4 9l1.5-5h13L20 9" />
      <path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" />
      <path d="M5 11.5V20h14v-8.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  ),
  // check in a circle
  bought: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.8" />
    </svg>
  ),
  // magnifying glass
  search: (
    <svg {...svgProps}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.6-4.6" />
    </svg>
  ),
  // stack of cards
  catalog: (
    <svg {...svgProps}>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M6.5 5h11M9 2.5h6" />
    </svg>
  ),
}
