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

// Videos cortos grabados con el celular. Van tal cual a Cloudinary (el plan
// gratis acepta hasta 100 MB por video) y se entregan optimizados con
// f_auto,q_auto. Usa la misma firma de las fotos.
export const MAX_VIDEO_MB = 100

export async function subirVideo(archivo, alProgreso) {
  if (archivo.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`El video pesa ${Math.round(archivo.size / 1048576)} MB y el máximo es ${MAX_VIDEO_MB} MB. Para videos largos usa un link de YouTube.`)
  }
  const firma = await llamar('firmaFoto')
  if (firma.mock) return URL.createObjectURL(archivo)
  const datos = new FormData()
  datos.append('file', archivo)
  datos.append('api_key', firma.apiKey)
  datos.append('timestamp', String(firma.timestamp))
  datos.append('folder', firma.folder)
  datos.append('signature', firma.signature)
  // XMLHttpRequest en vez de fetch para poder mostrar el porcentaje de subida.
  const json = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${firma.cloudName}/video/upload`)
    xhr.upload.onprogress = (e) => e.lengthComputable && alProgreso && alProgreso(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let r = {}
      try {
        r = JSON.parse(xhr.responseText)
      } catch {
        // respuesta vacía: se informa abajo
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(r)
      else reject(new Error((r.error && r.error.message) || 'No se pudo subir el video.'))
    }
    xhr.onerror = () => reject(new Error('Se perdió la conexión mientras subía el video. Inténtalo de nuevo.'))
    xhr.send(datos)
  })
  return json.secure_url.replace('/video/upload/', '/video/upload/f_auto,q_auto/')
}
