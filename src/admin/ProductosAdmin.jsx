import { useMemo, useState } from 'react'
import EditorProducto from './EditorProducto'
import { formatoPrecio, normalizar } from '../utils/formato'
import { conAncho } from '../utils/imagenUrl'
import { ordenarCategorias } from '../utils/categorias'

const BASE = import.meta.env.BASE_URL

export default function ProductosAdmin({ datos, ejecutar }) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [editando, setEditando] = useState(null) // producto, o {} para uno nuevo
  const [abierto, setAbierto] = useState(null) // id del producto con los colores desplegados
  const [ocupado, setOcupado] = useState('')
  const [error, setError] = useState('')

  const variantesPorProducto = useMemo(() => {
    const mapa = {}
    datos.variantes.forEach((v) => {
      ;(mapa[v.producto_id] = mapa[v.producto_id] || []).push(v)
    })
    return mapa
  }, [datos.variantes])

  const categorias = useMemo(
    () => ordenarCategorias([...new Set(datos.productos.map((p) => p.categoria).filter(Boolean))]),
    [datos.productos]
  )

  const lista = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return datos.productos.filter((p) => {
      if (categoria && p.categoria !== categoria) return false
      if (estadoFiltro === 'activos' && !p.activo) return false
      if (estadoFiltro === 'inactivos' && p.activo) return false
      if (estadoFiltro === 'agotados' && stock(variantesPorProducto[p.id]) !== 0) return false
      if (termino && !normalizar(`${p.id} ${p.nombre} ${p.marca} ${p.subcategoria}`).includes(termino)) return false
      return true
    })
  }, [datos.productos, busqueda, categoria, estadoFiltro, variantesPorProducto])

  async function cambiarStock(sku, cambio) {
    setError('')
    setOcupado(sku)
    try {
      await ejecutar('ajustarStock', { sku, cambio }, cambio < 0 ? 'Stock actualizado: se restó 1 unidad.' : 'Stock actualizado: se sumó 1 unidad.')
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado('')
    }
  }

  if (editando) {
    return (
      <EditorProducto
        producto={editando.id ? editando : null}
        variantes={editando.id ? variantesPorProducto[editando.id] || [] : []}
        productos={datos.productos}
        marcas={datos.marcas}
        ejecutar={ejecutar}
        onCerrar={() => setEditando(null)}
      />
    )
  }

  return (
    <section>
      <div className="admin-barra">
        <div>
          <h1>Productos</h1>
          <p className="admin-sub">
            {datos.productos.length} productos · {datos.productos.filter((p) => p.activo).length} visibles en la tienda
          </p>
        </div>
        <button className="boton boton-primario" onClick={() => setEditando({})}>
          + Nuevo producto
        </button>
      </div>

      <div className="admin-filtros">
        <input type="search" placeholder="Buscar por nombre, código o marca…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="activos">Visibles</option>
          <option value="inactivos">Ocultos</option>
          <option value="agotados">Agotados</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="admin-lista">
        {lista.length === 0 && <p className="admin-vacio">No hay productos con ese filtro.</p>}
        {lista.map((p) => {
          const vars = variantesPorProducto[p.id] || []
          const total = stock(vars)
          const portada = p.imagenes && p.imagenes[0]
          return (
            <article key={p.id} className={`admin-fila ${p.activo ? '' : 'inactivo'}`}>
              <div className="admin-fila-principal">
                <div className="admin-miniatura">
                  {portada ? <img src={conAncho(portada, 120)} alt="" /> : <img src={`${BASE}marca-cartago.png`} alt="" className="sin-foto" />}
                </div>
                <div className="admin-fila-info">
                  <strong>{p.nombre}</strong>
                  <span>
                    {p.id} · {[p.categoria, p.subcategoria].filter(Boolean).join(' / ')} · {p.marca || 'Sin marca'}
                  </span>
                  <span className="admin-etiquetas">
                    <em className={p.activo ? 'ok' : 'apagado'}>{p.activo ? 'Visible' : 'Oculto'}</em>
                    {p.destacado && <em>Destacado</em>}
                    {p.personalizable && <em>Personalizable</em>}
                    {(!p.imagenes || p.imagenes.length === 0) && <em className="alerta">Sin fotos</em>}
                  </span>
                </div>
                <div className="admin-fila-datos">
                  <span className="admin-precio">{p.precio > 0 ? formatoPrecio(p.precio) : 'A consultar'}</span>
                  <button
                    className={`admin-stock ${total === null ? 'libre' : total === 0 ? 'cero' : total <= 3 ? 'poco' : ''}`}
                    onClick={() => setAbierto(abierto === p.id ? null : p.id)}
                    aria-expanded={abierto === p.id}
                  >
                    {total === null ? 'Disponible' : `Stock: ${total}`} {abierto === p.id ? '▴' : '▾'}
                  </button>
                </div>
                <button className="boton boton-secundario admin-editar" onClick={() => setEditando(p)}>
                  Editar
                </button>
              </div>

              {abierto === p.id && (
                <div className="admin-variantes">
                  {vars.length === 0 && <p className="admin-sub">Este producto no tiene colores. Agrégalos desde Editar.</p>}
                  {vars.map((v) =>
                    v.stock === null ? (
                      <div key={v.sku} className="admin-variante">
                        <span>
                          {v.color || 'Único'} <small>{v.sku}</small>
                        </span>
                        <span className="admin-sub">Sin control: siempre disponible</span>
                      </div>
                    ) : (
                    <div key={v.sku} className="admin-variante">
                      <span>
                        {v.color || 'Único'} <small>{v.sku}</small>
                      </span>
                      <div className="cantidad cantidad-chica">
                        <button
                          onClick={() => cambiarStock(v.sku, -1)}
                          disabled={ocupado === v.sku || v.stock <= 0}
                          aria-label={`Restar una unidad de ${v.color || p.nombre}`}
                        >
                          −
                        </button>
                        <span>{ocupado === v.sku ? '…' : v.stock}</span>
                        <button onClick={() => cambiarStock(v.sku, 1)} disabled={ocupado === v.sku} aria-label={`Sumar una unidad de ${v.color || p.nombre}`}>
                          +
                        </button>
                      </div>
                    </div>
                    )
                  )}
                  <p className="admin-sub">
                    Usa − cuando vendas una unidad y + cuando llegue mercancía. Los colores "sin control" se muestran
                    siempre disponibles; para controlarlos, escribe la cantidad en Editar.
                  </p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

// null = algún color sin control de inventario (el producto se muestra disponible).
function stock(variantes) {
  let total = 0
  for (const v of variantes || []) {
    if (v.stock === null) return null
    total += Number(v.stock) || 0
  }
  return total
}
