import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import ImagenProducto from '../components/ImagenProducto'
import Icono, { IconoWhatsApp } from '../components/Icono'
import { formatoPrecio, textoPrecio } from '../utils/formato'
import { linkWhatsApp } from '../utils/whatsapp'

const ENTREGAS = {
  tienda: 'Recoger en la tienda',
  envio: 'Envío a domicilio',
}

// Código corto para que Cartago y el cliente hablen del mismo pedido por WhatsApp.
function codigoPedido() {
  return `CT-${Date.now().toString(36).slice(-5).toUpperCase()}`
}

function construirMensaje(items, total, hayPorCotizar, cliente, codigo) {
  const lineas = items.flatMap((it, i) => {
    const partes = [
      `${i + 1}. ${it.nombre}${it.color ? ` — Color: ${it.color}` : ''} — Cant: ${it.cantidad} — ${
        it.precio > 0 ? formatoPrecio(it.precio * it.cantidad) : 'Precio a consultar'
      }`,
    ]
    if (it.personalizacion) partes.push(`   Personalización: ${it.personalizacion}`)
    return partes
  })
  return [
    `Hola Talabartería Cartago, quiero hacer este pedido (${codigo}):`,
    '',
    ...lineas,
    '',
    `Total: ${formatoPrecio(total)}${hayPorCotizar ? ' + productos por cotizar' : ''}`,
    '',
    'Mis datos:',
    `Nombre: ${cliente.nombre}`,
    `Celular: ${cliente.celular}`,
    `Ciudad: ${cliente.ciudad}`,
    `Entrega: ${ENTREGAS[cliente.entrega]}`,
    ...(cliente.entrega === 'envio' ? [`Dirección: ${cliente.direccion}`] : []),
    ...(cliente.notas ? [`Notas: ${cliente.notas}`] : []),
    '',
    'Quedo atento(a) al link de pago. ¡Gracias!',
  ].join('\n')
}

