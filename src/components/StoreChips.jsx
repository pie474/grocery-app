import AddStoreInline from './AddStoreInline'

// "Available at" picker: one toggleable chip per store. Each chip is a
// real checkbox (visually hidden) inside its label, so it stays a
// checkbox group for screen readers and keyboards while giving fingers a
// full-size target. onChange gets the new array of store ids. Hints go in
// as children; pass their id as describedBy so the group is read out with
// them.
export default function StoreChips({
  stores,
  value,
  onChange,
  onStoreAdded,
  // what's required is said by the hint passed in as children, when it's
  // missing, rather than in the legend every time
  legend = 'Available at',
  describedBy,
  children,
}) {
  function toggle(storeId) {
    onChange(value.includes(storeId) ? value.filter((s) => s !== storeId) : [...value, storeId])
  }

  return (
    <fieldset className="dialog-field" aria-describedby={describedBy}>
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
