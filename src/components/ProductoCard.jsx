import { Link } from 'react-router-dom'
import ImagenProducto from './ImagenProducto'
import { textoPrecio } from '../utils/formato'

export default function ProductoCard({ producto, stock }) {
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
        <p className="producto-card-categoria">{producto.categoria}</p>
        <h3>{producto.nombre}</h3>
        <p className={`producto-card-precio ${producto.precio > 0 ? '' : 'consultar'}`}>
          {textoPrecio(producto.precio)}
        </p>
      </div>
    </Link>
  )
}
