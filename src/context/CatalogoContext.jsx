import { createContext, useContext, useEffect, useState } from 'react'
import { cargarCatalogo, catalogoInicial } from '../data/fetchCatalogo'

const CatalogoContext = createContext(null)

export function CatalogoProvider({ children }) {
  const [estado, setEstado] = useState(() => {
    const inicial = catalogoInicial()
    return inicial
      ? { ...inicial, cargando: false }
      : { productos: [], variantes: [], config: { tasaUsd: 0, logosMarcas: {} }, cargando: true, fuente: null }
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

export function stockTotal(variantes, productoId) {
  return variantesDe(variantes, productoId).reduce((acc, v) => acc + v.stock, 0)
}
