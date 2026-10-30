// Número de WhatsApp de ventas (con código de país, sin +, sin espacios)
export const WHATSAPP_NUMBER = '573150022233'

// Apps Script publicado sobre el Google Sheet del inventario (ver docs/INSTRUCTIVO_TECNICO.md).
// Vacío = el sitio usa los datos de ejemplo de src/data/ y el panel un modo de
// prueba. En desarrollo se puede forzar con: VITE_MOCK=1 npm run dev
export const SHEETS_API_URL =
  import.meta.env.VITE_MOCK === '1'
    ? ''
    : 'https://script.google.com/macros/s/AKfycbxFoxkD_9XPalQIjeWDra8BFJqRM74xSG7bjd-Gv20nGxVZ8u2vacxijJcxJEq6O6cT8A/exec'

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

// Árbol de categorías del menú y del catálogo (ver docs/CATEGORIAS.md).
// En el Sheet cada producto lleva solo dos datos: "categoria" (el primer
// nivel: Monturas, Accesorios…) y "subcategoria" (el último nivel: Aperos,
// Pecheras…). El camino completo (Accesorios › Caballo › Cabeza › Aperos) se
// deduce de este árbol. Una categoría que aparezca en el Sheet y no esté aquí
// se muestra igual, al final.
const hojas = (...nombres) => nombres.map((nombre) => ({ nombre }))

export const CATEGORIAS = [
  {
    nombre: 'Monturas',
    descripcion: 'Sillas, tereques, galápagos y monturas para niños',
    hijos: hojas('Sillas', 'Tereques', 'Galápagos', 'Kids', 'Maletas para silla'),
  },
  {
    nombre: 'Accesorios',
    descripcion: 'Todo para el caballo y el jinete',
    hijos: [
      {
        nombre: 'Caballo',
        descripcion: 'Cabeza, lomo, correaje y colgantes',
        hijos: [
          { nombre: 'Cabeza', hijos: hojas('Aperos', 'Jáquimas', 'Riendas', 'Frenos') },
          { nombre: 'Lomo', hijos: hojas('Alfombras', 'Pellones', 'Alforjas') },
          { nombre: 'Correaje', hijos: hojas('Pecheras', 'Cinchas', 'Grupas', 'Arretrancos', 'Rejos y chipas') },
          { nombre: 'Colgantes', hijos: hojas('Guardabarros', 'Arciones', 'Tarabas y estribos', 'Espuelas') },
        ],
      },
      {
        nombre: 'Jinete',
        descripcion: 'Sombreros, prendas, marroquinería y bisutería',
        hijos: hojas('Sombreros', 'Prendas', 'Marroquinería', 'Bisutería'),
      },
    ],
  },
  {
    nombre: 'Cuidado del caballo',
    descripcion: 'Aseo, herraje y protección',
    hijos: [],
  },
  {
    nombre: 'Caninos',
    descripcion: 'Bozales, collares, pecheras y traíllas',
    hijos: hojas('Bozales', 'Collares', 'Pecheras', 'Traíllas', 'Brazaletes'),
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
