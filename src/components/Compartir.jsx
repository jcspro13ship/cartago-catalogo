import { useEffect, useRef, useState } from 'react'
import Icono, { IconoWhatsApp } from './Icono'

// Link para compartir la página actual. Usa la forma "?/ruta" (la misma del
// 404.html): así WhatsApp y Facebook reciben una página válida y muestran la
// vista previa con el logo, en vez de un error 404.
function linkCompartible(destino) {
  const { origin, pathname, search } = window.location
  const base = import.meta.env.BASE_URL
  const ruta = (destino ? destino.replace(/^\//, '') : pathname.slice(base.length)).replace(/&/g, '~and~')
  const consulta = destino ? '' : search.slice(1).replace(/&/g, '~and~')
  if (!ruta && !consulta) return origin + base
  return `${origin}${base}?/${ruta}${consulta ? `&${consulta}` : ''}`
}

// ruta: lo que se comparte (por defecto, la página actual). compacto: solo el ícono.
export default function Compartir({ titulo, etiqueta = 'Compartir', className = '', ruta, compacto = false }) {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const caja = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined
    const cerrar = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('pointerdown', cerrar)
    return () => document.removeEventListener('pointerdown', cerrar)
  }, [abierto])

  async function compartir(e) {
    e.preventDefault()
    e.stopPropagation()
    const url = linkCompartible(ruta)
    // En el celular se abre el menú del teléfono (WhatsApp, Instagram, etc.).
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: titulo, text: titulo, url })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }
    setCopiado(false)
    setAbierto((v) => !v)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(linkCompartible(ruta))
      setCopiado(true)
    } catch {
      window.prompt('Copia este link:', linkCompartible(ruta))
    }
  }

  const url = encodeURIComponent(linkCompartible(ruta))
  const mensaje = encodeURIComponent(`${titulo} · Talabartería Cartago\n`)

  return (
    <div className={`compartir ${compacto ? 'compartir-compacto' : ''} ${className}`} ref={caja}>
      {compacto ? (
        <button type="button" className="compartir-icono" onClick={compartir} aria-expanded={abierto} aria-label={`${etiqueta}: ${titulo}`} title={etiqueta}>
          <Icono nombre="compartir" tamano={16} />
        </button>
      ) : (
        <button type="button" className="boton boton-secundario compartir-boton" onClick={compartir} aria-expanded={abierto}>
          <Icono nombre="compartir" tamano={18} /> {etiqueta}
        </button>
      )}
      {abierto && (
        <div className="compartir-menu">
          <a href={`https://wa.me/?text=${mensaje}${url}`} target="_blank" rel="noopener noreferrer">
            <IconoWhatsApp tamano={18} /> WhatsApp
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener noreferrer">
            <Icono nombre="facebook" tamano={18} /> Facebook
          </a>
          <button type="button" onClick={copiar}>
            <Icono nombre={copiado ? 'check' : 'enlace'} tamano={18} /> {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  )
}
