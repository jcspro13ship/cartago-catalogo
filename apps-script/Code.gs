// Este script se pega en Extensiones > Apps Script del Google Sheet del catálogo.
// Sirve los datos de las hojas "Productos", "Variantes" e "Imagenes" como JSON,
// para que el sitio web los lea automáticamente. No requiere instalar nada más.

var CACHE_KEY = 'catalogo_json_v1'
var CACHE_SEGUNDOS = 300 // 5 minutos: evita releer todo el Sheet en cada visita

function doGet(e) {
  var cache = CacheService.getScriptCache()
  var cacheado = cache.get(CACHE_KEY)
  if (cacheado) {
    return ContentService.createTextOutput(cacheado).setMimeType(ContentService.MimeType.JSON)
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet()

  var imagenesPorProducto = {}
  sheetToObjects(ss.getSheetByName('Imagenes')).forEach(function (img) {
    var pid = String(img.producto_id)
    if (!img.url) return
    if (!imagenesPorProducto[pid]) imagenesPorProducto[pid] = []
    imagenesPorProducto[pid].push({ orden: Number(img.orden) || 0, url: String(img.url) })
  })
  Object.keys(imagenesPorProducto).forEach(function (pid) {
    imagenesPorProducto[pid].sort(function (a, b) {
      return a.orden - b.orden
    })
  })

  var productos = sheetToObjects(ss.getSheetByName('Productos')).map(function (p) {
    var id = String(p.id)
    return {
      id: id,
      nombre: p.nombre,
      categoria: p.categoria,
      marca: p.marca || '',
      descripcion: p.descripcion,
      precio: Number(p.precio) || 0,
      imagenes: (imagenesPorProducto[id] || []).map(function (img) {
        return img.url
      }),
      activo: esVerdadero(p.activo),
      destacado: esVerdadero(p.destacado),
      personalizable: esVerdadero(p.personalizable),
      nota_personalizacion: p.nota_personalizacion || '',
    }
  })

  var variantes = sheetToObjects(ss.getSheetByName('Variantes')).map(function (v) {
    return {
      producto_id: String(v.producto_id),
      sku: String(v.sku),
      color: String(v.color || ''),
      stock: Number(v.stock) || 0,
    }
  })

  var json = JSON.stringify({ productos: productos, variantes: variantes, actualizado: new Date().toISOString() })
  cache.put(CACHE_KEY, json, CACHE_SEGUNDOS)
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)
}

// Convierte una hoja (con fila de encabezados) en una lista de objetos.
function sheetToObjects(sheet) {
  if (!sheet) return []
  var valores = sheet.getDataRange().getValues()
  var encabezados = valores[0].map(function (h) {
    return String(h).trim().toLowerCase()
  })
  return valores
    .slice(1)
    .filter(function (fila) {
      return fila.join('') !== ''
    })
    .map(function (fila) {
      var obj = {}
      encabezados.forEach(function (h, i) {
        obj[h] = fila[i]
      })
      return obj
    })
}

function esVerdadero(valor) {
  var v = String(valor).trim().toUpperCase()
  return valor === true || valor === 1 || v === 'TRUE' || v === 'VERDADERO' || v === 'SI' || v === 'SÍ'
}
