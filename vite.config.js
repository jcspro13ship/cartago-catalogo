import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El sitio se sirve en la raíz del dominio propio (talabarteriacartago.com).
// Si algún día vuelve a github.io/cartago-catalogo/, este valor debe ser
// '/cartago-catalogo/' y pathSegmentsToKeep en public/404.html, 1.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
