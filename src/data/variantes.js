// DATOS DE EJEMPLO — se reemplazan por el inventario real de Cartago.
// Estructura pensada para mapear 1:1 con la hoja "Variantes" de Google Sheets:
// producto_id | sku | color | stock
// Un producto tiene una fila por color. Si no maneja colores, una sola fila
// con la columna color vacía.

export const variantes = [
  { producto_id: 'm1', sku: 'm1-CAF', color: 'Café', stock: 2 },
  { producto_id: 'm1', sku: 'm1-MIE', color: 'Miel', stock: 1 },
  { producto_id: 'm1', sku: 'm1-NEG', color: 'Negro', stock: 1 },
  { producto_id: 'm2', sku: 'm2', color: '', stock: 1 },
  { producto_id: 'm3', sku: 'm3-CAF', color: 'Café', stock: 2 },
  { producto_id: 'm4', sku: 'm4-CHO', color: 'Chocolate', stock: 3 },
  { producto_id: 'm4', sku: 'm4-MIE', color: 'Miel', stock: 0 },
  { producto_id: 'm5', sku: 'm5-CAF', color: 'Café', stock: 2 },
  { producto_id: 'e1', sku: 'e1-CAF', color: 'Café', stock: 4 },
  { producto_id: 'e1', sku: 'e1-NEG', color: 'Negro', stock: 3 },
  { producto_id: 'e2', sku: 'e2', color: '', stock: 10 },
  { producto_id: 'e3', sku: 'e3-NEG', color: 'Negro', stock: 5 },
  { producto_id: 'e4', sku: 'e4-NAT', color: 'Natural', stock: 4 },
  { producto_id: 'e5', sku: 'e5-CAF', color: 'Café', stock: 2 },
  { producto_id: 'e6', sku: 'e6-MIE', color: 'Miel', stock: 3 },
  { producto_id: 'e6', sku: 'e6-CAF', color: 'Café', stock: 2 },
  { producto_id: 'e7', sku: 'e7', color: '', stock: 8 },
  { producto_id: 'j1', sku: 'j1-NEG', color: 'Negro', stock: 6 },
  { producto_id: 'j1', sku: 'j1-BEI', color: 'Beige', stock: 4 },
  { producto_id: 'j2', sku: 'j2-NEG', color: 'Negro', stock: 12 },
  { producto_id: 'j2', sku: 'j2-CAF', color: 'Café', stock: 9 },
  { producto_id: 'j2', sku: 'j2-CON', color: 'Coñac', stock: 0 },
  { producto_id: 'j3', sku: 'j3-CAF', color: 'Café', stock: 3 },
  { producto_id: 'j4', sku: 'j4', color: '', stock: 20 },
  { producto_id: 'c1', sku: 'c1', color: '', stock: 7 },
  { producto_id: 'c2', sku: 'c2-AZU', color: 'Azul', stock: 3 },
  { producto_id: 'c2', sku: 'c2-VIN', color: 'Vinotinto', stock: 2 },
  { producto_id: 'k1', sku: 'k1-CAF', color: 'Café', stock: 6 },
  { producto_id: 'k1', sku: 'k1-VIN', color: 'Vinotinto', stock: 4 },
]
