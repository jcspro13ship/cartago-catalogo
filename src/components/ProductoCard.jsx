import { Link } from 'react-router-dom'
import ImagenProducto from './ImagenProducto'
import LogoMarca from './LogoMarca'
import { useMoneda } from '../context/MonedaContext'

export default function ProductoCard({ producto, stock }) {
  const { precio, texto } = useMoneda()
  const agotado = stock === 0
  return (
    <Link to={`/producto/${producto.id}`} className="producto-card">
      <div className="producto-card-media">
        <ImagenProducto producto={producto} className="producto-card-imagen" />
        {agotado ? (
          <span className="etiqueta etiqueta-agotado">Agotado</span>
        ) : producto.personalizable ? (
          <span className="etiqueta">Personalizable</span>
        ) : null}
      </div>
      <div className="producto-card-info">
        <div className="producto-card-cabecera">
          <p className="producto-card-categoria">{producto.subcategoria || producto.categoria}</p>
          <LogoMarca marca={producto.marca} className="logo-marca-chica" />
        </div>
        <h3>{producto.nombre}</h3>
        <p className={`producto-card-precio ${precio(producto) > 0 ? '' : 'consultar'}`}>{texto(producto)}</p>
      </div>
    </Link>
  )
}
