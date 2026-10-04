import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCatalogo, variantesDe, stockTotal } from '../context/CatalogoContext'
import { useCart } from '../context/CartContext'
import GaleriaProducto from '../components/GaleriaProducto'
import ProductoCard from '../components/ProductoCard'
import Icono, { IconoWhatsApp } from '../components/Icono'
import { textoPrecio } from '../utils/formato'
import { muestraColor } from '../utils/colores'
import { linkWhatsApp } from '../utils/whatsapp'

function textoStock(stock) {
  if (stock <= 0) return { texto: 'Agotado en este color', clase: 'stock-agotado' }
  if (stock <= 3) return { texto: `¡Últimas ${stock === 1 ? 'unidad' : `${stock} unidades`}!`, clase: 'stock-pocas' }
  return { texto: 'Disponible', clase: 'stock-ok' }
}

export default function ProductoDetalle() {
  const { id } = useParams()
  const { addItem } = useCart()
  const { productos, variantes: todas, cargando } = useCatalogo()

  const producto = productos.find((p) => p.id === id && p.activo)
  const variantes = useMemo(() => variantesDe(todas, id), [todas, id])
  const tieneColores = variantes.some((v) => v.color)

  const [sku, setSku] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [personalizacion, setPersonalizacion] = useState('')
  const [agregado, setAgregado] = useState(false)

  // Al entrar (o cambiar de producto) se preselecciona el primer color con stock.
  useEffect(() => {
    const primera = variantes.find((v) => v.stock > 0) || variantes[0]
    setSku(primera ? primera.sku : null)
    setCantidad(1)
    setPersonalizacion('')
    setAgregado(false)
  }, [variantes])

  useEffect(() => {
    if (producto) document.title = `${producto.nombre} · Talabartería Cartago`
    return () => {
      document.title = 'Talabartería Cartago · Artículos ecuestres y marroquinería desde 1992'
    }
  }, [producto])

  const relacionados = useMemo(() => {
    if (!producto) return []
    return productos.filter((p) => p.activo && p.categoria === producto.categoria && p.id !== producto.id).slice(0, 4)
  }, [productos, producto])

  if (cargando) {
    return (
      <div className="contenedor pagina-producto">
        <div className="producto-detalle">
          <div className="galeria-principal esqueleto" />
          <div />
        </div>
      </div>
    )
  }

  if (!producto) {
    return (
      <div className="contenedor pagina-vacia">
        <p className="sobretitulo">Producto no disponible</p>
        <h1>No encontramos este producto</h1>
        <p>Puede que ya no esté en el catálogo. Mira productos similares o escríbenos.</p>
        <Link to="/catalogo" className="boton boton-primario">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const variante = variantes.find((v) => v.sku === sku)
  const stock = variante ? variante.stock : 0
  const agotadoTotal = stockTotal(todas, producto.id) === 0
  const estadoStock = textoStock(stock)

  function handleAgregar() {
    if (!variante || stock <= 0) return
    addItem({
      sku: variante.sku,
      productoId: producto.id,
      nombre: producto.nombre,
      color: variante.color,
      precio: producto.precio,
      imagen: producto.imagenes[0] || null,
      personalizacion: personalizacion.trim(),
      stock,
      cantidad,
    })
    setAgregado(true)
  }

  const textoConsulta = `Hola, me interesa el producto "${producto.nombre}"${
    variante && variante.color ? ` en color ${variante.color}` : ''
  }. ¿Me pueden dar más información?`

  return (
    <div className="pagina-producto">
      <div className="contenedor">
        <nav className="migas" aria-label="Ruta">
          <Link to="/catalogo">Catálogo</Link>
          <span>/</span>
          <Link to={`/catalogo?categoria=${encodeURIComponent(producto.categoria)}`}>{producto.categoria}</Link>
          <span>/</span>
          <span aria-current="page">{producto.nombre}</span>
        </nav>

        <div className="producto-detalle">
          <GaleriaProducto producto={producto} />

          <div className="producto-info">
            <p className="sobretitulo">
              {producto.categoria}
              {producto.marca ? ` · ${producto.marca}` : ''}
            </p>
            <h1>{producto.nombre}</h1>
            <p className={`producto-precio ${producto.precio > 0 ? '' : 'consultar'}`}>{textoPrecio(producto.precio)}</p>
            <p className="producto-descripcion">{producto.descripcion}</p>

            {tieneColores && (
              <div className="selector">
                <p className="selector-label">
                  Color: <strong>{variante ? variante.color : '—'}</strong>
                </p>
                <div className="selector-opciones">
                  {variantes.map((v) => {
                    const muestra = muestraColor(v.color)
                    return (
                      <button
                        key={v.sku}
                        className={`chip chip-color ${sku === v.sku ? 'chip-activo' : ''} ${v.stock <= 0 ? 'chip-agotado' : ''}`}
                        onClick={() => {
                          setSku(v.sku)
                          setCantidad(1)
                          setAgregado(false)
                        }}
                        aria-pressed={sku === v.sku}
                        title={v.stock <= 0 ? `${v.color} (agotado)` : v.color}
                      >
                        {muestra && <span className="muestra" style={{ background: muestra }} />}
                        {v.color}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {variante && <p className={`stock ${estadoStock.clase}`}>{estadoStock.texto}</p>}

            {producto.personalizable && stock > 0 && (
              <label className="selector personalizacion">
                <span className="selector-label">
                  Personalización <em>(opcional)</em>
                </span>
                <textarea
                  rows="2"
                  maxLength="200"
                  value={personalizacion}
                  onChange={(e) => {
                    setPersonalizacion(e.target.value)
                    setAgregado(false)
                  }}
                  placeholder={producto.nota_personalizacion || 'Cuéntanos el detalle que quieres (iniciales, medidas, repujado…)'}
                />
              </label>
            )}

            {stock > 0 ? (
              <div className="producto-compra">
                <div className="cantidad" aria-label="Cantidad">
                  <button onClick={() => setCantidad((c) => Math.max(1, c - 1))} aria-label="Restar uno" disabled={cantidad <= 1}>
                    −
                  </button>
                  <span>{cantidad}</span>
                  <button
                    onClick={() => setCantidad((c) => Math.min(stock, c + 1))}
                    aria-label="Sumar uno"
                    disabled={cantidad >= stock}
                  >
                    +
                  </button>
                </div>
                <button className="boton boton-primario boton-ancho" onClick={handleAgregar}>
                  Agregar al pedido
                </button>
              </div>
            ) : (
              <p className="producto-agotado-nota">
                {agotadoTotal
                  ? 'Este producto está agotado por ahora. Escríbenos y te avisamos cuándo llega o te ofrecemos una alternativa.'
                  : 'Este color está agotado. Prueba con otro color o escríbenos.'}
              </p>
            )}

            {agregado && (
              <div className="aviso-agregado" role="status">
                <Icono nombre="check" tamano={20} />
                <span>Agregado a tu pedido.</span>
                <Link to="/carrito">Ver pedido</Link>
              </div>
            )}

            <a href={linkWhatsApp(textoConsulta)} className="boton boton-secundario boton-ancho" target="_blank" rel="noopener noreferrer">
              <IconoWhatsApp tamano={18} /> Preguntar por este producto
            </a>

            <ul className="producto-garantias">
              <li>
                <Icono nombre="asesoria" tamano={18} /> Asesoría personalizada antes de tu compra
              </li>
              <li>
                <Icono nombre="check" tamano={18} /> Pago con tarjeta, débito o transferencia por link seguro
              </li>
            </ul>
          </div>
        </div>

        {relacionados.length > 0 && (
          <section className="seccion">
            <div className="seccion-encabezado">
              <div>
                <p className="sobretitulo">También te puede interesar</p>
                <h2>Más en {producto.categoria}</h2>
              </div>
            </div>
            <div className="catalogo-grid">
              {relacionados.map((p) => (
                <ProductoCard key={p.id} producto={p} stock={stockTotal(todas, p.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
