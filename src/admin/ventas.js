import { formatoPrecio } from '../utils/formato'

export const ESTADOS_COTIZACION = ['Nueva', 'Borrador', 'Enviada', 'Convertida', 'Anulada']
export const ESTADOS_PEDIDO = ['Por pagar', 'Pagado', 'Despachado', 'Entregado', 'Cancelado']

export const VALIDEZ_DIAS = 8
export const CONDICIONES = [
  'Precios en pesos colombianos con IVA incluido.',
  'Formas de pago: link de pago (tarjeta de crédito, débito o transferencia), contraentrega con Dropi en envíos nacionales menores a $1.000.000, o giro internacional.',
  'El costo del envío se confirma según el destino.',
  'Los productos personalizados se fabrican una vez confirmado el pago.',
  'Cotización sujeta a disponibilidad de inventario.',
].join('\n')

export function subtotal(items) {
  return items.reduce((acc, it) => acc + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0)
}

export function total(doc) {
  return Math.max(0, subtotal(doc.items) - (Number(doc.descuento) || 0) + (Number(doc.envio) || 0))
}

export function dinero(valor) {
  return valor > 0 ? formatoPrecio(valor) : 'A consultar'
}

export function fechaCorta(valor) {
  const d = valor ? new Date(valor) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fechaLarga(valor) {
  const d = valor ? new Date(valor) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function detalleItem(it) {
  return [it.color && `Color: ${it.color}`, it.talla && `Tamaño: ${it.talla}`, it.personalizacion && `Personalización: ${it.personalizacion}`]
    .filter(Boolean)
    .join(' · ')
}

// Celular colombiano de 10 dígitos → con indicativo 57 para el link de WhatsApp.
export function telefonoWhatsApp(telefono) {
  const digitos = String(telefono || '').replace(/\D/g, '')
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`
  return digitos
}

export function linkWhatsAppCliente(telefono, mensaje) {
  const numero = telefonoWhatsApp(telefono)
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

// Opciones del catálogo para agregar a una cotización: una por cada color o
// tamaño, con su precio.
export function opcionesCatalogo(productos, variantes) {
  const porProducto = {}
  variantes.forEach((v) => {
    ;(porProducto[v.producto_id] = porProducto[v.producto_id] || []).push(v)
  })
  const lista = []
  productos.forEach((p) => {
    const vs = porProducto[p.id] && porProducto[p.id].length ? porProducto[p.id] : [{ sku: p.id, color: '', talla: '', precio: 0 }]
    vs.forEach((v) => {
      lista.push({
        sku: v.sku,
        producto_id: p.id,
        nombre: p.nombre,
        color: v.color || '',
        talla: v.talla || '',
        precio: Number(v.precio) > 0 ? Number(v.precio) : Number(p.precio) || 0,
        imagen: (p.imagenes && p.imagenes[0]) || '',
        stock: v.stock,
        activo: p.activo,
        busqueda: `${p.id} ${p.nombre} ${v.color || ''} ${v.talla || ''} ${p.marca || ''}`,
      })
    })
  })
  return lista
}
