import { WHATSAPP_NUMBER } from '../config'

export function linkWhatsApp(texto) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`
}
