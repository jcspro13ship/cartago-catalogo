export function formatoPrecio(valor) {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

// Un precio en 0 o vacío en el Sheet significa "a consultar" (piezas por
// encargo, monturas a medida, etc.): el producto se puede pedir igual y
// Cartago cotiza por WhatsApp.
export function textoPrecio(precio) {
  return precio > 0 ? formatoPrecio(precio) : 'Precio a consultar'
}

// Para comparar texto sin importar tildes ni mayúsculas ("montura" encuentra "Montúra").
export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
