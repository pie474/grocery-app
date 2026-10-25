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

export async function createItem(details) {
  const { data: newItem, error } = await supabase
    .from('items')
    .insert({
      household_id: HOUSEHOLD_ID,
      name: details.name,
      category: details.category.trim() || 'uncategorized',
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

// Distinct categories already in the catalog, shaped as Autocomplete options.
export function categoryOptions(items) {
  const names = new Set(
    items.map((i) => i.category?.trim()).filter((c) => c && c !== 'uncategorized'),
  )
  return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ id: name, name }))
}
