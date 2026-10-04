import { Link } from 'react-router-dom'

export default function NoEncontrado() {
  return (
    <div className="contenedor pagina-vacia">
      <p className="sobretitulo">Página no encontrada</p>
      <h1>Este camino no lleva a ningún lado</h1>
      <p>Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <Link to="/catalogo" className="boton boton-primario">
        Ir al catálogo
      </Link>
    </div>
  )
}
