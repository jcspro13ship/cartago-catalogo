import { useState } from 'react'
import { formatoPrecio } from '../utils/formato'
import { llamar } from './api'
import { productos as productosEjemplo } from '../data/productos'
import { variantes as variantesEjemplo } from '../data/variantes'
import { PREGUNTAS_FRECUENTES } from '../data/preguntas'

export default function Ajustes({ datos, usuarios, sesion, ejecutar, recargar }) {
  return (
    <section>
      <div className="admin-barra">
        <div>
          <h1>Ajustes</h1>
          <p className="admin-sub">Tasa del dólar, videos, preguntas frecuentes, marcas y usuarios del panel.</p>
        </div>
      </div>
      <div className="admin-editor-grid">
        <Tasa actual={Number(datos.config.tasa_usd) || 0} ejecutar={ejecutar} />
        <Videos config={datos.config} ejecutar={ejecutar} />
        <Preguntas config={datos.config} ejecutar={ejecutar} />
        <Marcas marcas={datos.marcas} ejecutar={ejecutar} />
        <Usuarios usuarios={usuarios} ejecutar={ejecutar} />
        <MiClave sesion={sesion} ejecutar={ejecutar} />
        <Demostracion productos={datos.productos} recargar={recargar} />
      </div>
    </section>
  )
}

function useAccion() {
  const [estado, setEstado] = useState({ ocupado: false, error: '' })
  async function correr(fn) {
    setEstado({ ocupado: true, error: '' })
    try {
      await fn()
      setEstado({ ocupado: false, error: '' })
      return true
    } catch (err) {
      setEstado({ ocupado: false, error: err.message })
      return false
    }
  }
  return [estado, correr]
}

function Tasa({ actual, ejecutar }) {
  const [valor, setValor] = useState(String(actual || ''))
  const [estado, correr] = useAccion()
  return (
    <form
      className="admin-bloque"
      onSubmit={(e) => {
        e.preventDefault()
        correr(() => ejecutar('guardarConfig', { config: { tasa_usd: Number(valor) } }, 'Tasa del dólar actualizada.'))
      }}
    >
      <h2>Tasa del dólar</h2>
      <p className="admin-sub">Tasa actual: {actual ? formatoPrecio(actual) : 'sin definir'} por dólar. Se recomienda actualizarla cada 8 días.</p>
      <label className="campo">
        <span>Pesos por dólar</span>
        <input type="number" min="1" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="boton boton-primario" disabled={estado.ocupado || !(Number(valor) > 0) || Number(valor) === actual}>
        Guardar tasa
      </button>
    </form>
  )
}

// Links de video por sección. Sirve un link de YouTube (se recomienda) o un .mp4.
const VIDEOS = [
  { clave: 'video_personalizacion', titulo: 'Video de personalización', ayuda: 'Aparece en la página "Personalizados".' },
  { clave: 'video_inicio', titulo: 'Video de la página de inicio', ayuda: 'Aparece debajo de la franja "Hazlo único".' },
]

function Videos({ config, ejecutar }) {
  const [valores, setValores] = useState(() => Object.fromEntries(VIDEOS.map((v) => [v.clave, String(config[v.clave] || '')])))
  const [estado, correr] = useAccion()
  return (
    <form
      className="admin-bloque"
      onSubmit={(e) => {
        e.preventDefault()
        correr(() => ejecutar('guardarConfig', { config: valores }, 'Videos guardados.'))
      }}
    >
      <h2>Videos</h2>
      <p className="admin-sub">Pega el link de YouTube del video. Déjalo vacío para no mostrar video en esa sección.</p>
      {VIDEOS.map((v) => (
        <label key={v.clave} className="campo">
          <span>
            {v.titulo} <small>· {v.ayuda}</small>
          </span>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={valores[v.clave]}
            onChange={(e) => setValores({ ...valores, [v.clave]: e.target.value.trim() })}
          />
        </label>
      ))}
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="boton boton-primario" disabled={estado.ocupado}>
        Guardar videos
      </button>
    </form>
  )
}

