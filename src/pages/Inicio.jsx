import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogo, stockTotal } from '../context/CatalogoContext'
import ProductoCard from '../components/ProductoCard'
import ImagenProducto from '../components/ImagenProducto'
import Icono, { IconoWhatsApp } from '../components/Icono'
import { linkWhatsApp } from '../utils/whatsapp'
import { EMPRESA, MARCAS } from '../config'
import LogoMarca from '../components/LogoMarca'
import { ordenarCategorias, infoCategoria } from '../utils/categorias'

const BASE = import.meta.env.BASE_URL

const PILARES = [
  {
    icono: 'asesoria',
    titulo: 'Asesoría experta',
    texto: 'Te acompañamos a elegir lo que de verdad le sirve a ti y a tu caballo.',
  },
  {
    icono: 'tradicion',
    titulo: `Desde ${EMPRESA.fundacion}`,
    texto: 'Más de 30 años sirviendo al gremio equino con palabra cumplida.',
  },
  {
    icono: 'personalizar',
    titulo: 'Piezas personalizadas',
    texto: 'Bordados, repujados y medidas a tu gusto, hechos a mano.',
  },
  {
    icono: 'multimarca',
    titulo: 'Multimarca',
    texto: 'Lo mejor de nuestros artesanos y de las marcas que respaldamos.',
  },
]

