export default function Historial({ historial }) {
  return (
    <section>
      <div className="admin-barra">
        <div>
          <h1>Historial</h1>
          <p className="admin-sub">Los últimos cambios hechos desde el panel, con quién los hizo.</p>
        </div>
      </div>
      {historial.length === 0 ? (
        <p className="admin-vacio">Todavía no hay cambios registrados.</p>
      ) : (
        <ol className="admin-historial">
          {historial.map((h, i) => (
            <li key={i}>
              <time>{formatoFecha(h.fecha)}</time>
              <strong>{h.usuario}</strong>
              <span>
                {h.accion}
                {h.detalle ? ` · ${h.detalle}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function formatoFecha(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}
