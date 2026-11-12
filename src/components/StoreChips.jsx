import AddStoreInline from './AddStoreInline'

// "Available at" picker: one toggleable chip per store. Each chip is a
// real checkbox (visually hidden) inside its label, so it stays a
// checkbox group for screen readers and keyboards while giving fingers a
// full-size target. onChange gets the new array of store ids.
export default function StoreChips({
  stores,
  value,
  onChange,
  onStoreAdded,
  legend = 'Available at (pick at least one)',
  children,
}) {
  function toggle(storeId) {
    onChange(value.includes(storeId) ? value.filter((s) => s !== storeId) : [...value, storeId])
  }

  return (
    <fieldset className="dialog-field">
      <legend className="field-label">{legend}</legend>
      <div className="store-chips">
        {stores.map((store) => {
          const checked = value.includes(store.id)
          return (
            <label key={store.id} className={checked ? 'store-chip checked' : 'store-chip'}>
              <input
                type="checkbox"
                className="visually-hidden"
                checked={checked}
                onChange={() => toggle(store.id)}
              />
              <span className="store-chip-check" aria-hidden="true" />
              {store.name}
            </label>
          )
        })}
        <AddStoreInline
          stores={stores}
          onAdded={async (store) => {
            await onStoreAdded?.()
            onChange([...value, store.id])
          }}
        />
      </div>
      {children}
    </fieldset>
  )
}
