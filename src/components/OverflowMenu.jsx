import { useEffect, useRef, useState } from 'react'

// "⋮" button with a small menu of actions. Closes on an outside tap or
// Escape. Each action is { label, onSelect, danger? }.
export default function OverflowMenu({ label, actions }) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle() {
    // near the bottom of the screen, open upward so the menu stays visible
    const rect = buttonRef.current.getBoundingClientRect()
    setOpenUp(window.innerHeight - rect.bottom < 140)
    setOpen(!open)
  }

  function choose(action) {
    setOpen(false)
    action()
  }

  return (
    <div className="row-menu" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="row-menu-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <span aria-hidden="true">⋮</span>
      </button>
      {open && (
        <div className={openUp ? 'row-menu-list up' : 'row-menu-list'} role="menu">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={action.danger ? 'row-menu-danger' : undefined}
              onClick={() => choose(action.onSelect)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