export default function Carrito() {
  const { items, removeItem, updateCantidad, clearCart, total, hayPorCotizar } = useCart()
  const [cliente, setCliente] = useState({ nombre: '', celular: '', ciudad: '', entrega: 'tienda', direccion: '', notas: '' })
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(null)

  function actualizar(campo, valor) {
    setCliente((c) => ({ ...c, [campo]: valor }))
    setError('')
  }

  if (enviado) {
    return (
      <div className="contenedor pagina-vacia">
        <span className="pagina-vacia-icono exito">
          <Icono nombre="check" tamano={34} />
        </span>
        <p className="sobretitulo">Pedido {enviado.codigo}</p>
        <h1>¡Gracias! Ya casi está listo</h1>
        <p>
          Abrimos WhatsApp con el resumen de tu pedido. Solo falta que lo envíes: te responderemos con la
          confirmación y el link de pago.
        </p>
        <div className="pagina-vacia-acciones">
          <a href={enviado.url} className="boton boton-whatsapp" target="_blank" rel="noopener noreferrer">
            <IconoWhatsApp tamano={20} /> Abrir WhatsApp de nuevo
          </a>
          <Link
            to="/catalogo"
            className="boton boton-secundario"
            onClick={() => {
              clearCart()
            }}
          >
            Vaciar pedido y seguir viendo
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="contenedor pagina-vacia">
        <span className="pagina-vacia-icono">
          <Icono nombre="carrito" tamano={34} />
        </span>
        <h1>Tu pedido está vacío</h1>
        <p>Explora el catálogo y agrega lo que necesites. Al final nos lo envías por WhatsApp.</p>
        <Link to="/catalogo" className="boton boton-primario">
          Ver catálogo
        </Link>
      </div>
    )
  }

  function handleEnviar(e) {
    e.preventDefault()
    const datos = Object.fromEntries(Object.entries(cliente).map(([k, v]) => [k, v.trim()]))
    if (!datos.nombre || !datos.celular || !datos.ciudad) {
      setError('Completa tu nombre, celular y ciudad para poder enviar el pedido.')
      return
    }
    if (datos.celular.replace(/\D/g, '').length < 7) {
      setError('Revisa el número de celular.')
      return
    }
    if (datos.entrega === 'envio' && !datos.direccion) {
      setError('Escribe la dirección de envío.')
      return
    }
    const codigo = codigoPedido()
    const url = linkWhatsApp(construirMensaje(items, total, hayPorCotizar, datos, codigo))
    window.open(url, '_blank', 'noopener,noreferrer')
    setEnviado({ codigo, url })
  }

  return (
    <div className="pagina-carrito contenedor">
      <Link to="/catalogo" className="volver">
        <Icono nombre="volver" tamano={18} /> Seguir comprando
      </Link>
      <h1>Tu pedido</h1>

      <div className="carrito-layout">
        <div className="carrito-lista">
          {items.map((it) => (
            <article key={it.linea} className="carrito-item">
              <Link to={`/producto/${it.productoId}`} className="carrito-item-foto">
                <ImagenProducto
                  producto={{ nombre: it.nombre, imagenes: it.imagen ? [it.imagen] : [] }}
                  className="carrito-item-imagen"
                  sizes="96px"
                />
              </Link>
              <div className="carrito-item-info">
                <Link to={`/producto/${it.productoId}`} className="carrito-item-nombre">
                  {it.nombre}
                </Link>
                {it.color && <p className="carrito-item-detalle">Color: {it.color}</p>}
                {it.personalizacion && <p className="carrito-item-detalle">Personalización: {it.personalizacion}</p>}
                <p className="carrito-item-precio">{textoPrecio(it.precio)}</p>
              </div>
              <div className="carrito-item-acciones">
                <div className="cantidad cantidad-chica">
                  <button onClick={() => updateCantidad(it.linea, it.cantidad - 1)} aria-label="Restar uno">
                    −
                  </button>
                  <span>{it.cantidad}</span>
                  <button
                    onClick={() => updateCantidad(it.linea, it.cantidad + 1)}
                    aria-label="Sumar uno"
                    disabled={it.stock ? it.cantidad >= it.stock : false}
                  >
                    +
                  </button>
                </div>
                <button className="carrito-item-quitar" onClick={() => removeItem(it.linea)}>
                  Quitar
                </button>
              </div>
            </article>
          ))}
        </div>

        <form className="carrito-resumen" onSubmit={handleEnviar} noValidate>
          <h2>Resumen</h2>
          <div className="resumen-fila">
            <span>Subtotal</span>
            <span>{formatoPrecio(total)}</span>
          </div>
          {hayPorCotizar && <p className="resumen-nota">+ productos con precio a consultar: te cotizamos por WhatsApp.</p>}
          <div className="resumen-fila resumen-nota-fila">
            <span>Envío</span>
            <span>Se coordina por WhatsApp</span>
          </div>
          <div className="resumen-fila resumen-total">
            <span>Total</span>
            <span>{formatoPrecio(total)}</span>
          </div>

          <div className="costura" />

          <h3>Tus datos</h3>
          <label className="campo">
            <span>Nombre completo</span>
            <input type="text" autoComplete="name" value={cliente.nombre} onChange={(e) => actualizar('nombre', e.target.value)} />
          </label>
          <label className="campo">
            <span>Celular</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="300 000 0000"
              value={cliente.celular}
              onChange={(e) => actualizar('celular', e.target.value)}
            />
          </label>
          <label className="campo">
            <span>Ciudad</span>
            <input type="text" autoComplete="address-level2" value={cliente.ciudad} onChange={(e) => actualizar('ciudad', e.target.value)} />
          </label>

          <fieldset className="campo-entrega">
            <legend>Entrega</legend>
            {Object.entries(ENTREGAS).map(([valor, texto]) => (
              <label key={valor} className={`opcion-entrega ${cliente.entrega === valor ? 'activa' : ''}`}>
                <input type="radio" name="entrega" value={valor} checked={cliente.entrega === valor} onChange={() => actualizar('entrega', valor)} />
                {texto}
              </label>
            ))}
          </fieldset>

          {cliente.entrega === 'envio' && (
            <label className="campo">
              <span>Dirección de envío</span>
              <input
                type="text"
                autoComplete="street-address"
                value={cliente.direccion}
                onChange={(e) => actualizar('direccion', e.target.value)}
              />
            </label>
          )}

          <label className="campo">
            <span>
              Notas <em>(opcional)</em>
            </span>
            <textarea rows="2" value={cliente.notas} onChange={(e) => actualizar('notas', e.target.value)} />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="boton boton-whatsapp boton-ancho">
            <IconoWhatsApp tamano={20} /> Enviar pedido por WhatsApp
          </button>
          <p className="resumen-ayuda">
            Te responderemos con la confirmación de disponibilidad y un link de pago (tarjeta, débito o
            transferencia).
          </p>
        </form>
      </div>
    </div>
  )
}
