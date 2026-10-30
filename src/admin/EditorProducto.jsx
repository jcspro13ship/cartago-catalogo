import { useMemo, useRef, useState } from 'react'
import { CATEGORIAS } from '../config'
import { hojasDe } from '../utils/categorias'
import { conAncho } from '../utils/imagenUrl'
import { subirFoto } from './fotos'

// Letra con la que empiezan los códigos de cada categoría (m1, e4, j2…).
const PREFIJOS = { Monturas: 'm', Accesorios: 'a', 'Cuidado del caballo': 'c', Caninos: 'k' }

function siguienteId(categoria, productos) {
  const prefijo = PREFIJOS[categoria] || 'p'
  const usados = productos
    .map((p) => String(p.id))
    .filter((id) => id.startsWith(prefijo) && /^\d+$/.test(id.slice(prefijo.length)))
    .map((id) => Number(id.slice(prefijo.length)))
  return `${prefijo}${usados.length ? Math.max(...usados) + 1 : 1}`
}

function abreviar(color) {
  return String(color || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase()
}

// Códigos únicos para cada color: id-NEG, id-CAF… (id solo si no hay color).
function asignarSkus(id, filas) {
  const usados = new Set()
  return filas.map((f) => {
    let base = f.color.trim() ? `${id}-${abreviar(f.color) || 'COL'}` : id
    let sku = base
    let n = 2
    while (usados.has(sku)) sku = `${base}${n++}`
    usados.add(sku)
    return { ...f, sku }
  })
}

const VACIO = {
  id: '',
  nombre: '',
  categoria: '',
  subcategoria: '',
  marca: 'Cartago',
  descripcion: '',
  precio: '',
  precio_usd: '',
  activo: true,
  destacado: false,
  personalizable: false,
  nota_personalizacion: '',
  garantia: '',
}

export default function EditorProducto({ producto, variantes, productos, marcas, ejecutar, onCerrar }) {
  const nuevo = !producto
  const [form, setForm] = useState(() => ({ ...VACIO, ...(producto || {}), precio: producto?.precio || '', precio_usd: producto?.precio_usd || '' }))
  const [colores, setColores] = useState(() =>
    variantes.length ? variantes.map((v) => ({ color: v.color, stock: v.stock === null ? '' : v.stock })) : [{ color: '', stock: '' }]
  )
  const [fotos, setFotos] = useState(() => [...(producto?.imagenes || [])])
  const [subiendo, setSubiendo] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [linkFoto, setLinkFoto] = useState('')
  const inputFotos = useRef(null)

  const subcategorias = useMemo(() => {
    return hojasDe(form.categoria)
  }, [form.categoria])

  function cambiar(campo, valor) {
    setForm((f) => {
      const siguiente = { ...f, [campo]: valor }
      // Al elegir categoría en un producto nuevo, se propone el código.
      if (campo === 'categoria' && nuevo) {
        siguiente.id = siguienteId(valor, productos)
        siguiente.subcategoria = ''
      }
      return siguiente
    })
    setError('')
  }

  function cambiarColor(i, campo, valor) {
    setColores((cs) => cs.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)))
  }

  async function agregarFotos(archivos) {
    setError('')
    const lista = [...archivos]
    setSubiendo((n) => n + lista.length)
    for (const archivo of lista) {
      try {
        const url = await subirFoto(archivo)
        setFotos((fs) => [...fs, url])
      } catch (err) {
        setError(`No se pudo subir ${archivo.name}: ${err.message}`)
      } finally {
        setSubiendo((n) => n - 1)
      }
    }
  }

  function moverFoto(i, dir) {
    setFotos((fs) => {
      const copia = [...fs]
      const j = i + dir
      if (j < 0 || j >= copia.length) return fs
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return setError('Escribe el nombre del producto.')
    if (!form.categoria) return setError('Elige una categoría.')
    if (!form.id.trim()) return setError('El producto necesita un código.')
    if (subiendo > 0) return setError('Espera a que terminen de subir las fotos.')
    // Filas con color; si ninguna tiene, el producto queda con una sola variante sin color.
    const conColor = colores.filter((c) => c.color.trim())
    const filas = conColor.length ? conColor : [{ color: '', stock: colores[0] ? colores[0].stock : '' }]
    const variantesFinales = asignarSkus(form.id.trim(), filas).map((c) => ({ sku: c.sku, color: c.color.trim(), stock: String(c.stock).trim() === '' ? '' : Number(c.stock) || 0 }))
    setGuardando(true)
    try {
      await ejecutar(
        'guardarProducto',
        {
          nuevo,
          producto: { ...form, id: form.id.trim(), precio: Number(form.precio) || 0, precio_usd: Number(form.precio_usd) || 0 },
          variantes: variantesFinales,
          imagenes: fotos,
        },
        nuevo ? 'Producto creado.' : 'Cambios guardados.'
      )
      onCerrar()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar "${form.nombre}" del catálogo? Esta acción no se puede deshacer.\n\nSi solo quieres esconderlo, desmarca "Visible en la tienda".`)) return
    setGuardando(true)
    try {
      await ejecutar('eliminarProducto', { id: form.id }, 'Producto eliminado.')
      onCerrar()
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <form className="admin-editor" onSubmit={guardar}>
      <div className="admin-barra">
        <div>
          <button type="button" className="admin-enlace" onClick={onCerrar}>
            ← Volver a productos
          </button>
          <h1>{nuevo ? 'Nuevo producto' : form.nombre || 'Editar producto'}</h1>
        </div>
      </div>

      <div className="admin-editor-grid">
        <div className="admin-bloque">
          <h2>Datos del producto</h2>
          <label className="campo">
            <span>Nombre</span>
            <input value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} placeholder="Ej. Freno a la medida" />
          </label>
          <div className="admin-dos">
            <label className="campo">
              <span>Categoría</span>
              <select value={form.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
                <option value="">Elige…</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Subcategoría</span>
              <select value={form.subcategoria} onChange={(e) => cambiar('subcategoria', e.target.value)} disabled={!subcategorias.length}>
                <option value="">—</option>
                {subcategorias.map((h) => (
                  <option key={h.etiqueta} value={h.nombre}>
                    {h.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-dos">
            <label className="campo">
              <span>Marca</span>
              <select value={form.marca} onChange={(e) => cambiar('marca', e.target.value)}>
                <option value="">Sin marca</option>
                {marcas.map((m) => (
                  <option key={m.marca}>{m.marca}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Código</span>
              <input
                value={form.id}
                onChange={(e) => cambiar('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={!nuevo}
                placeholder="Se propone solo"
              />
            </label>
          </div>
          <label className="campo">
            <span>Descripción</span>
            <textarea rows="4" value={form.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} />
          </label>
        </div>

        <div className="admin-bloque">
          <h2>Precio</h2>
          <div className="admin-dos">
            <label className="campo">
              <span>Precio en pesos</span>
              <input type="number" min="0" step="1000" inputMode="numeric" value={form.precio} onChange={(e) => cambiar('precio', e.target.value)} placeholder="0 = a consultar" />
            </label>
            <label className="campo">
              <span>
                Precio en dólares <em>(opcional)</em>
              </span>
              <input type="number" min="0" step="1" inputMode="numeric" value={form.precio_usd} onChange={(e) => cambiar('precio_usd', e.target.value)} placeholder="Se calcula con la tasa" />
            </label>
          </div>
          <p className="admin-sub">Si el precio queda en 0 o vacío, la tienda muestra "Precio a consultar".</p>

          <h2>Colores y stock</h2>
          {colores.map((c, i) => (
            <div key={i} className="admin-color-fila">
              <input placeholder={colores.length === 1 ? 'Color (vacío si no maneja colores)' : 'Color'} value={c.color} onChange={(e) => cambiarColor(i, 'color', e.target.value)} />
              <input type="number" min="0" inputMode="numeric" value={c.stock} placeholder="Sin control" onChange={(e) => cambiarColor(i, 'stock', e.target.value)} aria-label="Unidades" />
              <button type="button" className="admin-quitar" onClick={() => setColores((cs) => cs.filter((_, j) => j !== i))} disabled={colores.length === 1} aria-label="Quitar color">
                ×
              </button>
            </div>
          ))}
          <p className="admin-sub">Cantidad vacía = sin control de inventario (siempre disponible).</p>
          <button type="button" className="admin-enlace" onClick={() => setColores((cs) => [...cs, { color: '', stock: '' }])}>
            + Agregar color
          </button>
        </div>

        <div className="admin-bloque admin-bloque-ancho">
          <h2>Fotos</h2>
          <p className="admin-sub">La primera foto es la portada. Usa las flechas para cambiar el orden.</p>
          <div className="admin-fotos">
            {fotos.map((url, i) => (
              <div key={url + i} className="admin-foto">
                <img src={conAncho(url, 300)} alt={`Foto ${i + 1}`} />
                {i === 0 && <span className="admin-foto-portada">Portada</span>}
                <div className="admin-foto-acciones">
                  <button type="button" onClick={() => moverFoto(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda">
                    ←
                  </button>
                  <button type="button" onClick={() => setFotos((fs) => fs.filter((_, j) => j !== i))} aria-label="Quitar foto">
                    ×
                  </button>
                  <button type="button" onClick={() => moverFoto(i, 1)} disabled={i === fotos.length - 1} aria-label="Mover a la derecha">
                    →
                  </button>
                </div>
              </div>
            ))}
            {Array.from({ length: subiendo }).map((_, i) => (
              <div key={`s${i}`} className="admin-foto admin-foto-subiendo">
                Subiendo…
              </div>
            ))}
            <button type="button" className="admin-foto admin-foto-agregar" onClick={() => inputFotos.current.click()}>
              + Agregar fotos
            </button>
          </div>
          <input
            ref={inputFotos}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              agregarFotos(e.target.files)
              e.target.value = ''
            }}
          />
          <div className="admin-link-foto">
            <input placeholder="…o pega el link de una foto" value={linkFoto} onChange={(e) => setLinkFoto(e.target.value)} />
            <button
              type="button"
              className="boton boton-secundario"
              disabled={!/^https?:\/\//.test(linkFoto.trim())}
              onClick={() => {
                setFotos((fs) => [...fs, linkFoto.trim()])
                setLinkFoto('')
              }}
            >
              Agregar
            </button>
          </div>
        </div>

        <div className="admin-bloque admin-bloque-ancho">
          <h2>Opciones</h2>
          <div className="admin-opciones">
            <label className="admin-check">
              <input type="checkbox" checked={form.activo} onChange={(e) => cambiar('activo', e.target.checked)} />
              <span>
                <strong>Visible en la tienda</strong>
                <small>Desmárcalo para esconderlo sin borrarlo.</small>
              </span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={form.destacado} onChange={(e) => cambiar('destacado', e.target.checked)} />
              <span>
                <strong>Destacado</strong>
                <small>Aparece en la página de inicio.</small>
              </span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={form.personalizable} onChange={(e) => cambiar('personalizable', e.target.checked)} />
              <span>
                <strong>Personalizable</strong>
                <small>El cliente puede pedir bordado o detalles.</small>
              </span>
            </label>
          </div>
          {form.personalizable && (
            <label className="campo">
              <span>Pista para el cliente</span>
              <input
                value={form.nota_personalizacion}
                onChange={(e) => cambiar('nota_personalizacion', e.target.value)}
                placeholder="Bordado con el nombre del caballo, del criadero o tus iniciales."
              />
            </label>
          )}
          <label className="campo">
            <span>
              Garantía <em>(opcional, se muestra resaltada)</em>
            </span>
            <input value={form.garantia} onChange={(e) => cambiar('garantia', e.target.value)} placeholder="Ej. Garantía de cambio si no se le acomoda al caballo." />
          </label>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-editor-pie">
        {!nuevo && (
          <button type="button" className="admin-eliminar" onClick={eliminar} disabled={guardando}>
            Eliminar producto
          </button>
        )}
        <button type="button" className="boton boton-secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </button>
        <button className="boton boton-primario" disabled={guardando || subiendo > 0}>
          {guardando ? 'Guardando…' : nuevo ? 'Crear producto' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
