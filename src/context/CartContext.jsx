import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const CLAVE_CARRITO = 'cartago_carrito_v1'

// Un mismo producto y color con distinta personalización son dos líneas
// diferentes del pedido (ej. una correa con iniciales "JM" y otra con "AR").
function claveLinea(it) {
  return `${it.sku}::${it.personalizacion || ''}`
}

function leerCarrito() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO))
    return Array.isArray(guardado) ? guardado : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(leerCarrito)

  // El carrito sobrevive si el cliente cierra la pestaña o vuelve otro día.
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items))
    } catch {
      // Modo privado sin almacenamiento: el carrito funciona solo en esta visita.
    }
  }, [items])

  function addItem(nuevo) {
    const linea = { ...nuevo, linea: claveLinea(nuevo) }
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.linea === linea.linea)
      if (idx >= 0) {
        const copia = [...prev]
        const cantidad = copia[idx].cantidad + linea.cantidad
        copia[idx] = { ...copia[idx], cantidad: linea.stock ? Math.min(cantidad, linea.stock) : cantidad }
        return copia
      }
      return [...prev, linea]
    })
  }

  function removeItem(linea) {
    setItems((prev) => prev.filter((it) => it.linea !== linea))
  }

  function updateCantidad(linea, cantidad) {
    setItems((prev) =>
      prev
        .map((it) => (it.linea === linea ? { ...it, cantidad: it.stock ? Math.min(cantidad, it.stock) : cantidad } : it))
        .filter((it) => it.cantidad > 0)
    )
  }

  function clearCart() {
    setItems([])
  }

  const cantidadTotal = useMemo(() => items.reduce((acc, it) => acc + it.cantidad, 0), [items])

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateCantidad, clearCart, cantidadTotal }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
