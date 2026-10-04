import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mientras no haya dominio propio conectado, GitHub Pages sirve este sitio en
// github.io/cartago-catalogo/ (subcarpeta), por eso el base coincide con el
// nombre del repo. El día que se conecte el dominio propio de Cartago, este
// valor debe volver a '/' (y pathSegmentsToKeep en public/404.html a 0).
export default defineConfig({
  plugins: [react()],
  base: '/cartago-catalogo/',
})
