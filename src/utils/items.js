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

// Postgres / PostgREST codes for a table that doesn't exist: what
// item_photos gets before migrations/005_item_photo.sql has been run.
const MISSING_TABLE = ['42P01', 'PGRST205']

export function isMissingTable(error) {
  return MISSING_TABLE.includes(error?.code)
}

export function itemPhotoError(error) {
  return isMissingTable(error)
    ? "Item photos aren't set up on this database yet. Whoever manages the app can run migrations/005_item_photo.sql to turn them on. Remove the photos to save without them."
    : null
}

// Replaces an item's own photos with `urls`, in that order.
export async function saveItemPhotos(itemId, urls) {
  const { error: clearError } = await supabase.from('item_photos').delete().eq('item_id', itemId)
  if (clearError) return clearError
  if (!urls.length) return null
  const { error } = await supabase
    .from('item_photos')
    .insert(urls.map((image_url, position) => ({ item_id: itemId, image_url, position })))
  return error
}

// An item's own photo URLs in display order, from the item_photos rows.
export function photoUrlsFor(photos, itemId) {
  return photos
    .filter((p) => p.item_id === itemId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((p) => p.image_url)
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

  if (details.photos?.length) {
    const photoError = await saveItemPhotos(newItem.id, details.photos)
    if (photoError) {
      console.error(photoError)
      // take the half-made item back out, so trying again doesn't hit
      // "that item already exists"
      await supabase.from('items').delete().eq('id', newItem.id)
      return { error: itemPhotoError(photoError) || "Couldn't save the photos. Try again." }
    }
  }

  if (details.brandName.trim() || details.brandImageUrl) {
    // a brand photo with no brand typed in is saved under the item's own name
    await supabase.from('item_brands').insert({
      item_id: newItem.id,
      brand_name: details.brandName.trim() || details.name,
      image_url: details.brandImageUrl || null,
      is_preferred: true,
    })
  }

  return linkStores(newItem.id, details.stores)
}

// The household's own order (store-aisle order, set in the category
// manager) first, then alphabetical. Categories that haven't been placed
// yet, and every category before migrations/003_category_order.sql has
// run (the column is simply missing then), sort after the placed ones.
export function sortCategories(categories) {
  return [...categories].sort((a, b) => {
    const aOrder = a.sort_order ?? null
    const bOrder = b.sort_order ?? null
    if (aOrder !== bOrder) {
      if (aOrder === null) return 1
      if (bOrder === null) return -1
      return aOrder - bOrder
    }
    return a.name.localeCompare(b.name)
  })
}

// Categories rows already have the { id, name } shape Autocomplete wants.
export function categoryOptions(categories) {
  return sortCategories(categories)
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
