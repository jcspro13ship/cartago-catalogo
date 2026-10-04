import { productos as productosEjemplo } from './productos'
import { variantes as variantesEjemplo } from './variantes'
import { SHEETS_API_URL } from '../config'

const CLAVE_CACHE = 'cartago_catalogo_v1'

function esVerdadero(valor) {
  return valor === true || valor === 'TRUE' || valor === 'VERDADERO' || valor === 'SI' || valor === 'SÍ' || valor === 1
}

// Deja cada producto con la misma forma sin importar de dónde venga: fotos
// siempre como arreglo, precio numérico y banderas como booleanos.
function normalizarProductos(productos) {
  return productos.map((p) => ({
    ...p,
    id: String(p.id),
    precio: Number(p.precio) || 0,
    marca: p.marca ? String(p.marca) : '',
    imagenes: Array.isArray(p.imagenes) ? p.imagenes.filter(Boolean) : p.imagen ? [p.imagen] : [],
    activo: esVerdadero(p.activo),
    destacado: esVerdadero(p.destacado),
    personalizable: esVerdadero(p.personalizable),
    nota_personalizacion: p.nota_personalizacion ? String(p.nota_personalizacion) : '',
  }))
}

function normalizarVariantes(variantes) {
  return variantes.map((v) => ({
    producto_id: String(v.producto_id),
    sku: String(v.sku),
    color: v.color ? String(v.color).trim() : '',
    stock: Number(v.stock) || 0,
  }))
}

function datosEjemplo() {
  return {
    productos: normalizarProductos(productosEjemplo),
    variantes: normalizarVariantes(variantesEjemplo),
    fuente: 'ejemplo',
  }
}

function leerCache() {
  try {
    const crudo = localStorage.getItem(CLAVE_CACHE)
    if (!crudo) return null
    const data = JSON.parse(crudo)
    return {
      productos: normalizarProductos(data.productos),
      variantes: normalizarVariantes(data.variantes),
      fuente: 'cache',
    }
  } catch {
    return null
  }
}

// Lo último que se recibió del Sheet, para pintar el catálogo al instante en
// visitas repetidas mientras llega la versión fresca (el Apps Script tarda
// 1–3 segundos en responder). Si no hay nada guardado, devuelve null.
export function catalogoInicial() {
  if (!SHEETS_API_URL) return datosEjemplo()
  return leerCache()
}

// Si no hay URL configurada (SHEETS_API_URL vacío en config.js), el sitio
// funciona con los datos de ejemplo. En cuanto se configura la URL del
// Apps Script conectado al Google Sheet real, el catálogo se llena solo
// desde ahí — sin tocar código.
export async function cargarCatalogo() {
  if (!SHEETS_API_URL) return datosEjemplo()

  try {
    const res = await fetch(SHEETS_API_URL)
    if (!res.ok) throw new Error(`Respuesta no válida del Sheet (${res.status})`)
    const data = await res.json()
    if (!Array.isArray(data.productos) || !Array.isArray(data.variantes)) {
      throw new Error('Formato inesperado en la respuesta del Sheet')
    }
    try {
      localStorage.setItem(CLAVE_CACHE, JSON.stringify(data))
    } catch {
      // Sin espacio o en modo privado: el sitio funciona igual, solo sin caché.
    }
    return {
      productos: normalizarProductos(data.productos),
      variantes: normalizarVariantes(data.variantes),
      fuente: 'sheets',
    }
  } catch (err) {
    console.error('No se pudo cargar el catálogo desde Google Sheets.', err)
    return leerCache() || datosEjemplo()
  }
}