export default function Inicio() {
  const { productos, variantes, cargando } = useCatalogo()

  const activos = useMemo(() => productos.filter((p) => p.activo), [productos])

  // Una tarjeta por categoría, con la foto del primer producto que tenga foto.
  const categorias = useMemo(() => {
    const mapa = new Map()
    activos.forEach((p) => {
      const actual = mapa.get(p.categoria)
      if (!actual) mapa.set(p.categoria, { nombre: p.categoria, portada: p, cantidad: 1 })
      else {
        actual.cantidad += 1
        if (actual.portada.imagenes.length === 0 && p.imagenes.length > 0) actual.portada = p
      }
    })
    const orden = ordenarCategorias([...mapa.keys()])
    return orden.map((nombre) => mapa.get(nombre))
  }, [activos])

  // Marcas en el orden de config; solo las que tienen productos, más las
  // que aparezcan en el Sheet y no estén en esa lista.
  const marcas = useMemo(() => {
    const conProductos = new Set(activos.map((p) => p.marca).filter(Boolean))
    const ordenadas = MARCAS.filter((m) => conProductos.has(m))
    conProductos.forEach((m) => {
      if (!ordenadas.includes(m)) ordenadas.push(m)
    })
    return ordenadas
  }, [activos])

  const destacados = useMemo(() => {
    const marcados = activos.filter((p) => p.destacado)
    return (marcados.length > 0 ? marcados : activos).slice(0, 8)
  }, [activos])

  return (
    <div className="pagina-inicio">
      <section className="hero">
        <img className="hero-marca" src={`${BASE}marca-cartago.png`} alt="" aria-hidden="true" />
        <div className="contenedor hero-contenido">
          <p className="sobretitulo sobretitulo-claro">Talabartería artesanal · Est. {EMPRESA.fundacion}</p>
          <h1>El cuero, el caballo y el trabajo honesto.</h1>
          <p className="hero-texto">
            Monturas, aperos y marroquinería hechos para durar, con la asesoría cercana que solo dan más de
            30 años en el gremio equino.
          </p>
          <div className="hero-acciones">
            <Link to="/catalogo" className="boton boton-claro">
              Ver catálogo <Icono nombre="flecha" tamano={18} />
            </Link>
            <a
              href={linkWhatsApp('Hola, quisiera recibir asesoría de Talabartería Cartago.')}
              className="boton boton-contorno-claro"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconoWhatsApp tamano={18} /> Pide asesoría
            </a>
          </div>
        </div>
      </section>

      <section className="pilares">
        <div className="contenedor pilares-grid">
          {PILARES.map((p) => (
            <div key={p.titulo} className="pilar">
              <span className="pilar-icono">
                <Icono nombre={p.icono} tamano={26} />
              </span>
              <div>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {categorias.length > 0 && (
        <section className="seccion contenedor">
          <div className="seccion-encabezado">
            <div>
              <p className="sobretitulo">Explora por categoría</p>
              <h2>Todo para el jinete y su caballo</h2>
            </div>
            <Link to="/catalogo" className="enlace-flecha">
              Ver todo <Icono nombre="flecha" tamano={18} />
            </Link>
          </div>
          <div className="categorias-grid">
            {categorias.map((c) => (
              <Link key={c.nombre} to={`/catalogo?categoria=${encodeURIComponent(c.nombre)}`} className="categoria-card">
                <ImagenProducto producto={c.portada} className="categoria-card-imagen" sizes="(max-width: 640px) 50vw, 280px" />
                <div className="categoria-card-texto">
                  <h3>{c.nombre}</h3>
                  {infoCategoria(c.nombre) && <p>{infoCategoria(c.nombre).descripcion}</p>}
                  <span>
                    {c.cantidad} {c.cantidad === 1 ? 'producto' : 'productos'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="contenedor">
        <Link to="/hazlo-unico" className="banda-unico">
          <div>
            <p className="sobretitulo sobretitulo-claro">Hazlo único</p>
            <h2>Bordamos el nombre de tu caballo, tu criadero o tus iniciales</h2>
            <p>Silla Chaparral en tus colores y repujados, aperos a tono y frenos bajo medida con garantía de cambio.</p>
          </div>
          <span className="boton boton-claro">
            Personalizar <Icono nombre="flecha" tamano={18} />
          </span>
        </Link>
      </section>

      <section className="seccion seccion-tono">
        <div className="contenedor">
          <div className="seccion-encabezado">
            <div>
              <p className="sobretitulo">Selección de la casa</p>
              <h2>Productos destacados</h2>
            </div>
            <Link to="/catalogo" className="enlace-flecha">
              Catálogo completo <Icono nombre="flecha" tamano={18} />
            </Link>
          </div>
          {cargando ? (
            <div className="catalogo-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="producto-card esqueleto" />
              ))}
            </div>
          ) : (
            <div className="catalogo-grid">
              {destacados.map((p) => (
                <ProductoCard key={p.id} producto={p} stock={stockTotal(variantes, p.id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {marcas.length > 0 && (
        <section className="seccion contenedor marcas">
          <div className="seccion-encabezado">
            <div>
              <p className="sobretitulo">Tienda multimarca</p>
              <h2>Las marcas que respaldamos</h2>
            </div>
          </div>
          <div className="marcas-grid">
            {marcas.map((m) => (
              <Link key={m} to={`/catalogo?marca=${encodeURIComponent(m)}`} className="marca-tarjeta" aria-label={`Ver productos ${m}`}>
                <LogoMarca marca={m} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="legado">
        <div className="contenedor legado-interior">
          <p className="sobretitulo sobretitulo-dorado">Nuestro propósito</p>
          <blockquote>
            Honrar el legado de nuestro fundador, David Morales: el amor por el cuero, el caballo y el trabajo
            honesto vive en cada pieza que fabricamos.
          </blockquote>
          <Link to="/nosotros" className="boton boton-contorno-claro">
            Conoce nuestra historia
          </Link>
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="cta-asesoria">
          <div>
            <h2>¿No sabes qué montura o apero elegir?</h2>
            <p>
              Cuéntanos sobre tu caballo y tu forma de montar. Te recomendamos lo que de verdad necesitas, sin
              compromiso.
            </p>
          </div>
          <a
            href={linkWhatsApp('Hola, quisiera asesoría para elegir un producto para mi caballo.')}
            className="boton boton-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconoWhatsApp tamano={20} /> Hablar con un asesor
          </a>
        </div>
      </section>
    </div>
  )
}
