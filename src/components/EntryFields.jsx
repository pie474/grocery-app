import { useEffect, useRef, useState } from 'react'

// Quantity and note for one list entry, edited in place. Each saves when
// the field loses focus (or on Enter); onSave(changes) resolves to
// whether the save worked.
export default function EntryFields({ entry, onSave }) {
  const [quantity, setQuantity] = useState(entry.quantity || '')
  const [note, setNote] = useState(entry.note || '')
  // the field that just saved, outlined briefly as confirmation
  const [savedField, setSavedField] = useState(null)
  const quantityRef = useRef(null)
  const noteRef = useRef(null)
  const savedTimeoutRef = useRef(null)

  useEffect(() => () => clearTimeout(savedTimeoutRef.current), [])

  // pick up changes from other family members, unless mid-edit
  useEffect(() => {
    if (document.activeElement !== quantityRef.current) setQuantity(entry.quantity || '')
  }, [entry.quantity])
  useEffect(() => {
    if (document.activeElement !== noteRef.current) setNote(entry.note || '')
  }, [entry.note])

  async function save(field, value) {
    const next = value.trim() || null
    if (next === (entry[field] || null)) return
    // the screen updates right away; a failure is reported by a toast
    if (!(await onSave({ [field]: next }))) return
    clearTimeout(savedTimeoutRef.current)
    setSavedField(field)
    savedTimeoutRef.current = setTimeout(() => setSavedField(null), 1500)
  }

  function blurOnEnter(e) {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  return (
    <div className="entry-fields">
      <input
        ref={quantityRef}
        className={savedField === 'quantity' ? 'quantity-input saved' : 'quantity-input'}
        placeholder="Qty"
        aria-label="Quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        onBlur={() => save('quantity', quantity)}
        onKeyDown={blurOnEnter}
      />
      <input
        ref={noteRef}
        className={savedField === 'note' ? 'note-input saved' : 'note-input'}
        placeholder="Add a note"
        aria-label="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => save('note', note)}
        onKeyDown={blurOnEnter}
      />
      <span className="visually-hidden" role="status">
        {savedField && 'Saved'}
      </span>
    </div>
  )
}
