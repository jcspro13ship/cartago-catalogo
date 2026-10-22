import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Nosotros from './pages/Nosotros'
import Catalogo from './pages/Catalogo'
import ProductoDetalle from './pages/ProductoDetalle'
import Carrito from './pages/Carrito'
import HazloUnico from './pages/HazloUnico'
import NoEncontrado from './pages/NoEncontrado'
import { CartProvider } from './context/CartContext'
import { CatalogoProvider } from './context/CatalogoContext'
import { MonedaProvider } from './context/MonedaContext'

export default function App() {
  return (
    <CatalogoProvider>
      <MonedaProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Inicio />} />
              <Route path="nosotros" element={<Nosotros />} />
              <Route path="catalogo" element={<Catalogo />} />
              <Route path="hazlo-unico" element={<HazloUnico />} />
              <Route path="producto/:id" element={<ProductoDetalle />} />
              <Route path="carrito" element={<Carrito />} />
              <Route path="*" element={<NoEncontrado />} />
            </Route>
          </Routes>
        </CartProvider>
      </MonedaProvider>
    </CatalogoProvider>
  )
}
