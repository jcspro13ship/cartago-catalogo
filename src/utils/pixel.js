import { META_PIXEL_ID } from '../config'

// Píxel de Meta: mide visitas y pedidos para las campañas de Facebook e
// Instagram. Solo corre en la versión publicada; el panel /admin no lo carga.
let iniciado = false

export function iniciarPixel() {
  if (iniciado || !META_PIXEL_ID || !import.meta.env.PROD) return
  iniciado = true
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */
  window.fbq('init', META_PIXEL_ID)
}

export function rastrear(evento, datos) {
  // La ficha de producto puede avisar antes que el Layout: se inicia aquí mismo.
  iniciarPixel()
  if (window.fbq) window.fbq('track', evento, datos)
}
