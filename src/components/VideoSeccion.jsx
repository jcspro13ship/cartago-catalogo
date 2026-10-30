import { useState } from 'react'
import Icono from './Icono'

// Saca el código del video de un link de YouTube (watch, youtu.be, shorts, embed).
function idYoutube(url) {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/)
  return m ? m[1] : null
}

// Video de una sección. Con YouTube muestra solo la miniatura y carga el
// reproductor al tocarla, para que la página no se vuelva lenta. También
// acepta un link directo a un .mp4 (por ejemplo, subido a Cloudinary).
export default function VideoSeccion({ url, titulo }) {
  const [reproducir, setReproducir] = useState(false)
  if (!url) return null
  const id = idYoutube(url)

  if (!id) {
    // De Cloudinary se puede pedir un fotograma del video como portada.
    const portada = url.includes('res.cloudinary.com') ? url.replace('/f_auto,q_auto/', '/so_1/').replace(/\.[a-z0-9]+$/i, '.jpg') : undefined
    return (
      <div className="video-seccion">
        <video src={url} poster={portada} controls preload="none" playsInline title={titulo} />
      </div>
    )
  }

  return (
    <div className="video-seccion">
      {reproducir ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className="video-portada" onClick={() => setReproducir(true)} aria-label={`Reproducir: ${titulo}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="video-play">
            <Icono nombre="play" tamano={28} />
          </span>
        </button>
      )}
    </div>
  )
}
