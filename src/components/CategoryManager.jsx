import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { categoryOptions } from '../utils/items'

function itemCountLabel(count) {
  return count === 1 ? '1 item' : `${count} items`
}

function CategoryRow({ category, categories, count, onChanged }) {
  const [name, setName] = useState(category.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // pick up renames made elsewhere
  useEffect(() => setName(category.name), [category.name])

  const trimmed = name.trim()
  const renamed = !!trimmed && trimmed !== category.name
  const others = categoryOptions(categories).filter((c) => c.id !== category.id)

  async function run(action) {
    setBusy(true)
    setError(null)
    const message = await action()
    setBusy(false)
    if (message) setError(message)
    else onChanged()
  }

  function handleRename(e) {
    e.preventDefault()
    if (!renamed) return
    const clash = others.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (clash) {
      setError(`"${clash.name}" already exists. Use "Merge into" to combine them.`)
      return
    }
    run(async () => {
      const { error } = await supabase
        .from('categories')
        .update({ name: trimmed })
        .eq('id', category.id)
      if (error) {
        console.error(error)
        return "Couldn't rename it. Try again."
      }
    })
  }

  function handleMerge(targetId) {
    const target = others.find((c) => c.id === targetId)
    if (!target) return
    const confirmed = confirm(
      `Move ${itemCountLabel(count)} from "${category.name}" into "${target.name}" and delete "${category.name}"?`,
    )
    if (!confirmed) return
    run(async () => {
      const { error: moveError } = await supabase
        .from('items')
        .update({ category_id: target.id })
        .eq('category_id', category.id)
      // stop here rather than delete a category that still has items
      if (moveError) {
        console.error(moveError)
        return "Couldn't move the items. Try again."
      }
      const { error } = await supabase.from('categories').delete().eq('id', category.id)
      if (error) {
        console.error(error)
        return "Moved the items, but couldn't delete the old category."
      }
    })
  }

  function handleDelete() {
    const confirmed = confirm(
      count
        ? `Delete "${category.name}"? Its ${itemCountLabel(count)} will become uncategorized.`
        : `Delete "${category.name}"?`,
    )
    if (!confirmed) return
    run(async () => {
      // items.category_id is "on delete set null", so its items fall back
      // to uncategorized on their own
      const { error } = await supabase.from('categories').delete().eq('id', category.id)
      if (error) {
        console.error(error)
        return "Couldn't delete it. Try again."
      }
    })
  }

  return (
    <li className="category-row">
      <form className="category-row-main" onSubmit={handleRename}>
        <input
          aria-label={`Name of ${category.name}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
        {renamed && (
          <button type="submit" disabled={busy}>
            Rename
          </button>
        )}
        <span className="category-count">{itemCountLabel(count)}</span>
      </form>
      <div className="category-row-actions">
        {others.length > 0 && (
          <select
            aria-label={`Merge ${category.name} into another category`}
            value=""
            onChange={(e) => handleMerge(e.target.value)}
            disabled={busy}
          >
            <option value="">Merge into…</option>
            {others.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="icon-button" onClick={handleDelete} disabled={busy}>
          Delete
        </button>
      </div>
      {error && <p className="field-hint">{error}</p>}
    </li>
  )
}

// Rename, merge and delete categories. Merging moves every item in one
// category into another and deletes the empty one.
export default function CategoryManager({ categories, items, onChanged }) {
  const counts = items.reduce((acc, item) => {
    if (item.category_id) acc[item.category_id] = (acc[item.category_id] || 0) + 1
    return acc
  }, {})
  const uncategorized = items.filter((i) => !i.category_id).length

  return (
    <section className="category-manager">
      {categories.length ? (
        <ul className="category-rows">
          {categoryOptions(categories).map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              categories={categories}
              count={counts[category.id] || 0}
              onChanged={onChanged}
            />
          ))}
        </ul>
      ) : (
        <p className="field-note">
          No categories yet. Add one by typing it into an item's Category field.
        </p>
      )}
      {uncategorized > 0 && (
        <p className="field-note">{itemCountLabel(uncategorized)} uncategorized</p>
      )}
    </section>
  )
}
