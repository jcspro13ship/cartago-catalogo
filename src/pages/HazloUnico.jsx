import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogo, stockTotal } from '../context/CatalogoContext'
import ProductoCard from '../components/ProductoCard'
import Icono, { IconoWhatsApp } from '../components/Icono'
import { linkWhatsApp } from '../utils/whatsapp'

const OPCIONES = [
  {
    titulo: 'Bordado a tu medida',
    texto: 'Bordamos el nombre del caballo, el nombre del criadero o tus iniciales en jaquimones, aperos, pijamas, pecheras y maletas.',
  },
  {
    titulo: 'Silla Chaparral Cartago',
    texto: 'Nuestra silla de marca propia se fabrica en los colores y repujados que elijas.',
  },
  {
    titulo: 'Apero a tono con la silla',
    texto: 'El apero de cabeza se puede fabricar con los mismos colores y terminados de tu silla.',
  },
  {
    titulo: 'Frenos bajo medida',
    texto: 'Fabricamos frenos a la medida de tu caballo, con garantía de cambio: si no se le acomoda, te lo cambiamos sin costo adicional.',
  },
]

export default function HazloUnico() {
  const { productos, variantes, cargando } = useCatalogo()
  const personalizables = useMemo(() => productos.filter((p) => p.activo && p.personalizable), [productos])

  return (
    <div className="pagina-hazlo-unico">
      <section className="nosotros-hero hero-con-marca">
        <img className="hero-marca" src={`${import.meta.env.BASE_URL}marca-cartago.png`} alt="" aria-hidden="true" />
        <div className="contenedor">
          <p className="sobretitulo sobretitulo-claro">Hazlo único</p>
          <h1>Piezas hechas para tu caballo, con tu sello</h1>
          <p className="hero-texto">
            Cuéntanos qué quieres y lo fabricamos a mano: colores, repujados, bordados y medidas.
          </p>
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="valores-grid">
          {OPCIONES.map((o, i) => (
            <article key={o.titulo} className="valor">
              <span className="valor-numero">{String(i + 1).padStart(2, '0')}</span>
              <h3>{o.titulo}</h3>
              <p>{o.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="seccion seccion-tono">
        <div className="contenedor">
          <div className="seccion-encabezado">
            <div>
              <p className="sobretitulo">Se pueden personalizar</p>
              <h2>Elige tu pieza</h2>
            </div>
            <Link to="/catalogo?personalizable=1" className="enlace-flecha">
              Ver en el catálogo <Icono nombre="flecha" tamano={18} />
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
              {personalizables.map((p) => (
                <ProductoCard key={p.id} producto={p} stock={stockTotal(variantes, p.id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="cta-asesoria">
          <div>
            <h2>¿Tienes una idea en mente?</h2>
            <p>Escríbenos con una foto o una descripción y te decimos cómo hacerla realidad y cuánto cuesta.</p>
          </div>
          <a
            href={linkWhatsApp('Hola, quiero personalizar un producto de Talabartería Cartago.')}
            className="boton boton-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconoWhatsApp tamano={20} /> Cotizar mi pieza
          </a>
        </div>
      </section>
    </div>
  )
}
