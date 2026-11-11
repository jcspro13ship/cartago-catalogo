import { EMPRESA } from '../config'
import { conAncho } from '../utils/imagenUrl'
import { CONDICIONES, VALIDEZ_DIAS, dinero, fechaLarga, subtotal, total } from './ventas'

// PDF de cotización o pedido con la imagen de Cartago: franja vino, logo TC,
// datos de la empresa, tabla con fotos y totales. jsPDF se descarga solo al
// generar el primer PDF, para que el panel cargue rápido.

const VINO = [138, 13, 64]
const CARBON = [33, 35, 34]
const GRIS = [98, 97, 94]
const GRIS_CLARO = [243, 245, 246]
const BASE = import.meta.env.BASE_URL

// Las fuentes estándar del PDF solo traen caracteres latinos básicos.
function t(valor) {
  return String(valor == null ? '' : valor)
    .replace(/[″“”]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/›/g, '>')
    .replace(/…/g, '...')
    .replace(/[^\x20-\xFF\n]/g, '')
}

// Carga una imagen y la pasa a JPEG (o PNG si tiene transparencia) para el PDF.
function cargarImagen(url, lado, png) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const tiempo = setTimeout(() => resolve(null), 8000)
    img.onload = () => {
      clearTimeout(tiempo)
      try {
        const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight))
        const c = document.createElement('canvas')
        c.width = Math.round(img.naturalWidth * escala)
        c.height = Math.round(img.naturalHeight * escala)
        const ctx = c.getContext('2d')
        if (!png) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, c.width, c.height)
        }
        ctx.drawImage(img, 0, 0, c.width, c.height)
        resolve({ datos: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85), ancho: c.width, alto: c.height })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => {
      clearTimeout(tiempo)
      resolve(null)
    }
    img.src = url
  })
}

function urlFoto(url) {
  if (!url) return ''
  return conAncho(url, 300)
}

/**
 * @param {object} doc  cotización o pedido (numero, fecha, cliente…, items, descuento, envio, notas)
 * @param {'cotizacion'|'pedido'} tipo
 * @param {object} config  configuración del Sheet (empresa_nit, cotizacion_condiciones…)
 */
