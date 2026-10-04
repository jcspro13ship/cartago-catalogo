export function formatoPrecio(valor, moneda = 'COP') {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: moneda, maximumFractionDigits: 0 })
}

// Precio de un producto en la moneda elegida. En dólares usa el precio_usd
// del Sheet si existe; si no, convierte el precio en pesos con la tasa.
export function precioEn(item, moneda, tasaUsd) {
  if (moneda === 'USD') {
    if (item.precio_usd > 0) return item.precio_usd
    return item.precio > 0 && tasaUsd > 0 ? Math.ceil(item.precio / tasaUsd) : 0
  }
  return item.precio > 0 ? item.precio : 0
}

// Un precio en 0 o vacío en el Sheet significa "a consultar" (piezas por
// encargo, monturas a medida, etc.): el producto se puede pedir igual y
// Cartago cotiza por WhatsApp.
export function textoPrecio(valor, moneda = 'COP') {
  return valor > 0 ? formatoPrecio(valor, moneda) : 'Precio a consultar'
}

// Para comparar texto sin importar tildes ni mayúsculas ("montura" encuentra "Montúra").
export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
