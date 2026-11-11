import { useMemo, useState } from 'react'
import { normalizar } from '../utils/formato'
import { conAncho } from '../utils/imagenUrl'
import { generarPdf, compartirPdf } from './pdf'
import {
  ESTADOS_COTIZACION,
  VALIDEZ_DIAS,
  detalleItem,
  dinero,
  fechaCorta,
  linkWhatsAppCliente,
  opcionesCatalogo,
  subtotal,
  total,
} from './ventas'

const VACIA = {
  numero: '',
  estado: 'Borrador',
  cliente: '',
  documento: '',
  telefono: '',
  correo: '',
  ciudad: '',
  direccion: '',
  entrega: '',
  pago: '',
  items: [],
  descuento: '',
  envio: '',
  notas: '',
  validez_dias: '',
}

export default function Cotizaciones({ ventas, datos, ejecutar }) {
  const [abierta, setAbierta] = useState(null) // cotización, o {} para una nueva
  const [filtro, setFiltro] = useState('activas')
  const [busqueda, setBusqueda] = useState('')

  const lista = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return ventas.cotizaciones.filter((c) => {
      if (filtro === 'activas' && (c.estado === 'Convertida' || c.estado === 'Anulada')) return false
      if (filtro !== 'activas' && filtro !== 'todas' && c.estado !== filtro) return false
      if (termino && !normalizar(`${c.numero} ${c.cliente} ${c.telefono} ${c.referencia}`).includes(termino)) return false
      return true
    })
  }, [ventas.cotizaciones, filtro, busqueda])

  if (abierta) {
    const actual = abierta.numero ? ventas.cotizaciones.find((c) => c.numero === abierta.numero) || abierta : abierta
    return <EditorCotizacion key={actual.numero || 'nueva'} cotizacion={actual} datos={datos} ejecutar={ejecutar} onCerrar={() => setAbierta(null)} />
  }

  const nuevas = ventas.cotizaciones.filter((c) => c.estado === 'Nueva').length

  return (
    <section>
      <div className="admin-barra">
        <div>
          <h1>Cotizaciones</h1>
          <p className="admin-sub">
            {ventas.cotizaciones.length} cotizaciones
            {nuevas > 0 && <strong className="admin-resalte"> · {nuevas} nuevas desde la tienda</strong>}
          </p>
        </div>
        <button className="boton boton-primario" onClick={() => setAbierta({ ...VACIA })}>
          + Nueva cotización
        </button>
      </div>

      <div className="admin-filtros">
        <input type="search" placeholder="Buscar por número, cliente o teléfono…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="activas">Pendientes</option>
          <option value="todas">Todas</option>
          {ESTADOS_COTIZACION.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </div>

      <div className="admin-lista">
        {lista.length === 0 && <p className="admin-vacio">No hay cotizaciones con ese filtro.</p>}
        {lista.map((c) => (
          <button key={c.numero} className="admin-fila admin-fila-venta" onClick={() => setAbierta(c)}>
            <div className="admin-venta-principal">
              <strong>{c.cliente || 'Sin nombre'}</strong>
              <span>
                {c.numero} · {fechaCorta(c.fecha)} · {c.items.length} {c.items.length === 1 ? 'producto' : 'productos'}
                {c.origen === 'web' && ` · Pedido web ${c.referencia}`}
              </span>
            </div>
            <span className="admin-precio">{dinero(Number(c.total))}</span>
            <EstadoEtiqueta estado={c.estado} />
          </button>
        ))}
      </div>
    </section>
  )
}

export function EstadoEtiqueta({ estado }) {
  const clase = normalizar(estado).replace(/\s+/g, '-')
  return <span className={`admin-estado estado-${clase}`}>{estado}</span>
}

