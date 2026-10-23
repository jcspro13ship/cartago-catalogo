import { llamar } from './api'

// Las fotos del celular pesan 3–10 MB. Antes de subirlas se reducen a 2000 px
// de lado: suben mucho más rápido y Cloudinary igual las entrega optimizadas.
export async function reducirImagen(archivo, maximo = 2000) {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto.'))), 'image/jpeg', 0.86)
  )
}

export async function subirFoto(archivo) {
  const firma = await llamar('firmaFoto')
  const blob = await reducirImagen(archivo)
  if (firma.mock) return URL.createObjectURL(blob)
  const datos = new FormData()
  datos.append('file', blob, archivo.name.replace(/\.[^.]+$/, '') + '.jpg')
  datos.append('api_key', firma.apiKey)
  datos.append('timestamp', String(firma.timestamp))
  datos.append('folder', firma.folder)
  datos.append('signature', firma.signature)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`, { method: 'POST', body: datos })
  const json = await res.json()
  if (!res.ok) throw new Error((json.error && json.error.message) || 'No se pudo subir la foto.')
  return json.secure_url
}
