export default function StoreFilter({ stores, activeStoreId, onChange }) {
  return (
    <div className="store-filter">
      <button
        className={activeStoreId === null ? 'store-pill active' : 'store-pill'}
        onClick={() => onChange(null)}
      >
        All items
      </button>
      {stores.map((store) => (
        <button
          key={store.id}
          className={activeStoreId === store.id ? 'store-pill active' : 'store-pill'}
          onClick={() => onChange(store.id)}
        >
          {store.name}
        </button>
      ))}
    </div>
  )
}
