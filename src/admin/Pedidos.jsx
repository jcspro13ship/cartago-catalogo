import { useMemo, useState } from 'react'
import { normalizar } from '../utils/formato'
import { conAncho } from '../utils/imagenUrl'
import { generarPdf, compartirPdf } from './pdf'
import { EstadoEtiqueta } from './Cotizaciones'
import { ESTADOS_PEDIDO, detalleItem, dinero, fechaCorta, linkWhatsAppCliente, subtotal } from './ventas'

export default function Pedidos({ ventas, datos, ejecutar }) {
  const [abierto, setAbierto] = useState(null)
  const [filtro, setFiltro] = useState('activos')
  const [busqueda, setBusqueda] = useState('')

  const lista = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return ventas.pedidos.filter((p) => {
      if (filtro === 'activos' && (p.estado === 'Entregado' || p.estado === 'Cancelado')) return false
      if (filtro !== 'activos' && filtro !== 'todos' && p.estado !== filtro) return false
      if (termino && !normalizar(`${p.numero} ${p.cliente} ${p.telefono} ${p.cotizacion} ${p.guia}`).includes(termino)) return false
      return true
    })
  }, [ventas.pedidos, filtro, busqueda])

  if (abierto) {
    const actual = ventas.pedidos.find((p) => p.numero === abierto) || null
    if (actual) return <DetallePedido key={actual.numero + actual.estado} pedido={actual} datos={datos} ejecutar={ejecutar} onCerrar={() => setAbierto(null)} />
  }

  const porPagar = ventas.pedidos.filter((p) => p.estado === 'Por pagar').length

  return (
    <section>
      <div className="admin-barra">
        <div>
          <h1>Pedidos</h1>
          <p className="admin-sub">
            {ventas.pedidos.length} pedidos{porPagar > 0 && ` · ${porPagar} por pagar`}. Los pedidos se crean al convertir una cotización.
          </p>
        </div>
      </div>

      <div className="admin-filtros">
        <input type="search" placeholder="Buscar por número, cliente, teléfono o guía…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="activos">En curso</option>
          <option value="todos">Todos</option>
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </div>

      <div className="admin-lista">
        {lista.length === 0 && <p className="admin-vacio">No hay pedidos con ese filtro.</p>}
        {lista.map((p) => (
          <button key={p.numero} className="admin-fila admin-fila-venta" onClick={() => setAbierto(p.numero)}>
            <div className="admin-venta-principal">
              <strong>{p.cliente || 'Sin nombre'}</strong>
              <span>
                {p.numero} · {fechaCorta(p.fecha)} · {p.items.length} {p.items.length === 1 ? 'producto' : 'productos'}
                {p.guia && ` · Guía ${p.guia}`}
              </span>
            </div>
            <span className="admin-precio">{dinero(Number(p.total))}</span>
            <EstadoEtiqueta estado={p.estado} />
          </button>
        ))}
      </div>
    </section>
  )
}

