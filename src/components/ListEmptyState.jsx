import EmptyState from './EmptyState'

// What the List tab shows when there's nothing to buy. Tells apart a list
// that is truly empty (or all bought) from one where only the selected
// store has nothing, so people don't think their list was lost.
export default function ListEmptyState({ entries, stores, activeStoreId, onClearStore }) {
  const anythingNeeded = entries.some((e) => e.status !== 'got')
  const storeName = stores.find((s) => s.id === activeStoreId)?.name

  if (anythingNeeded && storeName) {
    return (
      <EmptyState
        icon="store"
        title={`Nothing needed at ${storeName}`}
        hint="Items on your list are linked to other stores."
        actionLabel="Show all items"
        onAction={onClearStore}
      />
    )
  }

  return (
    <EmptyState
      icon="list"
      title="Your list is empty"
      hint="Add the first thing you need using the box above."
    />
  )
}
