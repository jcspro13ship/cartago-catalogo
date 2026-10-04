import { createContext, useContext, useEffect, useState } from 'react'
import { useCatalogo } from './CatalogoContext'
import { precioEn, textoPrecio, formatoPrecio } from '../utils/formato'

const MonedaContext = createContext(null)
const CLAVE_MONEDA = 'cartago_moneda_v1'

function leerMoneda() {
  try {
    return localStorage.getItem(CLAVE_MONEDA) === 'USD' ? 'USD' : 'COP'
  } catch {
    return 'COP'
  }
}

// Moneda en la que el cliente ve los precios (pesos o dólares). Se recuerda
// entre visitas, para que un cliente del exterior no tenga que cambiarla cada vez.
export function MonedaProvider({ children }) {
  const { config } = useCatalogo()
  const [moneda, setMoneda] = useState(leerMoneda)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_MONEDA, moneda)
    } catch {
      // Sin almacenamiento: la moneda vale solo para esta visita.
    }
  }, [moneda])

  const tasaUsd = config.tasaUsd
  const valor = {
    moneda,
    setMoneda,
    tasaUsd,
    precio: (item) => precioEn(item, moneda, tasaUsd),
    texto: (item) => textoPrecio(precioEn(item, moneda, tasaUsd), moneda),
    formato: (v) => formatoPrecio(v, moneda),
  }

  return <MonedaContext.Provider value={valor}>{children}</MonedaContext.Provider>
}

export function useMoneda() {
  const ctx = useContext(MonedaContext)
  if (!ctx) throw new Error('useMoneda debe usarse dentro de MonedaProvider')
  return ctx
}
