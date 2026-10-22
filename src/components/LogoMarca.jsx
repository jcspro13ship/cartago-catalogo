import { useCatalogo } from '../context/CatalogoContext'
import { logoDeMarca } from '../utils/marcas'

// Cartago es multimarca: cada producto muestra el logo de su marca.
// Si la marca todavía no tiene logo, se muestra su nombre.
export default function LogoMarca({ marca, className = '' }) {
  const { config } = useCatalogo()
  if (!marca) return null
  const logo = logoDeMarca(marca, config.logosMarcas)
  return (
    <span className={`logo-marca ${className}`} title={marca}>
      {logo ? <img src={logo} alt={marca} loading="lazy" decoding="async" /> : <span>{marca}</span>}
    </span>
  )
}
