// App-style tab bar fixed to the bottom of the screen, within thumb reach.
const TABS = [
  { view: 'list', label: 'List', Icon: ListIcon },
  { view: 'bought', label: 'Bought', Icon: BagIcon },
  { view: 'catalog', label: 'Catalog', Icon: BookIcon },
]

export default function BottomNav({ view, onChange, neededCount }) {
  return (
    <nav className="bottom-nav" aria-label="Views">
      {TABS.map(({ view: v, label, Icon }) => {
        const active = view === v
        const badge = v === 'list' && neededCount > 0 ? neededCount : null
        return (
          <button
            key={v}
            type="button"
            className={active ? 'bottom-nav-tab active' : 'bottom-nav-tab'}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(v)}
          >
            <span className="bottom-nav-icon">
              <Icon />
              {badge && (
                <span className="bottom-nav-badge" aria-hidden="true">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            <span className="bottom-nav-label">
              {label}
              {/* the badge is decorative, so screen readers get it here */}
              {badge && <span className="visually-hidden">, {badge} needed</span>}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function Svg({ children }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function ListIcon() {
  return (
    <Svg>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6l.01 0M4 12l.01 0M4 18l.01 0" strokeWidth="3" />
    </Svg>
  )
}

function BagIcon() {
  return (
    <Svg>
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <path d="M9.5 14l2 2 3.5-3.5" />
    </Svg>
  )
}

function BookIcon() {
  return (
    <Svg>
      <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5z" />
      <path d="M4 20a2 2 0 0 0 2 2h13v-4" />
      <path d="M9 8h6" />
    </Svg>
  )
}
