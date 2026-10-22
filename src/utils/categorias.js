import { CATEGORIAS } from '../config'

// Ordena una lista de nombres según el orden de referencia; los que no
// están en la referencia van al final, en el orden en que aparecieron.
function ordenarSegun(nombres, referencia) {
  const pos = (n) => {
    const i = referencia.indexOf(n)
    return i === -1 ? referencia.length : i
  }
  return [...nombres].sort((a, b) => pos(a) - pos(b))
}

export function ordenarCategorias(nombres) {
  return ordenarSegun(nombres, CATEGORIAS.map((c) => c.nombre))
}

export function ordenarSubcategorias(categoria, nombres) {
  const ref = CATEGORIAS.find((c) => c.nombre === categoria)
  return ordenarSegun(nombres, ref ? ref.subcategorias : [])
}

export function infoCategoria(nombre) {
  return CATEGORIAS.find((c) => c.nombre === nombre) || null
}