export async function generarPdf(doc, tipo, config = {}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const ancho = pdf.internal.pageSize.getWidth()
  const alto = pdf.internal.pageSize.getHeight()
  const m = 16

  const [logo, ...fotos] = await Promise.all([
    cargarImagen(`${BASE}logo-cartago.png`, 400, true),
    ...doc.items.map((it) => cargarImagen(urlFoto(it.imagen), 220, false)),
  ])

  // Franja superior y logo
  pdf.setFillColor(...VINO)
  pdf.rect(0, 0, ancho, 4, 'F')
  if (logo) pdf.addImage(logo.datos, 'PNG', m, 11, (30 * logo.ancho) / logo.alto, 30)

  // Datos de la empresa
  const xEmpresa = m + 30
  pdf.setTextColor(...CARBON)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text('TALABARTERÍA CARTAGO', xEmpresa, 18)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...GRIS)
  const nit = String(config.empresa_nit || '').trim()
  const lineasEmpresa = [
    EMPRESA.razonSocial + (nit ? ` · NIT ${nit}` : ''),
    [EMPRESA.direccion, EMPRESA.ciudad].filter(Boolean).join(', '),
    `WhatsApp ${EMPRESA.telefono} · Instagram @${EMPRESA.instagram}`,
    String(config.empresa_correo || '').trim(),
  ].filter(Boolean)
  lineasEmpresa.forEach((l, i) => pdf.text(t(l), xEmpresa, 23.5 + i * 4.3))

  // Título y número
  const esPedido = tipo === 'pedido'
  pdf.setTextColor(...CARBON)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text(esPedido ? 'PEDIDO' : 'COTIZACIÓN', ancho - m, 19, { align: 'right' })
  pdf.setFontSize(10.5)
  pdf.setTextColor(...VINO)
  pdf.text(t(doc.numero || 'Sin guardar'), ancho - m, 25.5, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...GRIS)
  const lineasDoc = [`Fecha: ${fechaLarga(doc.fecha)}`]
  if (esPedido) {
    lineasDoc.push(`Estado: ${doc.estado}`)
    if (doc.cotizacion) lineasDoc.push(`Cotización: ${doc.cotizacion}`)
    if (doc.guia) lineasDoc.push(`Guía de envío: ${doc.guia}`)
  } else {
    const dias = Number(doc.validez_dias) || Number(config.cotizacion_validez) || VALIDEZ_DIAS
    const vence = new Date(doc.fecha ? new Date(doc.fecha) : new Date())
    vence.setDate(vence.getDate() + dias)
    lineasDoc.push(`Válida hasta: ${fechaLarga(vence)}`)
  }
  lineasDoc.forEach((l, i) => pdf.text(t(l), ancho - m, 31 + i * 4.3, { align: 'right' }))

  // Datos del cliente
  let y = 50
  pdf.setDrawColor(...VINO)
  pdf.setLineWidth(0.4)
  pdf.line(m, y - 3, ancho - m, y - 3)
  const filasCliente = [
    ['Cliente', doc.cliente],
    ['Documento', doc.documento],
    ['Teléfono', doc.telefono],
    ['Correo', doc.correo],
    ['Ciudad', doc.ciudad],
    ['Dirección', doc.direccion],
    ['Entrega', doc.entrega],
    ['Forma de pago', doc.pago],
  ].filter(([, v]) => String(v || '').trim())
  const mitad = Math.ceil(filasCliente.length / 2)
  const altoCliente = Math.max(1, mitad) * 5.2 + 6
  pdf.setFillColor(...GRIS_CLARO)
  pdf.roundedRect(m, y, ancho - 2 * m, altoCliente, 1.5, 1.5, 'F')
  filasCliente.forEach(([k, v], i) => {
    const col = i < mitad ? 0 : 1
    const fila = i < mitad ? i : i - mitad
    const x = m + 4 + col * ((ancho - 2 * m) / 2)
    const yy = y + 6 + fila * 5.2
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...CARBON)
    pdf.text(t(`${k}:`), x, yy)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...GRIS)
    const texto = pdf.splitTextToSize(t(v), (ancho - 2 * m) / 2 - 30)[0]
    pdf.text(texto, x + 24, yy)
  })
  y += altoCliente + 6

  // Productos
  const filas = doc.items.map((it) => {
    const detalle = [it.color && `Color: ${it.color}`, it.talla && `Tamaño: ${it.talla}`, it.personalizacion && `Personalización: ${it.personalizacion}`]
      .filter(Boolean)
      .join('\n')
    return ['', t(it.nombre + (detalle ? `\n${detalle}` : '')), String(it.cantidad), t(dinero(it.precio)), t(dinero(it.precio * it.cantidad))]
  })
  autoTable(pdf, {
    startY: y,
    margin: { left: m, right: m, bottom: 22 },
    head: [['', 'Producto', 'Cant.', 'Valor unitario', 'Subtotal']],
    body: filas,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.8, textColor: CARBON, cellPadding: 2.2, valign: 'middle', minCellHeight: 17 },
    headStyles: { fillColor: CARBON, textColor: 255, fontStyle: 'bold', fontSize: 8.2, minCellHeight: 8 },
    alternateRowStyles: { fillColor: GRIS_CLARO },
    columnStyles: { 0: { cellWidth: 18 }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 30, halign: 'right' }, 4: { cellWidth: 30, halign: 'right' } },
    didDrawCell: (d) => {
      if (d.section !== 'body' || d.column.index !== 0) return
      const foto = fotos[d.row.index]
      if (!foto) return
      const lado = 14
      const escala = Math.min(lado / foto.ancho, lado / foto.alto)
      const w = foto.ancho * escala
      const h = foto.alto * escala
      pdf.addImage(foto.datos, 'JPEG', d.cell.x + (d.cell.width - w) / 2, d.cell.y + (d.cell.height - h) / 2, w, h)
    },
  })
  y = pdf.lastAutoTable.finalY + 6

  // Totales
  const nuevaPaginaSiHaceFalta = (necesario) => {
    if (y + necesario > alto - 24) {
      pdf.addPage()
      y = 20
    }
  }
  nuevaPaginaSiHaceFalta(40)
  const xEtiqueta = ancho - m - 70
  const filaTotal = (etiqueta, valor) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...GRIS)
    pdf.text(t(etiqueta), xEtiqueta, y)
    pdf.setTextColor(...CARBON)
    pdf.text(t(valor), ancho - m, y, { align: 'right' })
    y += 5.5
  }
  const hayPorCotizar = doc.items.some((it) => !(it.precio > 0))
  filaTotal('Subtotal', dinero(subtotal(doc.items)))
  if (Number(doc.descuento) > 0) filaTotal('Descuento', `- ${dinero(Number(doc.descuento))}`)
  filaTotal('Envío', Number(doc.envio) > 0 ? dinero(Number(doc.envio)) : 'Por confirmar')
  pdf.setFillColor(...VINO)
  pdf.rect(xEtiqueta - 4, y - 4, ancho - m - xEtiqueta + 4, 9, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(255, 255, 255)
  pdf.text('TOTAL', xEtiqueta, y + 2)
  pdf.text(t(dinero(total(doc)) + (hayPorCotizar ? ' *' : '')), ancho - m - 2, y + 2, { align: 'right' })
  y += 10
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(7.8)
  pdf.setTextColor(...GRIS)
  pdf.text('Precios con IVA incluido.', ancho - m, y, { align: 'right' })
  if (hayPorCotizar) {
    y += 4
    pdf.text('* Hay productos con precio por confirmar.', ancho - m, y, { align: 'right' })
  }
  y += 8

  // Notas y condiciones
  const bloque = (titulo, contenido) => {
    if (!String(contenido || '').trim()) return
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.2)
    const lineas = pdf.splitTextToSize(t(contenido), ancho - 2 * m)
    nuevaPaginaSiHaceFalta(8 + lineas.length * 4)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...CARBON)
    pdf.text(t(titulo), m, y)
    y += 5
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.2)
    pdf.setTextColor(...GRIS)
    pdf.text(lineas, m, y)
    y += lineas.length * 3.8 + 5
  }
  bloque('Notas', doc.notas)
  if (!esPedido) bloque('Condiciones', config.cotizacion_condiciones || CONDICIONES)

  // Marca de agua, pie y numeración en todas las páginas
  const paginas = pdf.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    pdf.setPage(i)
    if (logo) {
      pdf.setGState(new pdf.GState({ opacity: 0.045 }))
      const h = 120
      const w = (h * logo.ancho) / logo.alto
      pdf.addImage(logo.datos, 'PNG', (ancho - w) / 2, (alto - h) / 2 + 10, w, h)
      pdf.setGState(new pdf.GState({ opacity: 1 }))
    }
    pdf.setDrawColor(...VINO)
    pdf.setLineWidth(0.3)
    pdf.line(m, alto - 15, ancho - m, alto - 15)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...GRIS)
    pdf.text(t('Talabartería Cartago · Desde 1992 · Artículos ecuestres y marroquinería'), m, alto - 10)
    pdf.text(`Página ${i} de ${paginas}`, ancho - m, alto - 10, { align: 'right' })
    pdf.setFillColor(...VINO)
    pdf.rect(0, alto - 3, ancho, 3, 'F')
  }

  const cliente = String(doc.cliente || 'cliente')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .slice(0, 30)
  const nombre = `${esPedido ? 'Pedido' : 'Cotizacion'}-${doc.numero || 'borrador'}-${cliente}.pdf`
  return { blob: pdf.output('blob'), nombre }
}

// En el celular abre el menú de compartir del teléfono con el PDF adjunto
// (WhatsApp lo recibe como archivo). En el computador lo descarga.
export async function compartirPdf({ blob, nombre }, texto) {
  const archivo = new File([blob], nombre, { type: 'application/pdf' })
  const tactil = window.matchMedia('(pointer: coarse)').matches
  if (tactil && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], text: texto })
      return 'compartido'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelado'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
  return 'descargado'
}
