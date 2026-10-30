// Las fotos pueden venir de dos lugares:
// - Cloudinary (las que se suben desde el panel): se piden en el ancho exacto
//   insertando una transformación en la URL.
// - El propio sitio (carga inicial, "fotos/1405/1.webp"): cada foto existe en
//   dos tamaños, el normal (1400 px) y uno chico terminado en "-s" (600 px).
const BASE = import.meta.env.BASE_URL
const ANCHO_CHICA = 600

function esLocal(url) {
  return !/^(https?:)?\/\//.test(url) && !url.startsWith('data:')
}

function local(url, ancho) {
  const ruta = BASE + url.replace(/^\//, '')
  return ancho <= ANCHO_CHICA ? ruta.replace(/\.webp$/, '-s.webp') : ruta
}

export function conAncho(url, ancho) {
  if (!url) return url
  if (esLocal(url)) return local(url, ancho)
  const marcador = '/upload/'
  const i = url.indexOf(marcador)
  if (i === -1) return url
  const inicio = i + marcador.length
  return `${url.slice(0, inicio)}w_${ancho},c_limit,q_auto,f_auto/${url.slice(inicio)}`
}

// srcset con varios anchos para que el celular descargue la versión pequeña
// y una pantalla grande la nítida.
export function srcSet(url, anchos) {
  if (!url) return undefined
  if (esLocal(url)) return `${local(url, ANCHO_CHICA)} ${ANCHO_CHICA}w, ${local(url, 1400)} 1400w`
  if (!url.includes('/upload/')) return undefined
  return anchos.map((a) => `${conAncho(url, a)} ${a}w`).join(', ')
}
