// Si la URL es de Cloudinary, permite pedirla en un ancho distinto (más chica
// para tarjetas de catálogo, más grande para la ficha de producto) insertando
// una transformación en la URL. Con cualquier otra URL la deja tal cual.
export function conAncho(url, ancho) {
  if (!url) return url
  const marcador = '/upload/'
  const i = url.indexOf(marcador)
  if (i === -1) return url
  const inicio = i + marcador.length
  return `${url.slice(0, inicio)}w_${ancho},c_limit,q_auto,f_auto/${url.slice(inicio)}`
}

// srcset con varios anchos para que el celular descargue la versión pequeña
// y una pantalla grande la nítida. Sin Cloudinary no aplica.
export function srcSet(url, anchos) {
  if (!url || !url.includes('/upload/')) return undefined
  return anchos.map((a) => `${conAncho(url, a)} ${a}w`).join(', ')
}
