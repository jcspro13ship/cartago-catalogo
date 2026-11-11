import { SHEETS_API_URL } from '../config'

// Deja registrado en el panel (Cotizaciones › Nueva) el pedido que el cliente
// acaba de enviar por WhatsApp. Se manda en segundo plano: si falla, el
// pedido igual llegó por WhatsApp. Precios y nombres los pone el Apps Script.
export function registrarPedidoWeb(pedido) {
  if (!SHEETS_API_URL) return
  try {
    fetch(SHEETS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: 'pedidoWeb', pedido }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // sin conexión: no pasa nada, el pedido va por WhatsApp
  }
}
