import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import ImagenProducto from '../components/ImagenProducto'
import Icono, { IconoWhatsApp } from '../components/Icono'
import { useMoneda } from '../context/MonedaContext'
import { linkWhatsApp } from '../utils/whatsapp'
import { formatoPrecio } from '../utils/formato'
import { TOPE_CONTRAENTREGA } from '../config'

const ENTREGAS = {
  tienda: 'Recoger en la tienda',
  nacional: 'Envío nacional',
  internacional: 'Envío internacional',
}

// Formas de pago según la entrega. Contraentrega (Dropi) solo aplica a envíos
// nacionales por debajo del tope y cuando todos los precios son conocidos.
function opcionesPago(entrega, totalCop, hayPorCotizar) {
  if (entrega === 'tienda') {
    return { link: 'Link de pago (tarjeta, débito o transferencia)', tienda: 'Pago en la tienda' }
  }
  if (entrega === 'internacional') {
    return { link: 'Link de pago en pesos colombianos', giro: 'Giro internacional (Western Union)' }
  }
  const opciones = { link: 'Link de pago (tarjeta, débito o transferencia)' }
  if (!hayPorCotizar && totalCop > 0 && totalCop < TOPE_CONTRAENTREGA) {
    opciones.contraentrega = 'Contraentrega con Dropi'
  }
  return opciones
}

const CIERRES = {
  link: 'Quedo atento(a) al link de pago. ¡Gracias!',
  tienda: 'Quedo atento(a) a la confirmación para pasar por la tienda. ¡Gracias!',
  contraentrega: 'Quedo atento(a) a la confirmación del envío contraentrega. ¡Gracias!',
  giro: 'Quedo atento(a) a los datos para hacer el giro. ¡Gracias!',
}

const AYUDAS = {
  link: 'Te responderemos con la confirmación de disponibilidad y un link de pago (tarjeta, débito o transferencia).',
  tienda: 'Te confirmamos la disponibilidad y te separamos el pedido para que pases por la tienda.',
  contraentrega: 'Pagas al recibir el pedido. Te confirmamos el valor del envío por WhatsApp.',
  giro: 'Te enviaremos los datos para el giro internacional y coordinamos el envío.',
}

// Código corto para que Cartago y el cliente hablen del mismo pedido por WhatsApp.
function codigoPedido() {
  return `CT-${Date.now().toString(36).slice(-5).toUpperCase()}`
}

