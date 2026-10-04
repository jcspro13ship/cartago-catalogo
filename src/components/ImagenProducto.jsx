import { conAncho, srcSet } from '../utils/imagenUrl'

const MARCA = `${import.meta.env.BASE_URL}marca-cartago.png`

// Mientras un producto no tiene fotos cargadas se muestra un fondo con la
// marca de Cartago, para que el catálogo se vea completo y no "roto".
export function PlaceholderImagen({ producto, className = '' }) {
  return (
    <div className={`placeholder-imagen ${className}`}>
      <img src={MARCA} alt="" aria-hidden="true" />
      <span>{producto.nombre}</span>
    </div>
  )
}

// Portada del producto (primera foto) en baja resolución: se usa en el grid
// del catálogo, donde pueden aparecer decenas de tarjetas a la vez.
export default function ImagenProducto({ producto, className = '', sizes = '(max-width: 640px) 50vw, 300px' }) {
  const portada = producto.imagenes && producto.imagenes[0]
  if (!portada) return <PlaceholderImagen producto={producto} className={className} />
  return (
    <img
      src={conAncho(portada, 500)}
      srcSet={srcSet(portada, [320, 500, 800])}
      sizes={sizes}
      alt={producto.nombre}
      className={className}
      loading="lazy"
      decoding="async"
    />
  )
}
