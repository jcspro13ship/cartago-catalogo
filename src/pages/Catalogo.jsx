import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalogo, stockTotal } from '../context/CatalogoContext'
import ProductoCard from '../components/ProductoCard'
import Icono from '../components/Icono'
import { normalizar } from '../utils/formato'
import { ordenarCategorias, ordenarSubcategorias, infoCategoria } from '../utils/categorias'

const TAMANO_PAGINA = 24
const TODAS = 'Todas'

const ORDENES = {
  relevancia: 'Destacados primero',
  'precio-asc': 'Precio: menor a mayor',
  'precio-desc': 'Precio: mayor a menor',
  nombre: 'Nombre (A–Z)',
}

export default function Catalogo() {
  const { productos, variantes, cargando } = useCatalogo()
  const [params, setParams] = useSearchParams()
  const categoria = params.get('categoria') || TODAS
  const subcategoria = params.get('sub') || TODAS
  const marca = params.get('marca') || TODAS
  const soloPersonalizables = params.get('personalizable') === '1'
  const busqueda = params.get('q') || ''
  const [orden, setOrden] = useState('relevancia')
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [visibles, setVisibles] = useState(TAMANO_PAGINA)

  // La categoría y la búsqueda viven en la URL: así el link se puede
  // compartir ("mira las monturas") y el botón atrás funciona como se espera.
  function cambiarParam(clave, valor) {
    const nuevos = new URLSearchParams(params)
    if (!valor || valor === TODAS) nuevos.delete(clave)
    else nuevos.set(clave, valor)
    // Al cambiar de categoría, la subcategoría anterior ya no aplica.
    if (clave === 'categoria') nuevos.delete('sub')
    setParams(nuevos, { replace: true })
  }

  const activos = useMemo(() => productos.filter((p) => p.activo), [productos])

  const stockPorProducto = useMemo(() => {
    const mapa = {}
    activos.forEach((p) => {
      mapa[p.id] = stockTotal(variantes, p.id)
    })
    return mapa
  }, [activos, variantes])

  const categorias = useMemo(
    () => [TODAS, ...ordenarCategorias([...new Set(activos.map((p) => p.categoria).filter(Boolean))])],
    [activos]
  )

  const subcategorias = useMemo(() => {
    if (categoria === TODAS) return []
    const subs = new Set(activos.filter((p) => p.categoria === categoria).map((p) => p.subcategoria).filter(Boolean))
    return subs.size > 1 ? [TODAS, ...ordenarSubcategorias(categoria, [...subs])] : []
  }, [activos, categoria])

  const marcas = useMemo(
    () => [...new Set(activos.map((p) => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [activos]
  )

  const productosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    const lista = activos.filter((p) => {
      if (categoria !== TODAS && p.categoria !== categoria) return false
      if (subcategoria !== TODAS && p.subcategoria !== subcategoria) return false
      if (marca !== TODAS && normalizar(p.marca) !== normalizar(marca)) return false
      if (soloPersonalizables && !p.personalizable) return false
      if (soloDisponibles && !(stockPorProducto[p.id] > 0)) return false
      if (termino) {
        const texto = normalizar(`${p.nombre} ${p.categoria} ${p.subcategoria} ${p.marca} ${p.descripcion}`)
        if (!termino.split(/\s+/).every((t) => texto.includes(t))) return false
      }
      return true
    })
    const conPrecio = (p) => (p.precio > 0 ? p.precio : null)
    if (orden === 'precio-asc' || orden === 'precio-desc') {
      const signo = orden === 'precio-asc' ? 1 : -1
      // Los de "precio a consultar" van siempre al final.
      lista.sort((a, b) => {
        const pa = conPrecio(a)
        const pb = conPrecio(b)
        if (pa === null) return 1
        if (pb === null) return -1
        return signo * (pa - pb)
      })
    } else if (orden === 'nombre') {
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    } else {
      // Destacados primero y los agotados al final, sin alterar el orden del Sheet entre iguales.
      lista.sort(
        (a, b) =>
          (stockPorProducto[a.id] > 0 ? 0 : 1) - (stockPorProducto[b.id] > 0 ? 0 : 1) ||
          (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0)
      )
    }
    return lista
  }, [activos, categoria, subcategoria, marca, soloPersonalizables, busqueda, soloDisponibles, orden, stockPorProducto])

  useEffect(() => {
    setVisibles(TAMANO_PAGINA)
  }, [categoria, subcategoria, marca, soloPersonalizables, busqueda, soloDisponibles, orden])

  const productosVisibles = productosFiltrados.slice(0, visibles)
  const hayMas = visibles < productosFiltrados.length

  return (
    <div className="pagina-catalogo">
      <section className="catalogo-cabecera">
        <div className="contenedor">
          <p className="sobretitulo">{soloPersonalizables ? 'Hazlo único' : marca !== TODAS ? `Marca ${marca}` : 'Catálogo'}</p>
          <h1>
            {soloPersonalizables
              ? 'Productos que personalizamos para ti'
              : categoria === TODAS
                ? 'Todos nuestros productos'
                : subcategoria !== TODAS
                  ? `${categoria} · ${subcategoria}`
                  : categoria}
          </h1>
          {categoria !== TODAS && infoCategoria(categoria) && (
            <p className="catalogo-descripcion">{infoCategoria(categoria).descripcion}</p>
          )}
        </div>
      </section>

      <div className="contenedor">
        <div className="catalogo-filtros">
          <label className="buscador">
            <Icono nombre="buscar" tamano={20} />
            <input
              type="search"
              placeholder="Buscar sillas, frenos, pecheras…"
              value={busqueda}
              onChange={(e) => cambiarParam('q', e.target.value)}
              aria-label="Buscar producto"
            />
          </label>

          <div className="catalogo-chips" role="tablist" aria-label="Categorías">
            {categorias.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={categoria === c}
                className={`chip ${categoria === c ? 'chip-activo' : ''}`}
                onClick={() => cambiarParam('categoria', c)}
              >
                {c}
              </button>
            ))}
            <button
              role="tab"
              aria-selected={soloPersonalizables}
              className={`chip chip-especial ${soloPersonalizables ? 'chip-activo' : ''}`}
              onClick={() => cambiarParam('personalizable', soloPersonalizables ? '' : '1')}
            >
              Hazlo único
            </button>
          </div>

          {subcategorias.length > 0 && (
            <div className="catalogo-chips catalogo-subchips" aria-label="Subcategorías">
              {subcategorias.map((s) => (
                <button
                  key={s}
                  className={`chip chip-sub ${subcategoria === s ? 'chip-activo' : ''}`}
                  onClick={() => cambiarParam('sub', s)}
                >
                  {s === TODAS ? 'Todas' : s}
                </button>
              ))}
            </div>
          )}

          <div className="catalogo-barra">
            <span className="catalogo-conteo">
              {cargando ? 'Cargando…' : `${productosFiltrados.length} ${productosFiltrados.length === 1 ? 'producto' : 'productos'}`}
            </span>
            <div className="catalogo-controles">
              {marcas.length > 1 && (
                <select value={marca} onChange={(e) => cambiarParam('marca', e.target.value)} aria-label="Filtrar por marca">
                  <option value={TODAS}>Todas las marcas</option>
                  {marcas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <label className="interruptor">
                <input type="checkbox" checked={soloDisponibles} onChange={(e) => setSoloDisponibles(e.target.checked)} />
                <span>Solo disponibles</span>
              </label>
              <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar productos">
                {Object.entries(ORDENES).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="catalogo-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="producto-card esqueleto" />
            ))}
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="catalogo-vacio">
            <p>No encontramos productos con ese filtro.</p>
            <button
              className="boton boton-secundario"
              onClick={() => {
                setParams({}, { replace: true })
                setSoloDisponibles(false)
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="catalogo-grid">
              {productosVisibles.map((p) => (
                <ProductoCard key={p.id} producto={p} stock={stockPorProducto[p.id]} />
              ))}
            </div>
            {hayMas && (
              <div className="catalogo-cargar-mas">
                <button className="boton boton-secundario" onClick={() => setVisibles((v) => v + TAMANO_PAGINA)}>
                  Ver más productos ({productosFiltrados.length - visibles} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
