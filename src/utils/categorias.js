import { CATEGORIAS } from '../config'
import { normalizar } from './formato'

const igual = (a, b) => normalizar(a).trim() === normalizar(b).trim()

// Ordena una lista de nombres según el orden de referencia; los que no
// están en la referencia van al final, en el orden en que aparecieron.
function ordenarSegun(nombres, referencia) {
  const pos = (n) => {
    const i = referencia.findIndex((r) => igual(r, n))
    return i === -1 ? referencia.length : i
  }
  return [...nombres].sort((a, b) => pos(a) - pos(b))
}

export function ordenarCategorias(nombres) {
  return ordenarSegun(nombres, CATEGORIAS.map((c) => c.nombre))
}

export function infoCategoria(nombre) {
  return CATEGORIAS.find((c) => igual(c.nombre, nombre)) || null
}

// Nodo del árbol en un camino ['Accesorios', 'Caballo', 'Cabeza'].
export function nodoEn(ruta) {
  let nivel = CATEGORIAS
  let nodo = null
  for (const nombre of ruta) {
    nodo = (nivel || []).find((n) => igual(n.nombre, nombre))
    if (!nodo) return null
    nivel = nodo.hijos
  }
  return nodo
}

function buscarHoja(nodo, hoja, camino) {
  for (const hijo of nodo.hijos || []) {
    const ruta = [...camino, hijo.nombre]
    if (igual(hijo.nombre, hoja)) return ruta
    const encontrada = buscarHoja(hijo, hoja, ruta)
    if (encontrada) return encontrada
  }
  return null
}

// Camino completo de un producto, de la categoría a su subcategoría:
// {categoria: 'Accesorios', subcategoria: 'Aperos'} → ['Accesorios', 'Caballo', 'Cabeza', 'Aperos'].
// Si la subcategoría no está en el árbol, el camino queda [categoria, subcategoria].
export function rutaDeProducto(p) {
  if (!p.categoria) return []
  const raiz = infoCategoria(p.categoria)
  const categoria = raiz ? raiz.nombre : p.categoria
  if (!p.subcategoria) return [categoria]
  const ruta = raiz && buscarHoja(raiz, p.subcategoria, [categoria])
  return ruta || [categoria, p.subcategoria]
}

// ¿El producto está dentro de este camino (o en alguna rama debajo)?
export function estaEnRuta(p, ruta) {
  const propia = p._ruta || rutaDeProducto(p)
  return ruta.every((nombre, i) => propia[i] && igual(propia[i], nombre))
}

// Orden de los hijos de un camino según el árbol.
export function ordenarHijos(ruta, nombres) {
  const nodo = nodoEn(ruta)
  return ordenarSegun(nombres, nodo ? (nodo.hijos || []).map((h) => h.nombre) : [])
}

// Todas las subcategorías finales de una categoría, con su camino, para el
// selector del panel: [{nombre: 'Aperos', etiqueta: 'Caballo › Cabeza › Aperos'}].
export function hojasDe(categoria) {
  const raiz = infoCategoria(categoria)
  if (!raiz) return []
  const lista = []
  const recorrer = (nodo, camino) => {
    for (const hijo of nodo.hijos || []) {
      const ruta = [...camino, hijo.nombre]
      if (hijo.hijos && hijo.hijos.length) recorrer(hijo, ruta)
      else lista.push({ nombre: hijo.nombre, etiqueta: ruta.join(' › ') })
    }
  }
  recorrer(raiz, [])
  return lista
}

// Link del catálogo para un camino: ['Accesorios', 'Caballo'] →
// /catalogo?categoria=Accesorios&ruta=Caballo
export function linkACamino(camino) {
  if (!camino.length) return '/catalogo'
  const params = new URLSearchParams({ categoria: camino[0] })
  if (camino.length > 1) params.set('ruta', camino.slice(1).join('/'))
  return `/catalogo?${params.toString()}`
}

// Accesos de la página de inicio y del menú: los grupos que un cliente busca
// primero. Cada uno es un camino del árbol.
export const VITRINA = [
  { titulo: 'Monturas', camino: ['Monturas'] },
  { titulo: 'Para el caballo', camino: ['Accesorios', 'Caballo'] },
  { titulo: 'Para el jinete', camino: ['Accesorios', 'Jinete'] },
  { titulo: 'Cuidado del caballo', camino: ['Cuidado del caballo'] },
  { titulo: 'Caninos', camino: ['Caninos'] },
]
