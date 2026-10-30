import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalogo, stockTotal, disponible } from '../context/CatalogoContext'
import ProductoCard from '../components/ProductoCard'
import Icono from '../components/Icono'
import { normalizar } from '../utils/formato'
import { linkWhatsApp } from '../utils/whatsapp'
import { ordenarCategorias, ordenarHijos, nodoEn, rutaDeProducto, estaEnRuta } from '../utils/categorias'
import { Link } from 'react-router-dom'

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
  // Camino dentro de la categoría, ej. ?categoria=Accesorios&ruta=Caballo/Cabeza.
  // Los links viejos con ?sub=Aperos se convierten al camino completo.
  const rutaParam = params.get('ruta')
  const subLegacy = params.get('sub')
  const camino = useMemo(() => {
    if (categoria === TODAS) return []
    if (rutaParam) return [categoria, ...rutaParam.split('/').filter(Boolean)]
    if (subLegacy) return rutaDeProducto({ categoria, subcategoria: subLegacy })
    return [categoria]
  }, [categoria, rutaParam, subLegacy])
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
    // Al cambiar de categoría, el camino anterior ya no aplica.
    if (clave === 'categoria') {
      nuevos.delete('ruta')
      nuevos.delete('sub')
    }
    setParams(nuevos, { replace: true })
  }

  function irA(nuevoCamino) {
    const nuevos = new URLSearchParams(params)
    nuevos.delete('sub')
    if (nuevoCamino.length === 0) nuevos.delete('categoria')
    else nuevos.set('categoria', nuevoCamino[0])
    if (nuevoCamino.length > 1) nuevos.set('ruta', nuevoCamino.slice(1).join('/'))
    else nuevos.delete('ruta')
    setParams(nuevos, { replace: true })
  }

  // Cada producto con su camino completo en el árbol de categorías.
  const activos = useMemo(
    () => productos.filter((p) => p.activo).map((p) => ({ ...p, _ruta: rutaDeProducto(p) })),
    [productos]
  )

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

  // Segunda fila de chips: los hijos del nivel actual (o los hermanos, si ya
  // se llegó a la última subcategoría), solo los que tienen productos.
  const subnivel = useMemo(() => {
    if (camino.length === 0) return null
    const hijosCon = (base) => {
      const nombres = new Set(
        activos.filter((p) => estaEnRuta(p, base) && p._ruta.length > base.length).map((p) => p._ruta[base.length])
      )
      return ordenarHijos(base, [...nombres])
    }
    let base = camino
    let opciones = hijosCon(base)
    if (opciones.length === 0 && camino.length > 1) {
      base = camino.slice(0, -1)
      opciones = hijosCon(base)
    }
    if (opciones.length < 2 && base === camino) return null
    return { base, opciones, activa: camino[base.length] || null }
  }, [activos, camino])

  const marcas = useMemo(
    () => [...new Set(activos.map((p) => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [activos]
  )

  const productosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    const lista = activos.filter((p) => {
      if (camino.length && !estaEnRuta(p, camino)) return false
      if (marca !== TODAS && normalizar(p.marca) !== normalizar(marca)) return false
      if (soloPersonalizables && !p.personalizable) return false
      if (soloDisponibles && !disponible(stockPorProducto[p.id])) return false
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
          (disponible(stockPorProducto[a.id]) ? 0 : 1) - (disponible(stockPorProducto[b.id]) ? 0 : 1) ||
          (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0)
      )
    }
    return lista
  }, [activos, camino, marca, soloPersonalizables, busqueda, soloDisponibles, orden, stockPorProducto])

  useEffect(() => {
    setVisibles(TAMANO_PAGINA)
  }, [camino, marca, soloPersonalizables, busqueda, soloDisponibles, orden])

  const productosVisibles = productosFiltrados.slice(0, visibles)
  const hayMas = visibles < productosFiltrados.length

  return (
    <div className="pagina-catalogo">
      <section className="catalogo-cabecera">
        <div className="contenedor">
          <nav className="migas catalogo-migas" aria-label="Ruta">
            <Link to="/catalogo">Catálogo</Link>
            {camino.map((nombre, i) => (
              <span key={nombre + i}>
                <span aria-hidden="true">›</span>
                {i < camino.length - 1 ? (
                  <button type="button" onClick={() => irA(camino.slice(0, i + 1))}>
                    {nombre}
                  </button>
                ) : (
                  <strong>{nombre}</strong>
                )}
              </span>
            ))}
          </nav>
          <h1>
            {soloPersonalizables
              ? 'Productos personalizados'
              : marca !== TODAS && camino.length === 0
                ? `Marca ${marca}`
                : camino.length
                  ? camino[camino.length - 1]
                  : 'Todos nuestros productos'}
          </h1>
          {camino.length > 0 && nodoEn(camino)?.descripcion && <p className="catalogo-descripcion">{nodoEn(camino).descripcion}</p>}
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
              ★ Personalizados
            </button>
          </div>

          {subnivel && (
            <div className="catalogo-chips catalogo-subchips" aria-label="Subcategorías">
              <button
                className={`chip chip-sub ${!subnivel.activa ? 'chip-activo' : ''}`}
                onClick={() => irA(subnivel.base)}
              >
                Ver todo
              </button>
              {subnivel.opciones.map((nombre) => (
                <button
                  key={nombre}
                  className={`chip chip-sub ${subnivel.activa === nombre ? 'chip-activo' : ''}`}
                  onClick={() => irA([...subnivel.base, nombre])}
                >
                  {nombre}
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
        ) : activos.length === 0 ? (
          <div className="catalogo-vacio">
            <p>Estamos cargando nuestro catálogo en línea. Mientras tanto, escríbenos y te contamos qué tenemos disponible.</p>
            <a
              href={linkWhatsApp('Hola, quisiera saber qué productos tienen disponibles.')}
              className="boton boton-whatsapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Escribir por WhatsApp
            </a>
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
