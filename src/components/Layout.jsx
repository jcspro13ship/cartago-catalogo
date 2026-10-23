import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useMoneda } from '../context/MonedaContext'
import { EMPRESA, TRANSPORTADORAS } from '../config'
import { linkWhatsApp } from '../utils/whatsapp'
import Icono, { IconoWhatsApp } from './Icono'

const BASE = import.meta.env.BASE_URL

export default function Layout() {
  const { cantidadTotal } = useCart()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Al cambiar de página: arriba del todo y menú del celular cerrado.
  useEffect(() => {
    window.scrollTo(0, 0)
    setMenuAbierto(false)
  }, [pathname])

  return (
    <div className="layout">
      <a href="#contenido" className="saltar">
        Saltar al contenido
      </a>
      <header className="header">
        <div className="contenedor header-interior">
          <button
            className="header-menu-boton"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
          >
            <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} />
          </button>

          <Link to="/" className="header-logo" aria-label="Talabartería Cartago — inicio">
            <img src={`${BASE}logo-cartago.png`} alt="Talabartería Cartago" width="300" height="151" />
          </Link>

          <nav className={`header-nav ${menuAbierto ? 'abierto' : ''}`} aria-label="Principal">
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <NavLink to="/catalogo">Catálogo</NavLink>
            <NavLink to="/hazlo-unico">Hazlo único</NavLink>
            <NavLink to="/nosotros">Nosotros</NavLink>
            <a href={linkWhatsApp('Hola, quisiera recibir asesoría de Talabartería Cartago.')} target="_blank" rel="noopener noreferrer">
              Contacto
            </a>
          </nav>

          <SelectorMoneda />

          <Link to="/carrito" className="header-carrito" aria-label={`Carrito, ${cantidadTotal} productos`}>
            <Icono nombre="carrito" />
            {cantidadTotal > 0 && <span className="header-carrito-cuenta">{cantidadTotal}</span>}
          </Link>
        </div>
      </header>

      <main id="contenido">
        <Outlet />
      </main>

      <Footer />

      {pathname !== '/carrito' && (
        <a
          className="whatsapp-flotante"
          href={linkWhatsApp('Hola, quisiera recibir asesoría de Talabartería Cartago.')}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
        >
          <IconoWhatsApp tamano={28} />
        </a>
      )}
    </div>
  )
}

function SelectorMoneda() {
  const { moneda, setMoneda } = useMoneda()
  return (
    <div className="selector-moneda" role="group" aria-label="Moneda de los precios">
      {['COP', 'USD'].map((m) => (
        <button key={m} className={moneda === m ? 'activa' : ''} aria-pressed={moneda === m} onClick={() => setMoneda(m)}>
          {m}
        </button>
      ))}
    </div>
  )
}

function Footer() {
  const anio = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="costura costura-clara" />
      <div className="contenedor footer-grid">
        <div className="footer-marca">
          <img src={`${BASE}logo-cartago-blanco.png`} alt="Talabartería Cartago" width="300" height="151" />
          <p>Talabartería artesanal, artículos ecuestres y marroquinería con más de 30 años de tradición.</p>
        </div>

        <div>
          <h4>Explora</h4>
          <ul>
            <li><Link to="/catalogo">Catálogo completo</Link></li>
            <li><Link to="/hazlo-unico">Hazlo único</Link></li>
            <li><Link to="/nosotros">Nuestra historia</Link></li>
            <li><Link to="/carrito">Mi pedido</Link></li>
          </ul>
        </div>

        <div>
          <h4>Visítanos</h4>
          <ul className="footer-contacto">
            {(EMPRESA.direccion || EMPRESA.ciudad) && (
              <li>
                <Icono nombre="ubicacion" tamano={18} />
                <span>{[EMPRESA.direccion, EMPRESA.ciudad].filter(Boolean).join(' · ')}</span>
              </li>
            )}
            {EMPRESA.horario && EMPRESA.horario.length > 0 && (
              <li>
                <Icono nombre="reloj" tamano={18} />
                <span>
                  {EMPRESA.horario.map((linea) => (
                    <span key={linea} className="footer-linea">
                      {linea}
                    </span>
                  ))}
                </span>
              </li>
            )}
            {EMPRESA.telefono && (
              <li>
                <Icono nombre="telefono" tamano={18} />
                <a href={`tel:${EMPRESA.telefono.replace(/\s/g, '')}`}>{EMPRESA.telefono}</a>
              </li>
            )}
            <li>
              <IconoWhatsApp tamano={18} />
              <a href={linkWhatsApp('Hola, quisiera recibir asesoría de Talabartería Cartago.')} target="_blank" rel="noopener noreferrer">
                Escríbenos por WhatsApp
              </a>
            </li>
          </ul>
          {(EMPRESA.instagram || EMPRESA.facebook) && (
            <div className="footer-redes">
              {EMPRESA.instagram && (
                <a href={`https://instagram.com/${EMPRESA.instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <Icono nombre="instagram" />
                </a>
              )}
              {EMPRESA.facebook && (
                <a href={EMPRESA.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <Icono nombre="facebook" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="contenedor footer-envios">
        <span>Envíos a todo Colombia y al exterior con</span>
        <div className="footer-envios-logos">
          {TRANSPORTADORAS.map((t) => (
            <img key={t.nombre} src={t.logo} alt={t.nombre} title={t.nombre} width="40" height="40" loading="lazy" />
          ))}
        </div>
      </div>
      <div className="contenedor footer-legal">
        <span>© {anio} {EMPRESA.razonSocial}</span>
        <span>
          Desarrollado por <strong>JCS Consultoría Developments</strong>
        </span>
      </div>
    </footer>
  )
}
