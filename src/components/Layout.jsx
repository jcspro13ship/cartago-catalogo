import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useMoneda } from '../context/MonedaContext'
import { CATEGORIAS, EMPRESA, TRANSPORTADORAS } from '../config'
import { linkACamino } from '../utils/categorias'
import { linkWhatsApp } from '../utils/whatsapp'
import Icono, { IconoWhatsApp } from './Icono'

const BASE = import.meta.env.BASE_URL

const ANUNCIOS = [
  'Envíos a todo Colombia y al exterior',
  'Pago contraentrega con Dropi',
  'Piezas personalizadas hechas a mano',
  'Más de 30 años en el gremio equino',
  'Asesoría por WhatsApp: 315 002 2233',
]

export default function Layout() {
  const { cantidadTotal } = useCart()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [termino, setTermino] = useState('')
  const navigate = useNavigate()

  function buscar(e) {
    e.preventDefault()
    const q = termino.trim()
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo')
    setTermino('')
  }

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
      <div className="anuncios" aria-label="Avisos">
        <div className="anuncios-pista">
          {[0, 1].map((copia) => (
            <span key={copia} aria-hidden={copia === 1}>
              {ANUNCIOS.map((t) => (
                <span key={t} className="anuncio">
                  {t}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
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

          <form className="header-buscar" role="search" onSubmit={buscar}>
            <Icono nombre="buscar" tamano={18} />
            <input
              type="search"
              placeholder="Buscar sillas, aperos, sombreros…"
              aria-label="Buscar en el catálogo"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
            />
          </form>

          <SelectorMoneda />

          <Link to="/carrito" className="header-carrito" aria-label={`Carrito, ${cantidadTotal} productos`}>
            <Icono nombre="carrito" />
            {cantidadTotal > 0 && <span className="header-carrito-cuenta">{cantidadTotal}</span>}
          </Link>
        </div>

        <MenuPrincipal abierto={menuAbierto} />
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

// Menú principal armado desde el árbol de categorías. En computador cada
// categoría abre su desplegable al pasar el mouse; en el celular, con la flecha.
function MenuPrincipal({ abierto }) {
  const [desplegado, setDesplegado] = useState(null)
  const { pathname, search } = useLocation()
  // Todas las categorías llevan a /catalogo, así que la activa se decide por ?categoria=.
  const categoriaActiva = pathname === '/catalogo' ? new URLSearchParams(search).get('categoria') : null
  const alternar = (nombre) => setDesplegado((d) => (d === nombre ? null : nombre))

  return (
    <nav className={`menu ${abierto ? 'abierto' : ''}`} aria-label="Principal">
      <div className="contenedor menu-interior">
        {CATEGORIAS.map((cat) => {
          const tieneSub = cat.hijos && cat.hijos.length > 0
          const esMega = tieneSub && cat.hijos.some((h) => h.hijos && h.hijos.length)
          return (
            <div key={cat.nombre} className={`menu-item ${tieneSub ? 'con-sub' : ''} ${desplegado === cat.nombre ? 'desplegado' : ''}`}>
              <Link to={linkACamino([cat.nombre])} className={`menu-enlace ${categoriaActiva === cat.nombre ? 'active' : ''}`}>
                {cat.nombre}
              </Link>
              {tieneSub && (
                <button
                  type="button"
                  className="menu-flecha"
                  aria-label={`Ver subcategorías de ${cat.nombre}`}
                  aria-expanded={desplegado === cat.nombre}
                  onClick={() => alternar(cat.nombre)}
                >
                  <Icono nombre="flecha-abajo" tamano={14} />
                </button>
              )}
              {tieneSub && (
                <div className={`submenu ${esMega ? 'submenu-mega' : ''}`}>
                  {esMega ? (
                    cat.hijos.map((grupo) => (
                      <div key={grupo.nombre} className="submenu-columna">
                        <Link to={linkACamino([cat.nombre, grupo.nombre])} className="submenu-titulo">
                          {grupo.nombre === 'Caballo' ? 'Para el caballo' : grupo.nombre === 'Jinete' ? 'Para el jinete' : grupo.nombre}
                        </Link>
                        {(grupo.hijos || []).map((sub) =>
                          sub.hijos && sub.hijos.length ? (
                            <div key={sub.nombre} className="submenu-grupo">
                              <Link to={linkACamino([cat.nombre, grupo.nombre, sub.nombre])} className="submenu-subtitulo">
                                {sub.nombre}
                              </Link>
                              {sub.hijos.map((hoja) => (
                                <Link key={hoja.nombre} to={linkACamino([cat.nombre, grupo.nombre, sub.nombre, hoja.nombre])}>
                                  {hoja.nombre}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <Link key={sub.nombre} to={linkACamino([cat.nombre, grupo.nombre, sub.nombre])}>
                              {sub.nombre}
                            </Link>
                          )
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="submenu-columna">
                      {cat.hijos.map((hoja) => (
                        <Link key={hoja.nombre} to={linkACamino([cat.nombre, hoja.nombre])}>
                          {hoja.nombre}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div className="menu-item">
          <NavLink to="/hazlo-unico" className="menu-enlace menu-personalizados">
            ★ Personalizados
          </NavLink>
        </div>
        <div className="menu-item menu-secundario menu-empuje">
          <NavLink to="/nosotros" className="menu-enlace">
            Nosotros
          </NavLink>
        </div>
        <div className="menu-item menu-secundario">
          <NavLink to="/preguntas-frecuentes" className="menu-enlace">
            Preguntas frecuentes
          </NavLink>
        </div>
      </div>
    </nav>
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
            <li><Link to="/hazlo-unico">Personalizados</Link></li>
            <li><Link to="/nosotros">Nuestra historia</Link></li>
            <li><Link to="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
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