function Preguntas({ config, ejecutar }) {
  const [lista, setLista] = useState(() => {
    try {
      const guardadas = JSON.parse(config.preguntas_frecuentes || 'null')
      if (Array.isArray(guardadas) && guardadas.length) return guardadas
    } catch {
      // JSON dañado: se arranca desde las preguntas por defecto.
    }
    return PREGUNTAS_FRECUENTES.map((p) => ({ ...p }))
  })
  const [estado, correr] = useAccion()
  const cambiar = (i, campo, v) => setLista((l) => l.map((p, j) => (j === i ? { ...p, [campo]: v } : p)))
  const mover = (i, d) =>
    setLista((l) => {
      const n = [...l]
      ;[n[i], n[i + d]] = [n[i + d], n[i]]
      return n
    })
  return (
    <form
      className="admin-bloque admin-bloque-ancho"
      onSubmit={(e) => {
        e.preventDefault()
        const limpias = lista.map((p) => ({ pregunta: p.pregunta.trim(), respuesta: p.respuesta.trim() })).filter((p) => p.pregunta && p.respuesta)
        correr(() => ejecutar('guardarConfig', { config: { preguntas_frecuentes: JSON.stringify(limpias) } }, 'Preguntas frecuentes guardadas.'))
      }}
    >
      <h2>Preguntas frecuentes</h2>
      <p className="admin-sub">Se muestran en la página "Preguntas frecuentes", en este mismo orden.</p>
      {lista.map((p, i) => (
        <div key={i} className="admin-pregunta">
          <div className="admin-pregunta-cabeza">
            <strong>{i + 1}.</strong>
            <button type="button" className="admin-enlace" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir pregunta">
              ↑
            </button>
            <button type="button" className="admin-enlace" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar pregunta">
              ↓
            </button>
            <button type="button" className="admin-quitar" onClick={() => setLista((l) => l.filter((_, j) => j !== i))} aria-label="Quitar pregunta">
              ×
            </button>
          </div>
          <input placeholder="Pregunta" value={p.pregunta} onChange={(e) => cambiar(i, 'pregunta', e.target.value)} />
          <textarea rows={3} placeholder="Respuesta" value={p.respuesta} onChange={(e) => cambiar(i, 'respuesta', e.target.value)} />
        </div>
      ))}
      <button type="button" className="admin-enlace" onClick={() => setLista((l) => [...l, { pregunta: '', respuesta: '' }])}>
        + Agregar pregunta
      </button>
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="boton boton-primario" disabled={estado.ocupado}>
        Guardar preguntas
      </button>
    </form>
  )
}

function Marcas({ marcas, ejecutar }) {
  const [lista, setLista] = useState(() => marcas.map((m) => ({ marca: m.marca, logo: m.logo || '' })))
  const [estado, correr] = useAccion()
  const cambiar = (i, campo, v) => setLista((l) => l.map((m, j) => (j === i ? { ...m, [campo]: v } : m)))
  return (
    <form
      className="admin-bloque"
      onSubmit={(e) => {
        e.preventDefault()
        correr(() => ejecutar('guardarMarcas', { marcas: lista.filter((m) => m.marca.trim()) }, 'Marcas guardadas.'))
      }}
    >
      <h2>Marcas</h2>
      <p className="admin-sub">El link del logo es opcional: Cartago, San Fermín y Mesacé ya tienen logo en la tienda.</p>
      {lista.map((m, i) => (
        <div key={i} className="admin-color-fila admin-marca-fila">
          <input placeholder="Marca" value={m.marca} onChange={(e) => cambiar(i, 'marca', e.target.value)} />
          <input placeholder="Link del logo (opcional)" value={m.logo} onChange={(e) => cambiar(i, 'logo', e.target.value)} />
          <button type="button" className="admin-quitar" onClick={() => setLista((l) => l.filter((_, j) => j !== i))} aria-label="Quitar marca">
            ×
          </button>
        </div>
      ))}
      <button type="button" className="admin-enlace" onClick={() => setLista((l) => [...l, { marca: '', logo: '' }])}>
        + Agregar marca
      </button>
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="boton boton-primario" disabled={estado.ocupado}>
        Guardar marcas
      </button>
    </form>
  )
}

function Usuarios({ usuarios, ejecutar }) {
  const [nuevo, setNuevo] = useState({ usuario: '', nombre: '', clave: '' })
  const [estado, correr] = useAccion()
  return (
    <form
      className="admin-bloque"
      onSubmit={async (e) => {
        e.preventDefault()
        const ok = await correr(() =>
          ejecutar('crearUsuario', { nuevoUsuario: nuevo.usuario.trim().toLowerCase(), nombre: nuevo.nombre, clave: nuevo.clave }, 'Usuario creado.')
        )
        if (ok) setNuevo({ usuario: '', nombre: '', clave: '' })
      }}
    >
      <h2>Usuarios del panel</h2>
      <ul className="admin-usuarios">
        {usuarios.map((u) => (
          <li key={u.usuario}>
            <strong>{u.nombre}</strong> <small>{u.usuario}</small>
          </li>
        ))}
      </ul>
      <h3>Crear usuario</h3>
      <div className="admin-dos">
        <label className="campo">
          <span>Usuario</span>
          <input value={nuevo.usuario} onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })} placeholder="ej. marcela" autoComplete="off" />
        </label>
        <label className="campo">
          <span>Nombre</span>
          <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Marcela Rivera" />
        </label>
      </div>
      <label className="campo">
        <span>Contraseña inicial (mínimo 8 caracteres)</span>
        <input type="password" autoComplete="new-password" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} />
      </label>
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="boton boton-primario" disabled={estado.ocupado || !nuevo.usuario || nuevo.clave.length < 8}>
        Crear usuario
      </button>
    </form>
  )
}

