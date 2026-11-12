import { useId, useState } from 'react'
import { searchByName } from '../utils/search'

// Text input with a dropdown of matching options. Each option needs an `id`
// and a `name`; renderMeta(option) adds optional detail on the right.
export default function Autocomplete({
  options,
  value,
  onChange,
  onSelect,
  placeholder,
  ariaLabel,
  renderMeta,
}) {
  const listId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  // the text the list was last closed for (a pick, Escape). It stays shut
  // until the text changes, so it doesn't cover the fields below again.
  const [dismissedFor, setDismissedFor] = useState(null)

  // spelling-tolerant: "jira" finds Jeera, "mung" finds Moong Dal
  const matches = value.trim() ? searchByName(options, value).slice(0, 8) : []

  // once the text is exactly an option there's nothing left to pick
  const typed = value.trim().toLowerCase()
  const exactMatch = options.some((o) => o.name.toLowerCase() === typed)

  const expanded =
    isOpen && matches.length > 0 && !exactMatch && dismissedFor !== value
  const optionId = (i) => `${listId}-option-${i}`

  function close() {
    setDismissedFor(value)
    setHighlighted(-1)
  }

  function selectOption(option) {
    onChange(option.name)
    onSelect?.(option)
    setDismissedFor(option.name)
    setHighlighted(-1)
  }

  function handleKeyDown(e) {
    if (!matches.length) return
    if (!expanded) {
      // ArrowDown brings a closed list back, as in native comboboxes
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
        setDismissedFor(null)
        setHighlighted(0)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => (h + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => (h <= 0 ? matches.length - 1 : h - 1))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      selectOption(matches[highlighted])
    } else if (e.key === 'Escape') {
      close()
    }
  }

  return (
    <div className="autocomplete">
      <input
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && highlighted >= 0 ? optionId(highlighted) : undefined}
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
          setDismissedFor(null)
          setHighlighted(-1)
        }}
        onFocus={() => setIsOpen(true)}
        // the options' onMouseDown below keeps this blur from beating a tap
        onBlur={() => {
          setIsOpen(false)
          setHighlighted(-1)
        }}
        onKeyDown={handleKeyDown}
      />
      {/* always rendered so aria-controls points at something */}
      <ul className="autocomplete-list" id={listId} role="listbox" hidden={!expanded}>
        {expanded &&
          matches.map((option, i) => (
            <li
              key={option.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === highlighted}
              className={i === highlighted ? 'autocomplete-option active' : 'autocomplete-option'}
              onMouseDown={(e) => {
                e.preventDefault() // keep the input focused; fires before blur
                selectOption(option)
              }}
            >
              <span>{option.name}</span>
              {renderMeta && <span className="autocomplete-meta">{renderMeta(option)}</span>}
            </li>
          ))}
      </ul>
    </div>
  )
}
