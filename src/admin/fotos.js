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

// Traduce los errores de Cloudinary más comunes a algo que se entienda.
function mensajeCloudinary(texto) {
  const t = String(texto || '')
  // Se agrega el texto original de Cloudinary (nunca incluye la clave secreta):
  // dice cuál de los tres datos está mal.
  if (/unknown api key/i.test(t)) return `La API Key de Cloudinary no es correcta. Vuelve a pegarla en el Sheet (Catálogo web > 3). Detalle: ${t}`
  if (/cloud_name|cloud name/i.test(t)) return `El Cloud name de Cloudinary no es correcto. Vuelve a pegarlo en el Sheet (Catálogo web > 3). Detalle: ${t}`
  if (/signature/i.test(t)) return `El API Secret de Cloudinary no coincide con la API Key. Vuelve a pegarlo en el Sheet (Catálogo web > 3). Detalle: ${t}`
  if (/invalid image|unsupported|not a valid/i.test(t)) {
    return 'El archivo no es una imagen válida. Si es un link de Drive, compártelo como "Cualquier persona con el enlace".'
  }
  return t || 'No se pudo subir la foto.'
}

async function enviarACloudinary(file, nombre) {
  const firma = await llamar('firmaFoto')
  if (firma.mock) return typeof file === 'string' ? file : URL.createObjectURL(file)
  const datos = new FormData()
  if (nombre) datos.append('file', file, nombre)
  else datos.append('file', file)
  datos.append('api_key', firma.apiKey)
  datos.append('timestamp', String(firma.timestamp))
  datos.append('folder', firma.folder)
  datos.append('signature', firma.signature)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(firma.cloudName)}/image/upload`, { method: 'POST', body: datos })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(mensajeCloudinary((json.error && json.error.message) || `Cloudinary respondió ${res.status}`))
  return json.secure_url
}

export async function subirFoto(archivo) {
  let blob
  try {
    blob = await reducirImagen(archivo)
  } catch {
    // Formatos que el navegador no sabe abrir (p. ej. HEIC del iPhone en
    // Chrome): se sube el original y Cloudinary lo convierte.
    if (archivo.size > 10 * 1024 * 1024) throw new Error('La foto pesa más de 10 MB y no se pudo reducir. Envíala en JPG.')
    return enviarACloudinary(archivo, archivo.name)
  }
  return enviarACloudinary(blob, archivo.name.replace(/\.[^.]+$/, '') + '.jpg')
}

// Link de una foto en Drive ("…/file/d/ID/view", "open?id=ID"…) → link de
// descarga directa. Devuelve null si no es un archivo de Drive.
export function linkDirectoDrive(url) {
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/)
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : null
}

// Una foto pegada como link (de Drive o de cualquier página) se copia a
// Cloudinary: así no depende de que el link original siga existiendo.
export async function subirFotoDesdeLink(url) {
  url = url.trim()
  if (/drive\.google\.com\/drive\/(u\/\d+\/)?folders\//.test(url)) {
    throw new Error('Ese es el link de una carpeta. Abre la foto en Drive y copia el link de esa foto.')
  }
  return enviarACloudinary(linkDirectoDrive(url) || url)
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