function MiClave({ sesion, ejecutar }) {
  const [c, setC] = useState({ actual: '', nueva: '', repetir: '' })
  const [estado, correr] = useAccion()
  const coincide = c.nueva === c.repetir
  return (
    <form
      className="admin-bloque"
      onSubmit={async (e) => {
        e.preventDefault()
        const ok = await correr(() => ejecutar('cambiarClave', { claveActual: c.actual, claveNueva: c.nueva }, 'Contraseña actualizada.'))
        if (ok) setC({ actual: '', nueva: '', repetir: '' })
      }}
    >
      <h2>Mi contraseña</h2>
      <p className="admin-sub">Sesión iniciada como {sesion.nombre} ({sesion.usuario}).</p>
      <label className="campo">
        <span>Contraseña actual</span>
        <input type="password" autoComplete="current-password" value={c.actual} onChange={(e) => setC({ ...c, actual: e.target.value })} />
      </label>
      <label className="campo">
        <span>Contraseña nueva</span>
        <input type="password" autoComplete="new-password" value={c.nueva} onChange={(e) => setC({ ...c, nueva: e.target.value })} />
      </label>
      <label className="campo">
        <span>Repite la contraseña nueva</span>
        <input type="password" autoComplete="new-password" value={c.repetir} onChange={(e) => setC({ ...c, repetir: e.target.value })} />
      </label>
      {!coincide && c.repetir && <p className="error">Las contraseñas no coinciden.</p>}
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="boton boton-primario" disabled={estado.ocupado || !c.actual || c.nueva.length < 8 || !coincide}>
        Cambiar contraseña
      </button>
    </form>
  )
}

// Productos de muestra para enseñar la tienda antes de cargar el catálogo
// real. Llevan el código "demo-…" para poder quitarlos todos de una vez sin
// tocar los productos reales.
const PREFIJO_DEMO = 'demo-'

function Demostracion({ productos, recargar }) {
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')
  const demos = productos.filter((p) => String(p.id).startsWith(PREFIJO_DEMO))

  async function cargar() {
    setError('')
    try {
      for (let i = 0; i < productosEjemplo.length; i++) {
        const p = productosEjemplo[i]
        const id = PREFIJO_DEMO + p.id
        if (productos.some((x) => x.id === id)) continue
        setProgreso(`Cargando ${i + 1} de ${productosEjemplo.length}: ${p.nombre}`)
        await llamar('guardarProducto', {
          nuevo: true,
          producto: { ...p, id },
          variantes: variantesEjemplo
            .filter((v) => v.producto_id === p.id)
            .map((v) => ({ sku: PREFIJO_DEMO + v.sku, color: v.color, stock: v.stock })),
          imagenes: [],
        })
      }
    } catch (err) {
      setError(err.message)
    }
    setProgreso('')
    await recargar()
  }

  async function quitar() {
    if (!window.confirm(`¿Quitar los ${demos.length} productos de demostración? Los productos reales no se tocan.`)) return
    setError('')
    try {
      for (let i = 0; i < demos.length; i++) {
        setProgreso(`Quitando ${i + 1} de ${demos.length}: ${demos[i].nombre}`)
        await llamar('eliminarProducto', { id: demos[i].id })
      }
    } catch (err) {
      setError(err.message)
    }
    setProgreso('')
    await recargar()
  }

  return (
    <div className="admin-bloque">
      <h2>Productos de demostración</h2>
      <p className="admin-sub">
        Productos de muestra (código "demo-…") para enseñar la tienda mientras se carga el catálogo real. Se quitan
        todos con un clic, sin afectar los productos reales.
      </p>
      {progreso && <p className="admin-sub"><strong>{progreso}…</strong></p>}
      {error && <p className="error">{error}</p>}
      {demos.length > 0 ? (
        <button className="boton boton-secundario" onClick={quitar} disabled={!!progreso}>
          Quitar {demos.length} productos de demostración
        </button>
      ) : (
        <button className="boton boton-primario" onClick={cargar} disabled={!!progreso}>
          Cargar {productosEjemplo.length} productos de demostración
        </button>
      )}
    </div>
  )
}
