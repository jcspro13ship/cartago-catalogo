// Número de WhatsApp de ventas (con código de país, sin +, sin espacios)
export const WHATSAPP_NUMBER = '573150022233'

// Apps Script publicado sobre el Google Sheet del inventario (ver docs/INSTRUCTIVO_TECNICO.md).
// Mientras esté vacío, el sitio usa los datos de ejemplo en src/data/.
export const SHEETS_API_URL = ''

// Datos de contacto que aparecen en el pie de página y en "Nosotros".
// Los campos vacíos simplemente no se muestran.
export const EMPRESA = {
  nombre: 'Talabartería Cartago',
  razonSocial: 'Cartago Talabartería SAS',
  fundacion: 1992,
  ciudad: 'Cali, Colombia',
  direccion: 'Calle 8 # 23-49, Barrio Alameda',
  horario: ['Lunes a viernes: 8:30 a.m. – 5:30 p.m.', 'Sábados: 8:30 a.m. – 4:00 p.m.', 'Domingos: cerrado'],
  telefono: '315 002 2233',
  instagram: 'talabarteriacartago',
  facebook: 'https://www.facebook.com/share/1C6JxqXiHZ/',
}

// Tasa de cambio para mostrar precios en dólares mientras el Sheet no tenga
// una propia (hoja "Configuracion", clave tasa_usd). Cartago la actualiza
// cada 8 días desde el Sheet.
export const TASA_USD_EJEMPLO = 3000

// Pedidos con envío nacional por debajo de este valor se pueden pagar
// contraentrega (Dropi).
export const TOPE_CONTRAENTREGA = 1000000

// Orden y descripción de las categorías del menú. Los productos se clasifican
// en el Sheet con estas mismas palabras (columnas categoria y subcategoria).
// Si en el Sheet aparece una categoría que no está aquí, el sitio la muestra
// igual, al final.
export const CATEGORIAS = [
  {
    nombre: 'Monturas',
    descripcion: 'Sillas, tereques, galápagos y monturas para niños',
    subcategorias: ['Sillas', 'Tereques', 'Galápagos', 'Kids'],
  },
  {
    nombre: 'Equino',
    descripcion: 'Aperos, frenos, pellones, alforjas, correaje y tarabas',
    subcategorias: ['Cabeza', 'Alfombras', 'Alforjas', 'Correaje', 'Tarabas'],
  },
  {
    nombre: 'Jinete',
    descripcion: 'Sombreros, marroquinería y bisutería',
    subcategorias: ['Sombreros', 'Marroquinería', 'Bisutería'],
  },
  {
    nombre: 'Cuidado del caballo',
    descripcion: 'Aseo, suplementos y accesorios',
    subcategorias: ['Aseo', 'Suplementos', 'Accesorios'],
  },
  {
    nombre: 'Caninos',
    descripcion: 'Pecheras, collares, traíllas y bozales',
    subcategorias: ['Pecheras', 'Collares', 'Traíllas', 'Bozales'],
  },
]

// Logos de las marcas que vende Cartago (tienda multimarca). La hoja
// "Marcas" del Sheet puede agregar o reemplazar logos con un link.
// Sin logo, la marca se muestra con su nombre escrito.
const BASE = import.meta.env.BASE_URL
export const LOGOS_MARCAS = {
  Cartago: `${BASE}marcas/cartago.png`,
  'San Fermín': `${BASE}marcas/san-fermin.png`,
  Mesacé: `${BASE}marcas/mesace.png`,
}

// Orden en que aparecen las marcas en la página de inicio.
export const MARCAS = ['Cartago', 'San Fermín', 'Mesacé', 'Al Torno', 'Sybec', 'Natural V.', 'Cheval']

export const TRANSPORTADORAS = [
  { nombre: 'Servientrega', logo: `${BASE}envios/servientrega.png` },
  { nombre: 'Inter Rapidísimo', logo: `${BASE}envios/inter-rapidisimo.png` },
  { nombre: 'Dropi (contraentrega)', logo: `${BASE}envios/dropi.png` },
  { nombre: 'DHL', logo: `${BASE}envios/dhl.png` },
]
