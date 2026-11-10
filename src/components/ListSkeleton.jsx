// Placeholder shapes for the list screen while the first load is in
// flight, so the page doesn't jump from a blank "Loading…" to a full list.
// Self-contained: it doesn't reuse the real header markup.
const ROW_WIDTHS = ['62%', '45%', '70%', '38%', '55%', '48%']

export default function ListSkeleton() {
  return (
    <div className="list-skeleton" aria-busy="true">
      <p className="list-skeleton-label" role="status">
        Loading your list…
      </p>
      <div aria-hidden="true">
        <div className="skeleton-bar skeleton-title" />
        <div className="skeleton-pills">
          {[76, 64, 88, 70].map((width, i) => (
            <div key={i} className="skeleton-bar skeleton-pill" style={{ width }} />
          ))}
        </div>
        <div className="skeleton-bar skeleton-input" />
        <div className="skeleton-bar skeleton-heading" />
        {ROW_WIDTHS.map((width, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-bar skeleton-check" />
            <div className="skeleton-row-text">
              <div className="skeleton-bar skeleton-line" style={{ width }} />
              <div className="skeleton-bar skeleton-line-short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