function EditorCotizacion({ cotizacion, datos, ejecutar, onCerrar }) {
  const soloLectura = cotizacion.estado === 'Convertida' || cotizacion.estado === 'Anulada'
  const [form, setForm] = useState(() => ({
    ...VACIA,
    ...cotizacion,
    descuento: Number(cotizacion.descuento) || '',
    envio: Number(cotizacion.envio) || '',
    items: (cotizacion.items || []).map((it) => ({ ...it })),
  }))
  const [cambios, setCambios] = useState(!cotizacion.numero)
  const [ocupado, setOcupado] = useState('')
  const [error, setError] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const nueva = !form.numero

  const opciones = useMemo(() => opcionesCatalogo(datos.productos, datos.variantes), [datos])

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setCambios(true)
    setError('')
  }

  function cambiarItem(i, campo, valor) {
    setForm((f) => ({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, [campo]: valor } : it)) }))
    setCambios(true)
  }

  function agregarItem(item) {
    setForm((f) => ({ ...f, items: [...f.items, { personalizacion: '', cantidad: 1, ...item }] }))
    setCambios(true)
  }

  function quitarItem(i) {
    setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }))
    setCambios(true)
  }

  // Guarda y devuelve la cotización con su número (para el PDF o el pedido).
  async function guardar() {
    if (!form.cliente.trim()) throw new Error('Escribe el nombre del cliente.')
    if (!form.items.length) throw new Error('Agrega al menos un producto.')
    if (form.items.some((it) => !String(it.nombre || '').trim())) throw new Error('Hay un producto sin nombre.')
    const datosGuardar = {
      ...form,
      items: form.items.map((it) => ({ ...it, cantidad: Number(it.cantidad) || 1, precio: Number(it.precio) || 0 })),
      descuento: Number(form.descuento) || 0,
      envio: Number(form.envio) || 0,
    }
    if (!cambios && form.numero) return datosGuardar
    const r = await ejecutar('guardarCotizacion', { cotizacion: datosGuardar }, nueva ? 'Cotización creada.' : 'Cotización guardada.')
    const guardada = { ...datosGuardar, numero: r.numero, fecha: form.fecha || new Date().toISOString() }
    setForm((f) => ({ ...f, numero: r.numero, fecha: guardada.fecha }))
    setCambios(false)
    return guardada
  }

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

  const enviarPdf = () =>
    accion('pdf', async () => {
      const doc = soloLectura ? form : await guardar()
      const pdf = await generarPdf(doc, 'cotizacion', datos.config)
      const mensaje = `Hola ${doc.cliente.split(' ')[0]}, te comparto la cotización ${doc.numero} de Talabartería Cartago. Quedamos atentos a cualquier inquietud.`
      const resultado = await compartirPdf(pdf, mensaje)
      if (resultado === 'descargado' && doc.telefono) setWhatsapp(linkWhatsAppCliente(doc.telefono, mensaje))
      if (resultado !== 'cancelado' && !soloLectura && ['Nueva', 'Borrador'].includes(form.estado)) {
        await ejecutar('estadoCotizacion', { numero: doc.numero, estado: 'Enviada' })
        setForm((f) => ({ ...f, estado: 'Enviada' }))
      }
    })

  const convertir = () =>
    accion('pedido', async () => {
      if (form.items.some((it) => !(Number(it.precio) > 0)) && !window.confirm('Hay productos sin precio. ¿Convertir en pedido de todas formas?')) return
      if (!window.confirm('¿Convertir esta cotización en pedido? Se descontarán del inventario las unidades de los productos con control de stock.')) return
      const doc = await guardar()
      await ejecutar('convertirEnPedido', { numero: doc.numero }, 'Pedido creado: lo encuentras en la pestaña Pedidos.')
      onCerrar()
    })

  const anular = () =>
    accion('anular', async () => {
      if (!window.confirm(`¿Anular la cotización ${form.numero}?`)) return
      await ejecutar('estadoCotizacion', { numero: form.numero, estado: 'Anulada' }, 'Cotización anulada.')
      onCerrar()
    })

  const guardarClick = () => accion('guardar', guardar)

  return (
    <div className="admin-editor">
      <div className="admin-barra">
        <div>
          <button type="button" className="admin-enlace" onClick={onCerrar}>
            ← Volver a cotizaciones
          </button>
          <h1>{nueva ? 'Nueva cotización' : form.numero}</h1>
          {!nueva && (
            <p className="admin-sub">
              <EstadoEtiqueta estado={form.estado} /> {fechaCorta(form.fecha)}
              {form.origen === 'web' && ` · Pedido web ${form.referencia}`}
              {form.pedido && ` · Pedido ${form.pedido}`}
            </p>
          )}
        </div>
      </div>

      {form.origen === 'web' && form.estado === 'Nueva' && (
        <p className="admin-nota">
          Este pedido llegó desde la tienda: revisa disponibilidad, ajusta precios o envío si hace falta y envíale la
          cotización al cliente.
        </p>
      )}

      <fieldset className="admin-editor-grid" disabled={soloLectura}>
        <div className="admin-bloque">
          <h2>Cliente</h2>
          <label className="campo">
            <span>Nombre o razón social</span>
            <input value={form.cliente} onChange={(e) => cambiar('cliente', e.target.value)} />
          </label>
          <div className="admin-dos">
            <label className="campo">
              <span>Cédula o NIT</span>
              <input value={form.documento} onChange={(e) => cambiar('documento', e.target.value)} />
            </label>
            <label className="campo">
              <span>Celular</span>
              <input type="tel" value={form.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
            </label>
          </div>
          <div className="admin-dos">
            <label className="campo">
              <span>Correo</span>
              <input type="email" value={form.correo} onChange={(e) => cambiar('correo', e.target.value)} />
            </label>
            <label className="campo">
              <span>Ciudad</span>
              <input value={form.ciudad} onChange={(e) => cambiar('ciudad', e.target.value)} />
            </label>
          </div>
          <label className="campo">
            <span>Dirección</span>
            <input value={form.direccion} onChange={(e) => cambiar('direccion', e.target.value)} />
          </label>
        </div>

        <div className="admin-bloque">
          <h2>Condiciones</h2>
          <div className="admin-dos">
            <label className="campo">
              <span>Entrega</span>
              <input list="entregas" value={form.entrega} onChange={(e) => cambiar('entrega', e.target.value)} placeholder="Recoger en tienda, envío nacional…" />
            </label>
            <label className="campo">
              <span>Forma de pago</span>
              <input list="pagos" value={form.pago} onChange={(e) => cambiar('pago', e.target.value)} placeholder="Link de pago…" />
            </label>
          </div>
          <datalist id="entregas">
            <option value="Recoger en tienda" />
            <option value="Envío nacional" />
            <option value="Envío internacional" />
          </datalist>
          <datalist id="pagos">
            <option value="Link de pago" />
            <option value="Contraentrega con Dropi" />
            <option value="Transferencia" />
            <option value="Giro internacional (Western Union)" />
          </datalist>
          <div className="admin-dos">
            <label className="campo">
              <span>Descuento ($)</span>
              <input type="number" min="0" step="1000" inputMode="numeric" value={form.descuento} onChange={(e) => cambiar('descuento', e.target.value)} />
            </label>
            <label className="campo">
              <span>Envío ($)</span>
              <input type="number" min="0" step="1000" inputMode="numeric" value={form.envio} onChange={(e) => cambiar('envio', e.target.value)} placeholder="Por confirmar" />
            </label>
          </div>
          <div className="admin-dos">
            <label className="campo">
              <span>Válida por (días)</span>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={form.validez_dias}
                onChange={(e) => cambiar('validez_dias', e.target.value)}
                placeholder={String(Number(datos.config.cotizacion_validez) || VALIDEZ_DIAS)}
              />
            </label>
          </div>
          <label className="campo">
            <span>Notas para el cliente</span>
            <textarea rows="3" value={form.notas} onChange={(e) => cambiar('notas', e.target.value)} />
          </label>
        </div>

        <div className="admin-bloque admin-bloque-ancho">
          <h2>Productos</h2>
          {form.items.length === 0 && <p className="admin-sub">Busca productos del catálogo o agrega una pieza libre.</p>}
          {form.items.map((it, i) => (
            <div key={i} className="admin-item">
              <div className="admin-item-foto">{it.imagen && <img src={conAncho(it.imagen, 120)} alt="" />}</div>
              <div className="admin-item-info">
                {it.sku ? (
                  <strong>{it.nombre}</strong>
                ) : (
                  <input placeholder="Descripción de la pieza" value={it.nombre} onChange={(e) => cambiarItem(i, 'nombre', e.target.value)} />
                )}
                {(it.color || it.talla) && <span>{detalleItem({ color: it.color, talla: it.talla })}</span>}
                <input
                  className="admin-item-detalle"
                  placeholder="Personalización o detalle (opcional)"
                  value={it.personalizacion || ''}
                  onChange={(e) => cambiarItem(i, 'personalizacion', e.target.value)}
                />
              </div>
              <label className="admin-item-num">
                <span>Cant.</span>
                <input type="number" min="1" inputMode="numeric" value={it.cantidad} onChange={(e) => cambiarItem(i, 'cantidad', e.target.value)} />
              </label>
              <label className="admin-item-num admin-item-precio">
                <span>Valor unitario</span>
                <input type="number" min="0" step="1000" inputMode="numeric" value={it.precio || ''} placeholder="A consultar" onChange={(e) => cambiarItem(i, 'precio', e.target.value)} />
              </label>
              <span className="admin-item-subtotal">{dinero((Number(it.precio) || 0) * (Number(it.cantidad) || 0))}</span>
              <button type="button" className="admin-quitar" onClick={() => quitarItem(i)} aria-label="Quitar producto">
                ×
              </button>
            </div>
          ))}
          {!soloLectura && <BuscadorProductos opciones={opciones} onElegir={agregarItem} />}

          <div className="admin-totales">
            <span>Subtotal</span>
            <strong>{dinero(subtotal(form.items.map((it) => ({ precio: Number(it.precio) || 0, cantidad: Number(it.cantidad) || 0 }))))}</strong>
            {Number(form.descuento) > 0 && (
              <>
                <span>Descuento</span>
                <strong>- {dinero(Number(form.descuento))}</strong>
              </>
            )}
            <span>Envío</span>
            <strong>{Number(form.envio) > 0 ? dinero(Number(form.envio)) : 'Por confirmar'}</strong>
            <span className="admin-total">Total</span>
            <strong className="admin-total">
              {dinero(total({ ...form, items: form.items.map((it) => ({ precio: Number(it.precio) || 0, cantidad: Number(it.cantidad) || 0 })) }))}
            </strong>
          </div>
        </div>
      </fieldset>

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
        {!nueva && !soloLectura && (
          <button type="button" className="admin-eliminar" onClick={anular} disabled={!!ocupado}>
            Anular cotización
          </button>
        )}
        {!soloLectura && (
          <button type="button" className="boton boton-secundario" onClick={guardarClick} disabled={!!ocupado || !cambios}>
            {ocupado === 'guardar' ? 'Guardando…' : 'Guardar'}
          </button>
        )}
        <button type="button" className="boton boton-secundario" onClick={enviarPdf} disabled={!!ocupado}>
          {ocupado === 'pdf' ? 'Generando PDF…' : 'PDF para el cliente'}
        </button>
        {!soloLectura && (
          <button type="button" className="boton boton-primario" onClick={convertir} disabled={!!ocupado}>
            {ocupado === 'pedido' ? 'Creando pedido…' : 'Convertir en pedido'}
          </button>
        )}
      </div>
    </div>
  )
}

