import { useEffect, useRef, useState } from 'react'

// "⋮" button with a small menu of actions. items: [{ label, onSelect,
// danger? }]. Closes on an outside tap or Escape, and opens upward when
// there isn't room below (on screen, or inside the dialog it sits in).
export default function ActionMenu({ label, items, disabled = false }) {
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
        // inside a <dialog>, close just the menu, not the dialog too
        e.preventDefault()
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
    const rect = buttonRef.current.getBoundingClientRect()
    // a dialog's sticky footer covers its bottom edge
    const container = buttonRef.current.closest('dialog')
    const footer = container?.querySelector('.dialog-footer')
    const limit = footer?.getBoundingClientRect().top ?? window.innerHeight
    setOpenUp(limit - rect.bottom < 48 * items.length + 16)
    setOpen(!open)
  }

  function choose(action) {
    setOpen(false)
    action()
  }

  return (
    <div className="action-menu" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="action-menu-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
      >
        <span aria-hidden="true">⋮</span>
      </button>
      {open && (
        <div className={openUp ? 'action-menu-list up' : 'action-menu-list'} role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.danger ? 'action-menu-danger' : undefined}
              onClick={() => choose(item.onSelect)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
