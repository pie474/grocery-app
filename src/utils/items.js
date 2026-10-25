import { supabase, HOUSEHOLD_ID } from '../supabaseClient'

// Shared by the add form and the catalog, which both create items through
// NewItemDialog. Each returns { itemId } or { error: message }.

export async function linkStores(itemId, storeIds) {
  const { error } = await supabase
    .from('item_stores')
    .insert(storeIds.map((store_id) => ({ item_id: itemId, store_id })))
  if (error) {
    console.error(error)
    return { error: "Couldn't save the stores. Try again." }
  }
  return { itemId }
}

export async function createItem(details, categories) {
  const { categoryId, error: categoryError } = await resolveCategory(
    categories,
    details.category,
  )
  if (categoryError) return { error: categoryError }

  const { data: newItem, error } = await supabase
    .from('items')
    .insert({
      household_id: HOUSEHOLD_ID,
      name: details.name,
      category_id: categoryId,
      selection_criteria: details.selectionCriteria.trim() || null,
    })
    .select()
    .single()
  if (error) {
    console.error(error)
    return { error: "Couldn't create the item. Try again." }
  }

  if (details.brandName.trim() || details.imageUrl) {
    // a photo with no brand typed in is saved under the item's own name
    await supabase.from('item_brands').insert({
      item_id: newItem.id,
      brand_name: details.brandName.trim() || details.name,
      image_url: details.imageUrl.trim() || null,
      is_preferred: true,
    })
  }

  return linkStores(newItem.id, details.stores)
}

// Categories rows already have the { id, name } shape Autocomplete wants.
export function categoryOptions(categories) {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name))
}

export function findCategory(categories, name) {
  const key = name.trim().toLowerCase()
  return categories.find((c) => c.name.toLowerCase() === key)
}

// Turns a typed category name into a category id: an existing category
// whose name matches (ignoring case), or a new one. A blank name, or
// "uncategorized", means no category. Returns { categoryId } or { error }.
export async function resolveCategory(categories, name) {
  const trimmed = name.trim()
  if (!trimmed || trimmed.toLowerCase() === 'uncategorized') return { categoryId: null }

  const match = findCategory(categories, trimmed)
  if (match) return { categoryId: match.id }

  const { data, error } = await supabase
    .from('categories')
    .insert({ household_id: HOUSEHOLD_ID, name: trimmed })
    .select()
    .single()
  if (!error) return { categoryId: data.id }

  // someone else created the same name since our last load
  if (error.code === '23505') {
    const { data: fresh } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', HOUSEHOLD_ID)
    const created = findCategory(fresh || [], trimmed)
    if (created) return { categoryId: created.id }
  }
  console.error(error)
  return { error: "Couldn't save the category. Try again." }
}