function DetallePedido({ pedido, datos, ejecutar, onCerrar }) {
  const cancelado = pedido.estado === 'Cancelado'
  const [form, setForm] = useState({ estado: pedido.estado, guia: pedido.guia || '', pago: pedido.pago || '', notas: pedido.notas || '' })
  const [ocupado, setOcupado] = useState('')
  const [error, setError] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const cambios = form.estado !== pedido.estado || form.guia !== (pedido.guia || '') || form.pago !== (pedido.pago || '') || form.notas !== (pedido.notas || '')

  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  async function accion(nombre, fn) {
    setError('')
    setOcupado(nombre)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado('')
    }
  }

  const guardar = () =>
    accion('guardar', async () => {
      if (form.estado === 'Cancelado' && !window.confirm('¿Cancelar este pedido? Las unidades descontadas vuelven al inventario y ya no se podrá modificar.')) return
      await ejecutar('actualizarPedido', { numero: pedido.numero, cambios: form }, 'Pedido actualizado.')
    })

  const pdf = () =>
    accion('pdf', async () => {
      const doc = { ...pedido, ...form }
      const archivo = await generarPdf(doc, 'pedido', datos.config)
      const mensaje = `Hola ${String(pedido.cliente).split(' ')[0]}, te comparto el pedido ${pedido.numero} de Talabartería Cartago.${form.guia ? ` Tu guía de envío es ${form.guia}.` : ''}`
      const resultado = await compartirPdf(archivo, mensaje)
      if (resultado === 'descargado' && pedido.telefono) setWhatsapp(linkWhatsAppCliente(pedido.telefono, mensaje))
    })

  const descontado = (() => {
    try {
      return Object.entries(JSON.parse(pedido.stock_descontado || '{}'))
    } catch {
      return []
    }
  })()

  return (
    <div className="admin-editor">
      <div className="admin-barra">
        <div>
          <button type="button" className="admin-enlace" onClick={onCerrar}>
            ← Volver a pedidos
          </button>
          <h1>{pedido.numero}</h1>
          <p className="admin-sub">
            <EstadoEtiqueta estado={pedido.estado} /> {fechaCorta(pedido.fecha)}
            {pedido.cotizacion && ` · De la cotización ${pedido.cotizacion}`}
          </p>
        </div>
      </div>

      <div className="admin-editor-grid">
        <div className="admin-bloque">
          <h2>Cliente</h2>
          <dl className="admin-datos">
            {[
              ['Nombre', pedido.cliente],
              ['Documento', pedido.documento],
              ['Celular', pedido.telefono],
              ['Correo', pedido.correo],
              ['Ciudad', pedido.ciudad],
              ['Dirección', pedido.direccion],
              ['Entrega', pedido.entrega],
            ]
              .filter(([, v]) => String(v || '').trim())
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {pedido.telefono && (
            <a className="admin-enlace" href={linkWhatsAppCliente(pedido.telefono, `Hola ${String(pedido.cliente).split(' ')[0]}, te escribimos de Talabartería Cartago sobre tu pedido ${pedido.numero}.`)} target="_blank" rel="noopener noreferrer">
              Escribirle por WhatsApp
            </a>
          )}
        </div>

        <fieldset className="admin-bloque" disabled={cancelado}>
          <h2>Seguimiento</h2>
          <label className="campo">
            <span>Estado</span>
            <select value={form.estado} onChange={(e) => cambiar('estado', e.target.value)}>
              {ESTADOS_PEDIDO.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <div className="admin-dos">
            <label className="campo">
              <span>Forma de pago</span>
              <input value={form.pago} onChange={(e) => cambiar('pago', e.target.value)} />
            </label>
            <label className="campo">
              <span>Guía de envío</span>
              <input value={form.guia} onChange={(e) => cambiar('guia', e.target.value)} placeholder="Transportadora y número" />
            </label>
          </div>
          <label className="campo">
            <span>Notas</span>
            <textarea rows="3" value={form.notas} onChange={(e) => cambiar('notas', e.target.value)} />
          </label>
          {descontado.length > 0 && (
            <p className="admin-sub">
              Inventario descontado: {descontado.map(([sku, n]) => `${sku} (${n})`).join(', ')}. Si cancelas el pedido, vuelve al stock.
            </p>
          )}
        </fieldset>

        <div className="admin-bloque admin-bloque-ancho">
          <h2>Productos</h2>
          {pedido.items.map((it, i) => (
            <div key={i} className="admin-item">
              <div className="admin-item-foto">{it.imagen && <img src={conAncho(it.imagen, 120)} alt="" />}</div>
              <div className="admin-item-info">
                <strong>{it.nombre}</strong>
                {detalleItem(it) && <span>{detalleItem(it)}</span>}
              </div>
              <span className="admin-item-cantidad">× {it.cantidad}</span>
              <span className="admin-item-subtotal">{dinero(it.precio * it.cantidad)}</span>
            </div>
          ))}
          <div className="admin-totales">
            <span>Subtotal</span>
            <strong>{dinero(subtotal(pedido.items))}</strong>
            {Number(pedido.descuento) > 0 && (
              <>
                <span>Descuento</span>
                <strong>- {dinero(Number(pedido.descuento))}</strong>
              </>
            )}
            <span>Envío</span>
            <strong>{Number(pedido.envio) > 0 ? dinero(Number(pedido.envio)) : 'Por confirmar'}</strong>
            <span className="admin-total">Total</span>
            <strong className="admin-total">{dinero(Number(pedido.total))}</strong>
          </div>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {whatsapp && (
        <p className="admin-nota">
          El PDF quedó descargado. <a href={whatsapp} target="_blank" rel="noopener noreferrer">Abrir WhatsApp del cliente</a> y adjúntalo en el chat.
        </p>
      )}

      <div className="admin-editor-pie">
        <button type="button" className="boton boton-secundario" onClick={pdf} disabled={!!ocupado}>
          {ocupado === 'pdf' ? 'Generando PDF…' : 'PDF del pedido'}
        </button>
        {!cancelado && (
          <button type="button" className="boton boton-primario" onClick={guardar} disabled={!!ocupado || !cambios}>
            {ocupado === 'guardar' ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
      </div>
    </div>
  )
}
