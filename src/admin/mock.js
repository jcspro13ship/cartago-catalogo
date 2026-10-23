// SOLO DESARROLLO: imita al Apps Script en memoria para probar el panel sin
// Google Sheet. Usuario de prueba: demo / demo1234. No se incluye en la
// versión publicada (api.js solo lo carga con import.meta.env.DEV).
import { productos as productosEjemplo } from '../data/productos'
import { variantes as variantesEjemplo } from '../data/variantes'

const estado = {
  productos: productosEjemplo.map((p) => ({ ...p, imagenes: [] })),
  variantes: variantesEjemplo.map((v) => ({ ...v })),
  marcas: [
    { marca: 'Cartago', logo: '' },
    { marca: 'San Fermín', logo: '' },
    { marca: 'Mesacé', logo: '' },
    { marca: 'Al Torno', logo: '' },
    { marca: 'Sybec', logo: '' },
    { marca: 'Natural V.', logo: '' },
    { marca: 'Cheval', logo: '' },
  ],
  config: { tasa_usd: 3000 },
  usuarios: { demo: { nombre: 'Usuario de prueba', clave: 'demo1234' } },
  sesiones: {},
  historial: [],
}

function registrar(usuario, accion, detalle) {
  estado.historial.unshift({ fecha: new Date().toISOString(), usuario, accion, detalle })
}

const espera = () => new Promise((r) => setTimeout(r, 250))

export async function atenderMock(p) {
  await espera()
  if (p.accion === 'login') {
    const u = estado.usuarios[String(p.usuario || '').toLowerCase()]
    if (!u || u.clave !== p.clave) return { ok: false, error: 'Usuario o contraseña incorrectos.' }
    const token = Math.random().toString(36).slice(2)
    estado.sesiones[token] = p.usuario.toLowerCase()
    return { ok: true, token, usuario: p.usuario.toLowerCase(), nombre: u.nombre }
  }
  const usuario = estado.sesiones[p.token]
  if (!usuario) return { ok: false, error: 'Tu sesión venció. Vuelve a iniciar sesión.', sesion: false }

  switch (p.accion) {
    case 'datos':
      return {
        ok: true,
        usuario,
        datos: structuredClone({ productos: estado.productos, variantes: estado.variantes, marcas: estado.marcas, config: estado.config }),
        usuarios: Object.entries(estado.usuarios).map(([u, d]) => ({ usuario: u, nombre: d.nombre })),
        historial: estado.historial.slice(0, 40),
      }
    case 'guardarProducto': {
      const prod = p.producto
      const i = estado.productos.findIndex((x) => x.id === prod.id)
      if (p.nuevo && i >= 0) return { ok: false, error: `Ya existe un producto con el id ${prod.id}.` }
      const registro = { ...prod, imagenes: p.imagenes || [] }
      if (i >= 0) estado.productos[i] = registro
      else estado.productos.push(registro)
      estado.variantes = estado.variantes.filter((v) => v.producto_id !== prod.id).concat(
        (p.variantes || []).map((v) => ({ ...v, producto_id: prod.id }))
      )
      registrar(usuario, p.nuevo ? 'Creó producto' : 'Editó producto', `${prod.id} · ${prod.nombre}`)
      return { ok: true }
    }
    case 'eliminarProducto':
      estado.productos = estado.productos.filter((x) => x.id !== p.id)
      estado.variantes = estado.variantes.filter((v) => v.producto_id !== p.id)
      registrar(usuario, 'Eliminó producto', p.id)
      return { ok: true }
    case 'ajustarStock': {
      const v = estado.variantes.find((x) => x.sku === p.sku)
      if (!v) return { ok: false, error: 'No existe la variante.' }
      v.stock = Math.max(0, v.stock + Number(p.cambio))
      registrar(usuario, p.cambio < 0 ? 'Vendió / restó stock' : 'Sumó stock', `${p.sku} → ${v.stock}`)
      return { ok: true, stock: v.stock }
    }
    case 'guardarConfig':
      Object.assign(estado.config, p.config)
      registrar(usuario, 'Cambió configuración', JSON.stringify(p.config))
      return { ok: true }
    case 'guardarMarcas':
      estado.marcas = p.marcas
      registrar(usuario, 'Actualizó marcas', `${p.marcas.length} marcas`)
      return { ok: true }
    case 'firmaFoto':
      return { ok: true, mock: true }
    case 'crearUsuario':
      if (estado.usuarios[p.nuevoUsuario]) return { ok: false, error: 'Ese usuario ya existe.' }
      if (String(p.clave || '').length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
      estado.usuarios[p.nuevoUsuario] = { nombre: p.nombre, clave: p.clave }
      registrar(usuario, 'Creó usuario', p.nuevoUsuario)
      return { ok: true }
    case 'cambiarClave':
      if (estado.usuarios[usuario].clave !== p.claveActual) return { ok: false, error: 'La contraseña actual no es correcta.' }
      estado.usuarios[usuario].clave = p.claveNueva
      return { ok: true }
    case 'logout':
      delete estado.sesiones[p.token]
      return { ok: true }
    default:
      return { ok: false, error: 'Acción desconocida' }
  }
}
