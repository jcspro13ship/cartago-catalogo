import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cerrarSesion, iniciarSesion, llamar, sesionGuardada } from './api'
import ProductosAdmin from './ProductosAdmin'
import Ajustes from './Ajustes'
import Historial from './Historial'
import './admin.css'

const BASE = import.meta.env.BASE_URL

const PESTANAS = {
  productos: 'Productos',
  ajustes: 'Ajustes',
  historial: 'Historial',
}

export default function Admin() {
  const [sesion, setSesion] = useState(sesionGuardada)

  // El panel no debe aparecer en Google.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    document.title = 'Panel · Talabartería Cartago'
    return () => meta.remove()
  }, [])

  if (!sesion) return <Login onIngreso={setSesion} />
  return <Panel sesion={sesion} onSalir={() => setSesion(null)} />
}

function Login({ onIngreso }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      onIngreso(await iniciarSesion(usuario.trim(), clave))
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-tarjeta" onSubmit={entrar}>
        <img src={`${BASE}logo-cartago.png`} alt="Talabartería Cartago" className="admin-login-logo" />
        <h1>Panel de administración</h1>
        <p>Ingresa con tu usuario para manejar el catálogo.</p>
        <label className="campo">
          <span>Usuario</span>
          <input autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="boton boton-primario boton-ancho" disabled={enviando || !usuario || !clave}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <Link to="/" className="admin-login-volver">
          Volver a la tienda
        </Link>
      </form>
    </div>
  )
}

function Panel({ sesion, onSalir }) {
  const [pestana, setPestana] = useState('productos')
  const [estado, setEstado] = useState({ cargando: true, error: '', datos: null, usuarios: [], historial: [] })
  const [aviso, setAviso] = useState('')

  const recargar = useCallback(async () => {
    try {
      const r = await llamar('datos')
      setEstado({ cargando: false, error: '', datos: r.datos, usuarios: r.usuarios, historial: r.historial })
    } catch (err) {
      if (err.sesionVencida) onSalir()
      else setEstado((s) => ({ ...s, cargando: false, error: err.message }))
    }
  }, [onSalir])

  useEffect(() => {
    recargar()
  }, [recargar])

  useEffect(() => {
    if (!aviso) return undefined
    const t = setTimeout(() => setAviso(''), 3500)
    return () => clearTimeout(t)
  }, [aviso])

  // Ejecuta una acción del panel, avisa el resultado y vuelve a leer los datos.
  const ejecutar = useCallback(
    async (accion, datos, mensajeOk) => {
      try {
        const r = await llamar(accion, datos)
        if (mensajeOk) setAviso(mensajeOk)
        await recargar()
        return r
      } catch (err) {
        if (err.sesionVencida) onSalir()
        throw err
      }
    },
    [recargar, onSalir]
  )

  async function salir() {
    await cerrarSesion()
    onSalir()
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header-interior">
          <img src={`${BASE}marca-cartago.png`} alt="" className="admin-header-marca" />
          <div className="admin-header-titulo">
            <strong>Panel Cartago</strong>
            <span>{sesion.nombre}</span>
          </div>
          <nav className="admin-pestanas">
            {Object.entries(PESTANAS).map(([clave, texto]) => (
              <button key={clave} className={pestana === clave ? 'activa' : ''} onClick={() => setPestana(clave)}>
                {texto}
              </button>
            ))}
          </nav>
          <div className="admin-header-acciones">
            <a href={BASE} target="_blank" rel="noopener noreferrer" className="admin-enlace">
              Ver tienda
            </a>
            <button className="admin-enlace" onClick={salir}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="admin-contenido">
        {estado.cargando ? (
          <p className="admin-cargando">Cargando datos del catálogo…</p>
        ) : estado.error ? (
          <div className="admin-error">
            <p>{estado.error}</p>
            <button className="boton boton-secundario" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : pestana === 'productos' ? (
          <ProductosAdmin datos={estado.datos} ejecutar={ejecutar} />
        ) : pestana === 'ajustes' ? (
          <Ajustes datos={estado.datos} usuarios={estado.usuarios} sesion={sesion} ejecutar={ejecutar} />
        ) : (
          <Historial historial={estado.historial} />
        )}
      </main>

      {aviso && (
        <div className="admin-aviso" role="status">
          {aviso}
        </div>
      )}
    </div>
  )
}
