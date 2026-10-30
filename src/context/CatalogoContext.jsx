import { createContext, useContext, useEffect, useState } from 'react'
import { cargarCatalogo, catalogoInicial } from '../data/fetchCatalogo'

const CatalogoContext = createContext(null)

export function CatalogoProvider({ children }) {
  const [estado, setEstado] = useState(() => {
    const inicial = catalogoInicial()
    return inicial
      ? { ...inicial, cargando: false }
      : { productos: [], variantes: [], config: { tasaUsd: 0, logosMarcas: {}, preguntas: null, videos: {} }, cargando: true, fuente: null }
  })

  useEffect(() => {
    let vigente = true
    cargarCatalogo().then((data) => {
      if (vigente) setEstado({ ...data, cargando: false })
    })
    return () => {
      vigente = false
    }
  }, [])

  return <CatalogoContext.Provider value={estado}>{children}</CatalogoContext.Provider>
}

export function useCatalogo() {
  const ctx = useContext(CatalogoContext)
  if (!ctx) throw new Error('useCatalogo debe usarse dentro de CatalogoProvider')
  return ctx
}

export function variantesDe(variantes, productoId) {
  return variantes.filter((v) => v.producto_id === productoId)
}

// Una variante con stock null no lleva control de inventario: siempre se
// puede pedir y Cartago confirma por WhatsApp.
export function hayStock(v) {
  return v.stock === null || v.stock > 0
}

// Suma del stock de un producto; null si alguna variante no lleva control
// (en ese caso el producto se considera disponible).
export function stockTotal(variantes, productoId) {
  let total = 0
  for (const v of variantesDe(variantes, productoId)) {
    if (v.stock === null) return null
    total += v.stock
  }
  return total
}

export function disponible(stock) {
  return stock === null || stock > 0
}
