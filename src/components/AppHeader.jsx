import { useEffect, useState } from 'react'

// Compact header that sticks to the top. It sits flat on the page until
// content scrolls under it, then gets a hairline so the edge is clear.
export default function AppHeader({ title, children }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function update() {
      setScrolled(window.scrollY > 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <header className={scrolled ? 'app-header scrolled' : 'app-header'}>
      <h1>{title}</h1>
      {children}
    </header>
  )
}
