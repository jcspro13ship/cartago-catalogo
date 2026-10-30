// DATOS DE EJEMPLO — se reemplazan por el catálogo real de Cartago.
// Estructura pensada para mapear 1:1 con la hoja "Productos" de Google Sheets:
// id | nombre | categoria | subcategoria | marca | descripcion | precio | precio_usd |
// activo | destacado | personalizable | nota_personalizacion | garantia
// Las fotos van en la hoja "Imagenes" (producto_id | orden | url).

const BORDADO = 'Bordado con el nombre del caballo, del criadero o tus iniciales.'

function p(id, nombre, categoria, subcategoria, marca, descripcion, precio, extra = {}) {
  return {
    id,
    nombre,
    categoria,
    subcategoria,
    marca,
    descripcion,
    precio,
    activo: true,
    destacado: false,
    personalizable: false,
    nota_personalizacion: '',
    garantia: '',
    ...extra,
  }
}

export const productos = [
  p('m1', 'Silla Chaparral Cartago', 'Monturas', 'Sillas', 'Cartago',
    'Nuestra silla de marca propia, fabricada a mano. Se hace en los colores y repujados que elijas, y el apero de cabeza se puede fabricar a tono con los mismos terminados.',
    0, { destacado: true, personalizable: true, nota_personalizacion: 'Cuéntanos colores, repujado y si quieres el apero de cabeza a tono con la silla.' }),
  p('m2', 'Silla mexicana', 'Monturas', 'Sillas', 'Cartago',
    'Silla de estilo mexicano con fuste reforzado y acabados en cuero de primera.', 0),
  p('m3', 'Tereque de trabajo', 'Monturas', 'Tereques', 'San Fermín',
    'Tereque resistente para jornadas largas de trabajo en finca.', 1450000),
  p('m4', 'Galápago clásico', 'Monturas', 'Galápagos', 'Mesacé',
    'Galápago liviano de líneas clásicas, cómodo para el jinete y el caballo.', 980000, { destacado: true }),
  p('m5', 'Montura kids', 'Monturas', 'Kids', 'Cartago',
    'Montura a la medida de los jinetes más pequeños, segura y liviana.', 650000),
  p('e1', 'Apero de cabeza', 'Accesorios', 'Aperos', 'Cartago',
    'Apero completo en cuero, ajustable. Se puede fabricar a tono con tu silla Chaparral.',
    320000, { personalizable: true, nota_personalizacion: BORDADO }),
  p('e2', 'Freno a la medida', 'Accesorios', 'Frenos', 'Cartago',
    'Freno fabricado bajo medida para tu caballo.', 0,
    { destacado: true, garantia: 'Garantía de cambio: lo ensayas y, si no se le acomoda a tu caballo, te lo cambiamos sin costo adicional.' }),
  p('e3', 'Jaquimón de baño', 'Accesorios', 'Jáquimas', 'Cartago',
    'Jaquimón resistente al agua para el baño del caballo.', 0, { personalizable: true, nota_personalizacion: BORDADO }),
  p('e4', 'Pellón', 'Accesorios', 'Pellones', 'San Fermín',
    'Pellón suave y abrigado que protege el lomo del caballo.', 280000),
  p('e5', 'Alforja en cuero', 'Accesorios', 'Alforjas', 'Mesacé',
    'Alforja amplia en cuero, ideal para cabalgatas largas.', 360000),
  p('e6', 'Pechera bordada', 'Accesorios', 'Pecheras', 'Cartago',
    'Pechera en cuero con bordado a mano.', 210000, { destacado: true, personalizable: true, nota_personalizacion: BORDADO }),
  p('e7', 'Estribos en acero', 'Accesorios', 'Tarabas y estribos', 'Mesacé',
    'Par de estribos en acero inoxidable con base antideslizante.', 165000),
  p('j1', 'Sombrero de jinete', 'Accesorios', 'Sombreros', 'Cartago',
    'Sombrero de ala ancha para el sol y la lluvia en cabalgata.', 140000),
  p('j2', 'Cinturón en cuero', 'Accesorios', 'Marroquinería', 'Cartago',
    'Cinturón de una sola pieza, 3,5 cm de ancho, hebilla en acero envejecido.',
    85000, { destacado: true, personalizable: true, nota_personalizacion: 'Indícanos la talla de cintura y si quieres iniciales.' }),
  p('j3', 'Carriel tradicional', 'Accesorios', 'Marroquinería', 'San Fermín',
    'El clásico carriel en cuero con sus compartimentos tradicionales.', 260000),
  p('j4', 'Llavero miniatura', 'Accesorios', 'Bisutería', 'Cheval',
    'Llavero con miniatura ecuestre en metal.', 35000),
  p('c1', 'Kit de aseo', 'Cuidado del caballo', '', 'Sybec',
    'Kit con los productos básicos para el baño y cuidado del pelaje.', 120000),
  p('c2', 'Pijama para caballo', 'Cuidado del caballo', '', 'Cartago',
    'Pijama en tela suave para el descanso en pesebrera. Con más de un bordado, el precio se consulta.',
    180000, { personalizable: true, nota_personalizacion: BORDADO }),
  p('k1', 'Collar para perro', 'Caninos', 'Collares', 'Cartago',
    'Collar en cuero suave con hebilla reforzada y argolla para traílla.', 55000, { personalizable: true, nota_personalizacion: 'Contorno de cuello y nombre de tu mascota, si lo quieres grabado.' }),
]
