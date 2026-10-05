import { supabase, HOUSEHOLD_ID } from '../supabaseClient'

const BUCKET = 'item-photos'
const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.82

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // older browsers: let an <img> decode it instead (applies EXIF rotation)
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

// Phone photos are several MB; shrink to a web-sized JPEG before uploading.
export async function resizeImage(file) {
  const source = await decode(file)
  const width = source.naturalWidth || source.width
  const height = source.naturalHeight || source.height
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  )
}

// Resizes and uploads a photo, returning its public URL.
export async function uploadPhoto(file) {
  const blob = await resizeImage(file)
  const path = `${HOUSEHOLD_ID}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000', // every upload gets a new path, so it never changes
  })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
