import { useCallback, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

// Store ids in a fixed order, so picking the same stores in another order
// doesn't count as a change.
export function sortedIds(ids) {
  return [...(ids || [])].sort()
}

// True once `values` differs from what it was on the first render.
// Compares real values rather than a "touched" flag, so typing and then
// undoing it doesn't count. Callers pass values already normalised
// (trimmed text, sorted ids) as plain JSON-able data.
export function useIsDirty(values) {
  const [initial] = useState(() => JSON.stringify(values))
  return JSON.stringify(values) !== initial
}

// Guards a dialog's Escape / backdrop tap / Cancel: a form that hasn't
// changed closes straight away, a changed one asks first, and nothing
// closes mid-save. Render `discardPrompt` inside the dialog.
export function useDiscardGuard({ dirty, busy, onClose }) {
  const [confirming, setConfirming] = useState(false)

  const requestClose = useCallback(() => {
    if (busy) return
    if (dirty) setConfirming(true)
    else onClose()
  }, [busy, dirty, onClose])

  const discardPrompt = confirming ? (
    <ConfirmDialog
      title="Discard changes?"
      message="What you've changed here won't be saved."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      danger
      onConfirm={() => {
        setConfirming(false)
        onClose()
      }}
      onCancel={() => setConfirming(false)}
    />
  ) : null

  return { requestClose, discardPrompt }
}
