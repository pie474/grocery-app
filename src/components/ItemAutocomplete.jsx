import { useState } from 'react'

export default function ItemAutocomplete({ items, value, onChange, onSelect, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)

  const query = value.trim().toLowerCase()
  const matches = query
    ? items.filter((i) => i.name.toLowerCase().includes(query)).slice(0, 8)
    : []

  function selectItem(item) {
    onChange(item.name)
    onSelect?.(item)
    setIsOpen(false)
    setHighlighted(-1)
  }

  function handleKeyDown(e) {
    if (!isOpen || !matches.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => (h + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => (h <= 0 ? matches.length - 1 : h - 1))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      selectItem(matches[highlighted])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlighted(-1)
    }
  }

  return (
    <div className="autocomplete">
      <input
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
          setHighlighted(-1)
        }}
        onFocus={() => setIsOpen(true)}
        // A short delay lets a click on an option register before the
        // list unmounts; the option's onMouseDown below also blocks the
        // blur that would otherwise beat the click.
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && matches.length > 0 && (
        <ul className="autocomplete-list" role="listbox">
          {matches.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === highlighted}
              className={i === highlighted ? 'autocomplete-option active' : 'autocomplete-option'}
              onMouseDown={(e) => {
                e.preventDefault() // keep the input focused; fires before blur
                selectItem(item)
              }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