function construirMensaje({ items, total, hayPorCotizar, cliente, codigo, moneda, tasaUsd, precio, formato, pago, etiquetaPago }) {
  const lineas = items.flatMap((it, i) => {
    const valor = precio(it)
    const partes = [
      `${i + 1}. ${it.nombre}${it.color ? ` — Color: ${it.color}` : ''} — Cant: ${it.cantidad} — ${
        valor > 0 ? formato(valor * it.cantidad) : 'Precio a consultar'
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
    `Total: ${formato(total)}${hayPorCotizar ? ' + productos por cotizar' : ''}`,
    ...(moneda === 'USD'
      ? [`(Valores en dólares aproximados, tasa de ${formatoPrecio(tasaUsd)} por dólar. Espero la cotización final.)`]
      : []),
    ...(cliente.entrega !== 'tienda' ? ['El costo del envío lo coordinamos por aquí.'] : []),
    '',
    'Mis datos:',
    `Nombre: ${cliente.nombre}`,
    `Celular: ${cliente.celular}`,
    `Ciudad: ${cliente.ciudad}`,
    ...(cliente.entrega === 'internacional' ? [`País: ${cliente.pais}`] : []),
    `Entrega: ${ENTREGAS[cliente.entrega]}`,
    ...(cliente.entrega !== 'tienda' ? [`Dirección: ${cliente.direccion}`] : []),
    `Pago: ${etiquetaPago}`,
    ...(cliente.notas ? [`Notas: ${cliente.notas}`] : []),
    '',
    CIERRES[pago],
  ].join('\n')
}

export default function Carrito() {
  const { items, removeItem, updateCantidad, clearCart } = useCart()
  const { moneda, setMoneda, tasaUsd, precio, texto, formato } = useMoneda()
  const [cliente, setCliente] = useState({
    nombre: '',
    celular: '',
    ciudad: '',
    pais: '',
    entrega: 'tienda',
    pago: 'link',
    direccion: '',
    notas: '',
  })
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(null)

  const total = items.reduce((acc, it) => acc + precio(it) * it.cantidad, 0)
  const hayPorCotizar = items.some((it) => !(precio(it) > 0))
  const totalCop = items.reduce((acc, it) => acc + (it.precio > 0 ? it.precio : 0) * it.cantidad, 0)
  const pagos = opcionesPago(cliente.entrega, totalCop, hayPorCotizar)
  // Si la forma elegida deja de aplicar (cambió la entrega o el total), vuelve al link de pago.
  const pago = pagos[cliente.pago] ? cliente.pago : 'link'

  function actualizar(campo, valor) {
    setCliente((c) => ({ ...c, [campo]: valor }))
    setError('')
  }

  // Un cliente del exterior casi siempre quiere ver el valor en dólares.
  function elegirEntrega(valor) {
    setCliente((c) => ({ ...c, entrega: valor, pago: 'link' }))
    setError('')
    if (valor === 'internacional') setMoneda('USD')
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
          confirmación de disponibilidad y los pasos para el pago.
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
    if (datos.entrega === 'internacional' && !datos.pais) {
      setError('Escribe el país de envío.')
      return
    }
    if (datos.entrega !== 'tienda' && !datos.direccion) {
      setError('Escribe la dirección de envío.')
      return
    }
    const codigo = codigoPedido()
    const url = linkWhatsApp(
      construirMensaje({
        items,
        total,
        hayPorCotizar,
        cliente: datos,
        codigo,
        moneda,
        tasaUsd,
        precio,
        formato,
        pago,
        etiquetaPago: pagos[pago],
      })
    )
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
                <p className="carrito-item-precio">{texto(it)}</p>
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
            <span>{formato(total)}</span>
          </div>
          {hayPorCotizar && <p className="resumen-nota">+ productos con precio a consultar: te cotizamos por WhatsApp.</p>}
          <div className="resumen-fila resumen-nota-fila">
            <span>Envío</span>
            <span>Se coordina por WhatsApp</span>
          </div>
          <div className="resumen-fila resumen-total">
            <span>Total</span>
            <span>{formato(total)}</span>
          </div>
          {moneda === 'USD' && (
            <p className="resumen-nota">
              Valores en dólares aproximados (tasa de {formatoPrecio(tasaUsd)} por dólar). El pago se hace por link en
              pesos colombianos o por giro internacional.
            </p>
          )}

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
            {Object.entries(ENTREGAS).map(([valor, etiqueta]) => (
              <label key={valor} className={`opcion-entrega ${cliente.entrega === valor ? 'activa' : ''}`}>
                <input type="radio" name="entrega" value={valor} checked={cliente.entrega === valor} onChange={() => elegirEntrega(valor)} />
                {etiqueta}
              </label>
            ))}
          </fieldset>

          {cliente.entrega === 'internacional' && (
            <label className="campo">
              <span>País</span>
              <input type="text" autoComplete="country-name" value={cliente.pais} onChange={(e) => actualizar('pais', e.target.value)} />
            </label>
          )}

          {cliente.entrega === 'nacional' && !pagos.contraentrega && !hayPorCotizar && totalCop >= TOPE_CONTRAENTREGA && (
            <p className="resumen-nota">El pago contraentrega aplica para pedidos menores a {formatoPrecio(TOPE_CONTRAENTREGA)}.</p>
          )}

          {cliente.entrega !== 'tienda' && (
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

          <fieldset className="campo-entrega">
            <legend>Forma de pago</legend>
            {Object.entries(pagos).map(([valor, etiqueta]) => (
              <label key={valor} className={`opcion-entrega ${pago === valor ? 'activa' : ''}`}>
                <input type="radio" name="pago" value={valor} checked={pago === valor} onChange={() => actualizar('pago', valor)} />
                {etiqueta}
              </label>
            ))}
          </fieldset>

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
          <p className="resumen-ayuda">{AYUDAS[pago]}</p>
        </form>
      </div>
    </div>
  )
}
