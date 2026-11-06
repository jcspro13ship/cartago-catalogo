import { productos as productosEjemplo } from './productos'
import { variantes as variantesEjemplo } from './variantes'
import { SHEETS_API_URL, TASA_USD_EJEMPLO } from '../config'

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
    precio_usd: Number(p.precio_usd) || 0,
    marca: p.marca ? String(p.marca).trim() : '',
    subcategoria: p.subcategoria ? String(p.subcategoria).trim() : '',
    categoria: p.categoria ? String(p.categoria).trim() : '',
    garantia: p.garantia ? String(p.garantia) : '',
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
    talla: v.talla ? String(v.talla).trim() : '',
    // Precio propio del tamaño; 0 = usa el precio del producto.
    precio: Number(v.precio) || 0,
    // Stock vacío en el Sheet = sin control de inventario: siempre disponible.
    stock: v.stock === '' || v.stock === null || v.stock === undefined ? null : Number(v.stock) || 0,
  }))
}

// Con tamaños de distinto precio, el catálogo muestra "Desde" el menor. El
// precio del producto se conserva en precio_base para las opciones sin precio propio.
function conPrecioDesde(productos, variantes) {
  const precios = {}
  variantes.forEach((v) => {
    if (v.precio > 0) (precios[v.producto_id] = precios[v.producto_id] || []).push(v.precio)
  })
  return productos.map((p) => {
    const lista = precios[p.id]
    if (!lista) return { ...p, precio_base: p.precio }
    const minimo = Math.min(...lista)
    return { ...p, precio_base: p.precio, precio: minimo, precio_usd: 0, precio_desde: lista.some((x) => x !== minimo) }
  })
}

function armar(data, fuente) {
  const variantes = normalizarVariantes(data.variantes)
  return {
    productos: conPrecioDesde(normalizarProductos(data.productos), variantes),
    variantes,
    config: normalizarConfig(data.config, data.marcas),
    fuente,
  }
}

// Ajustes generales que Cartago edita en la hoja "Configuracion" (clave | valor).
function normalizarConfig(config, marcas) {
  const tasa = Number(config && config.tasa_usd)
  const logos = {}
  ;(Array.isArray(marcas) ? marcas : []).forEach((m) => {
    if (m && m.marca && m.logo) logos[String(m.marca).trim()] = String(m.logo)
  })
  let preguntas = null
  try {
    const lista = JSON.parse((config && config.preguntas_frecuentes) || 'null')
    if (Array.isArray(lista)) preguntas = lista.filter((p) => p && p.pregunta && p.respuesta)
  } catch {
    // Si el JSON quedó mal escrito se usan las preguntas por defecto.
  }
  const texto = (clave) => String((config && config[clave]) || '').trim()
  const avisos = texto('avisos').split('\n').map((a) => a.trim()).filter(Boolean)
  return {
    tasaUsd: tasa > 0 ? tasa : TASA_USD_EJEMPLO,
    logosMarcas: logos,
    preguntas,
    videos: { personalizacion: texto('video_personalizacion'), inicio: texto('video_inicio') },
    marcas: (Array.isArray(marcas) ? marcas : []).map((m) => String((m && m.marca) || '').trim()).filter(Boolean),
    avisos: avisos.length ? avisos : null,
    avisosMarcas: texto('avisos_marcas') !== 'NO',
  }
}

function datosEjemplo() {
  return armar({ productos: productosEjemplo, variantes: variantesEjemplo, config: null }, 'ejemplo')
}

function leerCache() {
  try {
    const crudo = localStorage.getItem(CLAVE_CACHE)
    if (!crudo) return null
    return armar(JSON.parse(crudo), 'cache')
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
    return armar(data, 'sheets')
  } catch (err) {
    console.error('No se pudo cargar el catálogo desde Google Sheets.', err)
    return leerCache() || datosEjemplo()
  }
}