function BuscadorProductos({ opciones, onElegir }) {
  const [termino, setTermino] = useState('')
  const resultados = useMemo(() => {
    const palabras = normalizar(termino.trim()).split(/\s+/).filter(Boolean)
    if (!palabras.length) return []
    return opciones.filter((o) => palabras.every((p) => normalizar(o.busqueda).includes(p))).slice(0, 12)
  }, [termino, opciones])

  return (
    <div className="admin-buscador-productos">
      <div className="admin-buscador-fila">
        <input type="search" placeholder="Buscar producto del catálogo para agregar…" value={termino} onChange={(e) => setTermino(e.target.value)} />
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => onElegir({ sku: '', producto_id: '', nombre: '', color: '', talla: '', precio: '', imagen: '' })}
        >
          + Pieza libre
        </button>
      </div>
      {resultados.length > 0 && (
        <ul className="admin-resultados">
          {resultados.map((o) => (
            <li key={o.sku}>
              <button
                type="button"
                onClick={() => {
                  const { busqueda, stock, activo, ...item } = o
                  onElegir(item)
                  setTermino('')
                }}
              >
                {o.imagen ? <img src={conAncho(o.imagen, 80)} alt="" /> : <span className="admin-resultado-sin-foto" />}
                <span>
                  <strong>{o.nombre}</strong>
                  {(o.color || o.talla) && <small> · {detalleItem({ color: o.color, talla: o.talla })}</small>}
                  {!o.activo && <small> · oculto en la tienda</small>}
                  {o.stock === 0 && <small> · agotado</small>}
                </span>
                <em>{dinero(o.precio)}</em>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
