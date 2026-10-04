// DATOS DE EJEMPLO — se reemplazan por el inventario real de Cartago.
// Estructura pensada para mapear 1:1 con la hoja "Variantes" de Google Sheets:
// producto_id | sku | color | stock
// Un producto tiene una fila por color. Si no maneja colores, una sola fila
// con la columna color vacía.

export const variantes = [
  { producto_id: 'm1', sku: 'm1-CAF', color: 'Café', stock: 2 },
  { producto_id: 'm1', sku: 'm1-MIE', color: 'Miel', stock: 1 },
  { producto_id: 'm1', sku: 'm1-NEG', color: 'Negro', stock: 0 },
  { producto_id: 'm2', sku: 'm2-CAF', color: 'Café', stock: 3 },
  { producto_id: 'm2', sku: 'm2-CHO', color: 'Chocolate', stock: 1 },
  { producto_id: 'r1', sku: 'r1-CAF', color: 'Café', stock: 8 },
  { producto_id: 'r1', sku: 'r1-NEG', color: 'Negro', stock: 5 },
  { producto_id: 'r1', sku: 'r1-NAT', color: 'Natural', stock: 0 },
  { producto_id: 'r2', sku: 'r2-CAF', color: 'Café', stock: 4 },
  { producto_id: 'r2', sku: 'r2-NEG', color: 'Negro', stock: 2 },
  { producto_id: 'a1', sku: 'a1-MIE', color: 'Miel', stock: 3 },
  { producto_id: 'a1', sku: 'a1-CAF', color: 'Café', stock: 2 },
  { producto_id: 'a2', sku: 'a2', color: '', stock: 10 },
  { producto_id: 'c1', sku: 'c1-NEG', color: 'Negro', stock: 12 },
  { producto_id: 'c1', sku: 'c1-CAF', color: 'Café', stock: 9 },
  { producto_id: 'c1', sku: 'c1-CON', color: 'Coñac', stock: 6 },
  { producto_id: 'c2', sku: 'c2-MIE', color: 'Miel', stock: 4 },
  { producto_id: 'c2', sku: 'c2-TAB', color: 'Tabaco', stock: 2 },
  { producto_id: 'b1', sku: 'b1-CAF', color: 'Café', stock: 2 },
  { producto_id: 'b1', sku: 'b1-NEG', color: 'Negro', stock: 1 },
  { producto_id: 'b2', sku: 'b2-CAF', color: 'Café', stock: 5 },
  { producto_id: 'w1', sku: 'w1-NEG', color: 'Negro', stock: 15 },
  { producto_id: 'w1', sku: 'w1-CAF', color: 'Café', stock: 11 },
  { producto_id: 'k1', sku: 'k1-CAF', color: 'Café', stock: 6 },
  { producto_id: 'k1', sku: 'k1-VIN', color: 'Vinotinto', stock: 4 },
]
