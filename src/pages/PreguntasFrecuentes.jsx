import { useState } from 'react'
import { useCatalogo } from '../context/CatalogoContext'
import { PREGUNTAS_FRECUENTES } from '../data/preguntas'
import { linkWhatsApp } from '../utils/whatsapp'
import Icono, { IconoWhatsApp } from '../components/Icono'

export default function PreguntasFrecuentes() {
  const { config } = useCatalogo()
  const preguntas = config.preguntas && config.preguntas.length ? config.preguntas : PREGUNTAS_FRECUENTES
  const [abierta, setAbierta] = useState(0)

  return (
    <div className="pagina-preguntas">
      <section className="nosotros-hero">
        <div className="contenedor">
          <p className="sobretitulo sobretitulo-claro">Ayuda</p>
          <h1>Preguntas frecuentes</h1>
          <p className="hero-texto">Lo que más nos preguntan sobre pedidos, pagos, envíos y personalización.</p>
        </div>
      </section>

      <section className="seccion contenedor contenedor-angosto">
        <div className="preguntas">
          {preguntas.map((p, i) => {
            const abierto = abierta === i
            return (
              <div key={p.pregunta} className={`pregunta ${abierto ? 'abierta' : ''}`}>
                <h2>
                  <button type="button" aria-expanded={abierto} aria-controls={`respuesta-${i}`} onClick={() => setAbierta(abierto ? null : i)}>
                    <span>{p.pregunta}</span>
                    <Icono nombre="mas" tamano={20} />
                  </button>
                </h2>
                <div id={`respuesta-${i}`} className="pregunta-respuesta" hidden={!abierto}>
                  <p>{p.respuesta}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="cta-asesoria">
          <div>
            <h2>¿No encuentras tu respuesta?</h2>
            <p>Escríbenos y te ayudamos con gusto.</p>
          </div>
          <a
            href={linkWhatsApp('Hola, tengo una pregunta sobre Talabartería Cartago.')}
            className="boton boton-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconoWhatsApp tamano={20} /> Preguntar por WhatsApp
          </a>
        </div>
      </section>
    </div>
  )
}
