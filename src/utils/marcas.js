import { LOGOS_MARCAS } from '../config'
import { normalizar } from './formato'

// Busca el logo de una marca sin importar tildes ni mayúsculas
// ("San Fermin" encuentra "San Fermín"). Primero los logos que vienen
// del Sheet (hoja Marcas), luego los que trae el sitio.
export function logoDeMarca(marca, logosSheet = {}) {
  if (!marca) return null
  const clave = normalizar(marca).trim()
  for (const fuente of [logosSheet, LOGOS_MARCAS]) {
    for (const [nombre, logo] of Object.entries(fuente)) {
      if (normalizar(nombre).trim() === clave) return logo
    }
  }
  return null
}
