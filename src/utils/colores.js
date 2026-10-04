// Muestra visual (círculo de color) para los nombres de color más comunes en
// cuero. Si el color escrito en el Sheet no está aquí, se muestra solo el
// nombre, sin círculo — no rompe nada.
const MUESTRAS = {
  negro: '#1d1b1a',
  cafe: '#5b3a24',
  'cafe oscuro': '#3e2617',
  'cafe claro': '#8a5a36',
  chocolate: '#3f2418',
  miel: '#b7792f',
  conac: '#9a4f22',
  cognac: '#9a4f22',
  tabaco: '#7a4a26',
  avellana: '#a07045',
  camel: '#b8864f',
  natural: '#d2b48c',
  beige: '#d9c3a0',
  crema: '#efe3cc',
  blanco: '#f7f5f2',
  gris: '#8a8684',
  rojo: '#a31d24',
  vinotinto: '#5e1426',
  vino: '#771541',
  azul: '#24406b',
  'azul oscuro': '#1b2a44',
  verde: '#3b5a3a',
  rosado: '#d998a8',
  dorado: '#c9a15a',
  plateado: '#c0c2c4',
}

export function muestraColor(nombre) {
  const clave = String(nombre || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
  return MUESTRAS[clave] || null
}
