import { Link } from 'react-router-dom'
import { EMPRESA } from '../config'

const BASE = import.meta.env.BASE_URL

// Textos tomados del Documento Oficial de Identidad Empresarial de
// Cartago Talabartería SAS (versión 2.0, agosto de 2026).
const VALORES = [
  {
    titulo: 'Cada caballo y su jinete merecen nuestro mejor esfuerzo',
    texto:
      'El amor por lo que hacemos se traduce en atención profesional y cercana. No hay un cliente «pequeño» ni una venta «de rutina»: cada uno recibe la misma dedicación.',
  },
  {
    titulo: 'La integridad se prueba en lo que nadie ve',
    texto:
      'Hacemos las cosas bien aunque nadie esté supervisando. Por eso nuestros clientes pueden confiar en que lo que les decimos es exactamente lo que van a recibir.',
  },
  {
    titulo: 'La seguridad viene de la preparación',
    texto:
      'Seguimos aprendiendo, mejorando nuestros productos y perfeccionando nuestra asesoría. La confianza se construye, no se improvisa.',
  },
  {
    titulo: 'El respeto es el lenguaje de nuestro negocio',
    texto:
      'Tratamos con el mismo respeto a nuestro equipo, a nuestros clientes y a nuestros proveedores. La puntualidad y la palabra cumplida son nuestra forma de decir «usted me importa».',
  },
  {
    titulo: 'Todo lo que hacemos, lo hacemos para el Señor',
    texto:
      'Nuestro negocio no separa la fe del trabajo diario. El amor, la honestidad y el trabajo en equipo son expresión de lo que creemos en cada área de la vida.',
  },
]

export default function Nosotros() {
  return (
    <div className="pagina-nosotros">
      <section className="nosotros-hero">
        <div className="contenedor">
          <p className="sobretitulo sobretitulo-claro">Quiénes somos</p>
          <h1>Un legado que se cose a mano desde {EMPRESA.fundacion}</h1>
        </div>
      </section>

      <section className="seccion contenedor nosotros-proposito">
        <img src={`${BASE}marca-cartago.png`} alt="" aria-hidden="true" className="nosotros-marca" />
        <div>
          <p className="sobretitulo">Nuestro propósito</p>
          <h2>Existimos para honrar el legado de nuestro fundador</h2>
          <p className="texto-grande">
            David Morales sembró en nuestros corazones el amor por el cuero, el caballo y el trabajo honesto. Su
            obra vive en cada pieza que fabricamos, en cada cliente que asesoramos y en cada artesano que trabaja
            con nosotros con respeto y dignidad.
          </p>
          <p>
            Somos el puente entre lo que él empezó y lo que aún está por venir: una empresa que sirve de forma
            integral a su comunidad y al gremio equino, con la misma entrega con la que él lo hizo, y con la
            convicción de que el mejor homenaje a quien nos formó es seguir creciendo sin perder el alma.
          </p>
        </div>
      </section>

      <div className="contenedor">
        <div className="costura" />
      </div>

      <section className="seccion contenedor mision-vision">
        <article>
          <p className="sobretitulo">Misión</p>
          <h3>Quiénes somos hoy</h3>
          <p>
            Transformamos la relación del jinete con su caballo, entregando productos innovadores y de
            talabartería de calidad superior, respaldados por una asesoría experta y cercana que nadie más ofrece
            igual. Acompañamos a cada cliente del gremio equino para que tome la mejor decisión posible y viva su
            pasión con seguridad, calma y plenitud.
          </p>
          <p className="destacado">Somos la primera opción porque entregamos lo que prometemos.</p>
        </article>
        <article>
          <p className="sobretitulo">Visión · Horizonte 2030</p>
          <h3>A dónde vamos</h3>
          <p>
            Seremos la tienda multimarca de talabartería más grande del suroccidente colombiano, con presencia
            nacional e internacional y canales digitales fortalecidos.
          </p>
          <p>
            Uniremos a los talabarteros artesanos del país bajo un mismo estándar de excelencia, conectando a
            toda la comunidad equina con innovación digital y un aporte social real al ecosistema que nos formó.
          </p>
        </article>
      </section>

      <section className="seccion seccion-tono">
        <div className="contenedor">
          <div className="seccion-encabezado">
            <div>
              <p className="sobretitulo">En qué creemos</p>
              <h2>Valores que ya vivimos</h2>
            </div>
          </div>
          <div className="valores-grid">
            {VALORES.map((v, i) => (
              <article key={v.titulo} className="valor">
                <span className="valor-numero">{String(i + 1).padStart(2, '0')}</span>
                <h3>{v.titulo}</h3>
                <p>{v.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="legado">
        <div className="contenedor legado-interior">
          <blockquote>«Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres.»</blockquote>
          <p className="legado-cita">Colosenses 3:23</p>
          <p className="legado-memoria">En memoria y honor de David Morales, fundador de Cartago Talabartería.</p>
          <Link to="/catalogo" className="boton boton-claro">
            Ver nuestro catálogo
          </Link>
        </div>
      </section>
    </div>
  )
}
