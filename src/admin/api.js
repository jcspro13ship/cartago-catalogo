import { SHEETS_API_URL } from '../config'

const CLAVE_SESION = 'cartago_admin_sesion'
const CLAVE_CACHE_CATALOGO = 'cartago_catalogo_v1'

export function sesionGuardada() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_SESION))
  } catch {
    return null
  }
}

function guardarSesion(sesion) {
  try {
    if (sesion) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    else sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // Sin almacenamiento la sesión dura solo mientras la pestaña esté abierta.
  }
}

// Todo pedido al Apps Script va como texto plano: así el navegador no hace la
// consulta previa de CORS, que Apps Script no sabe responder.
async function enviar(cuerpo) {
  if (!SHEETS_API_URL) {
    // En desarrollo, sin Sheet conectado, el panel funciona contra datos de
    // prueba en memoria. Este bloque no existe en la versión publicada.
    if (import.meta.env.DEV) {
      const { atenderMock } = await import('./mock')
      return atenderMock(cuerpo)
    }
    return { ok: false, error: 'El panel todavía no está conectado al Google Sheet.' }
  }
  const res = await fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(cuerpo),
  })
  if (!res.ok) throw new Error(`No se pudo conectar con el Sheet (${res.status}).`)
  return res.json()
}

export class ErrorPanel extends Error {
  constructor(mensaje, sesionVencida) {
    super(mensaje)
    this.sesionVencida = sesionVencida
  }
}

export async function llamar(accion, datos = {}) {
  const sesion = sesionGuardada()
  const r = await enviar({ accion, token: sesion && sesion.token, ...datos })
  if (!r.ok) {
    if (r.sesion === false) guardarSesion(null)
    throw new ErrorPanel(r.error || 'Ocurrió un error.', r.sesion === false)
  }
  // Después de cualquier cambio, la tienda en este navegador vuelve a leer el
  // catálogo fresco en vez de usar la copia guardada.
  if (accion !== 'datos' && accion !== 'firmaFoto') {
    try {
      localStorage.removeItem(CLAVE_CACHE_CATALOGO)
    } catch {
      // nada que limpiar
    }
  }
  return r
}

export async function iniciarSesion(usuario, clave) {
  const r = await enviar({ accion: 'login', usuario, clave })
  if (!r.ok) throw new ErrorPanel(r.error || 'No se pudo iniciar sesión.')
  const sesion = { token: r.token, usuario: r.usuario, nombre: r.nombre }
  guardarSesion(sesion)
  return sesion
}

export async function cerrarSesion() {
  try {
    await llamar('logout')
  } catch {
    // aunque falle, la sesión local se borra
  }
  guardarSesion(null)
}
