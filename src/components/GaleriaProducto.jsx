import { useEffect, useState } from 'react'
import { conAncho, srcSet } from '../utils/imagenUrl'
import { PlaceholderImagen } from './ImagenProducto'

export default function GaleriaProducto({ producto }) {
  const imagenes = producto.imagenes || []
  const [seleccionada, setSeleccionada] = useState(0)

  useEffect(() => {
    setSeleccionada(0)
  }, [producto.id])

  if (imagenes.length === 0) {
    return (
      <div className="galeria">
        <PlaceholderImagen producto={producto} className="galeria-principal" />
      </div>
    )
  }

  const actual = imagenes[seleccionada]

  return (
    <div className="galeria">
      <img
        src={conAncho(actual, 1000)}
        srcSet={srcSet(actual, [600, 1000, 1400])}
        sizes="(max-width: 860px) 100vw, 560px"
        alt={producto.nombre}
        className="galeria-principal"
        fetchpriority="high"
      />
      {imagenes.length > 1 && (
        <div className="galeria-miniaturas">
          {imagenes.map((url, i) => (
            <button
              key={url + i}
              className={`galeria-miniatura ${i === seleccionada ? 'activa' : ''}`}
              onClick={() => setSeleccionada(i)}
              aria-label={`Ver foto ${i + 1} de ${producto.nombre}`}
            >
              <img src={conAncho(url, 160)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
