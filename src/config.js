// TODO: reemplazar por el número real de WhatsApp de Cartago (con código de país, sin +, sin espacios)
export const WHATSAPP_NUMBER = '573000000000'

// Apps Script publicado sobre el Google Sheet del inventario (ver docs/INSTRUCTIVO_TECNICO.md).
// Mientras esté vacío, el sitio usa los datos de ejemplo en src/data/.
export const SHEETS_API_URL = ''

// Datos de contacto que aparecen en el pie de página y en "Nosotros".
// Los campos vacíos simplemente no se muestran.
export const EMPRESA = {
  nombre: 'Talabartería Cartago',
  razonSocial: 'Cartago Talabartería SAS',
  fundacion: 1992,
  ciudad: 'Cartago, Valle del Cauca', // TODO: confirmar
  direccion: '', // TODO: dirección de la tienda física
  horario: '', // TODO: ej. 'Lunes a sábado · 8:00 a.m. – 6:00 p.m.'
  telefono: '', // TODO: teléfono fijo o celular para mostrar
  instagram: '', // TODO: usuario sin @, ej. 'talabarteriacartago'
  facebook: '', // TODO: URL completa de la página
}

// Tasa de cambio para mostrar precios en dólares mientras el Sheet no tenga
// una propia (hoja "Configuracion", clave tasa_usd). Es un valor de EJEMPLO:
// la tasa real la definen y actualizan Cartago desde el Sheet.
export const TASA_USD_EJEMPLO = 4000
