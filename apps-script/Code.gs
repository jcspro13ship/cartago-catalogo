// Backend del catálogo web de Talabartería Cartago.
//
// Se pega en Extensiones > Apps Script del Google Sheet que sirve de base de
// datos. Hace tres cosas:
//   1. doGet: entrega el catálogo público (productos activos, colores, fotos,
//      marcas y tasa del dólar) como JSON para la página.
//   2. doPost: atiende el panel de administración (/admin). Toda acción exige
//      una sesión iniciada con usuario y contraseña, validada AQUÍ (la página
//      es pública, así que nunca se confía en ella para la seguridad).
//   3. Menú "Catálogo web" dentro del Sheet para armar la hoja, crear usuarios
//      y configurar Cloudinary sin tocar código.
//
// Paso a paso de instalación: docs/INSTRUCTIVO_TECNICO.md (en el repositorio del sitio)

var VERSION = 8

var ESTRUCTURA = {
  Productos: [
    'id', 'nombre', 'categoria', 'subcategoria', 'marca', 'descripcion', 'precio', 'precio_usd',
    'activo', 'destacado', 'personalizable', 'nota_personalizacion', 'garantia', 'actualizado', 'actualizado_por',
  ],
  Variantes: ['producto_id', 'sku', 'color', 'stock', 'talla', 'precio'],
  Imagenes: ['producto_id', 'orden', 'url'],
  Marcas: ['marca', 'logo_url'],
  Configuracion: ['clave', 'valor', 'descripcion'],
  Listas: ['categoria', 'subcategoria'],
  Historial: ['fecha', 'usuario', 'accion', 'detalle'],
  Cotizaciones: [
    'numero', 'fecha', 'estado', 'origen', 'referencia', 'cliente', 'documento', 'telefono', 'correo', 'ciudad',
    'direccion', 'entrega', 'pago', 'items', 'descuento', 'envio', 'total', 'notas', 'validez_dias', 'pedido',
    'creado_por', 'actualizado', 'actualizado_por',
  ],
  Pedidos: [
    'numero', 'fecha', 'estado', 'cotizacion', 'cliente', 'documento', 'telefono', 'correo', 'ciudad', 'direccion',
    'entrega', 'pago', 'items', 'descuento', 'envio', 'total', 'notas', 'guia', 'stock_descontado', 'creado_por',
    'actualizado', 'actualizado_por',
  ],
}

// Categoría → subcategorías finales (la tienda deduce el camino completo,
// p. ej. Accesorios › Caballo › Cabeza › Aperos). Solo se usa para llenar
// la pestaña Listas.
var CATEGORIAS = {
  Monturas: ['Sillas', 'Tereques', 'Galápagos', 'Kids', 'Maletas para silla'],
  Accesorios: [
    'Aperos', 'Jáquimas', 'Riendas', 'Frenos', 'Alfombras', 'Pellones', 'Alforjas',
    'Pecheras', 'Cinchas', 'Grupas', 'Arretrancos', 'Rejos y chipas',
    'Guardabarros', 'Arciones', 'Tarabas y estribos', 'Espuelas',
    'Sombreros', 'Gorras', 'Ponchos',
    'Marroquinería', 'Cinturones', 'Billeteras', 'Manos libres', 'Estuches', 'Canguros',
    'Bisutería', 'Cheval', 'Llaveros', 'Accesorios mini',
  ],
  'Cuidado del caballo': ['Aseo', 'Suplementos', 'Accesorios'],
  Caninos: ['Bozales', 'Collares', 'Pecheras', 'Traíllas', 'Brazaletes'],
}
var MARCAS = ['Cartago', 'San Fermín', 'Mesacé', 'Al Torno', 'Sybec', 'Natural V.', 'Cheval']

var CACHE_CATALOGO = 'catalogo_json_v4'
var CACHE_SEGUNDOS = 300 // el catálogo público se relee del Sheet como mucho cada 5 min
var SESION_SEGUNDOS = 6 * 60 * 60 // las sesiones del panel vencen a las 6 horas
var MAX_INTENTOS = 5 // intentos fallidos antes de bloquear el usuario 15 minutos

// ===================================================================
// Catálogo público
// ===================================================================

function doGet() {
  var json = leerCacheCatalogo_()
  if (!json) {
    json = JSON.stringify(leerCatalogo_())
    guardarCacheCatalogo_(json)
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)
}

// CacheService guarda como máximo 100 KB por clave y el catálogo completo
// pesa más, así que se guarda en pedazos. La clave principal dice cuántos
// pedazos hay; al borrarla (cuando alguien edita) el caché queda inválido.
var TAMANO_PEDAZO = 40000 // caracteres; con tildes cada uno puede ocupar 2 bytes

function leerCacheCatalogo_() {
  var cache = CacheService.getScriptCache()
  var n = Number(cache.get(CACHE_CATALOGO))
  if (!n) return null
  var claves = []
  for (var i = 0; i < n; i++) claves.push(CACHE_CATALOGO + '_' + i)
  var pedazos = cache.getAll(claves)
  var json = ''
  for (var j = 0; j < n; j++) {
    if (pedazos[claves[j]] == null) return null
    json += pedazos[claves[j]]
  }
  return json
}

function guardarCacheCatalogo_(json) {
  try {
    var cache = CacheService.getScriptCache()
    var pedazos = {}
    var n = Math.ceil(json.length / TAMANO_PEDAZO)
    for (var i = 0; i < n; i++) pedazos[CACHE_CATALOGO + '_' + i] = json.substr(i * TAMANO_PEDAZO, TAMANO_PEDAZO)
    cache.putAll(pedazos, CACHE_SEGUNDOS)
    cache.put(CACHE_CATALOGO, String(n), CACHE_SEGUNDOS)
  } catch (err) {
    // Sin caché el catálogo igual se sirve, solo que leyendo el Sheet cada vez.
  }
}

function leerCatalogo_() {
  var imagenesPorProducto = {}
  leerTabla_('Imagenes').filas.forEach(function (img) {
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

  var productos = leerTabla_('Productos').filas.map(function (p) {
    var id = String(p.id)
    return {
      id: id,
      nombre: String(p.nombre || ''),
      categoria: String(p.categoria || ''),
      subcategoria: String(p.subcategoria || ''),
      marca: String(p.marca || ''),
      descripcion: String(p.descripcion || ''),
      precio: Number(p.precio) || 0,
      precio_usd: Number(p.precio_usd) || 0,
      imagenes: (imagenesPorProducto[id] || []).map(function (img) {
        return img.url
      }),
      activo: esVerdadero_(p.activo),
      destacado: esVerdadero_(p.destacado),
      personalizable: esVerdadero_(p.personalizable),
      nota_personalizacion: String(p.nota_personalizacion || ''),
      garantia: String(p.garantia || ''),
    }
  })

  var variantes = leerTabla_('Variantes').filas.map(function (v) {
    return {
      producto_id: String(v.producto_id),
      sku: String(v.sku),
      color: String(v.color || ''),
      talla: String(v.talla || ''),
      precio: Number(v.precio) || 0,
      // Stock vacío = sin control de inventario: la tienda lo muestra disponible.
      stock: v.stock === '' || v.stock === null ? null : Number(v.stock) || 0,
    }
  })

  var marcas = leerTabla_('Marcas').filas.map(function (m) {
    return { marca: String(m.marca || ''), logo: String(m.logo_url || '') }
  })

  var config = {}
  leerTabla_('Configuracion').filas.forEach(function (fila) {
    if (fila.clave) config[String(fila.clave).trim()] = fila.valor
  })

  return {
    productos: productos,
    variantes: variantes,
    marcas: marcas,
    config: config,
    version: VERSION,
    actualizado: new Date().toISOString(),
  }
}

// ===================================================================
// Panel de administración
// ===================================================================

// El panel envía {accion, token, ...datos} como texto (text/plain) para que el
// navegador no haga la consulta previa de CORS que Apps Script no responde.
function doPost(e) {
  var respuesta
  try {
    var pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    respuesta = atender_(pedido)
  } catch (err) {
    respuesta = { ok: false, error: err && err.message ? err.message : String(err) }
  }
  return ContentService.createTextOutput(JSON.stringify(respuesta)).setMimeType(ContentService.MimeType.JSON)
}

function atender_(pedido) {
  var accion = pedido.accion

  if (accion === 'login') return iniciarSesion_(pedido.usuario, pedido.clave)
  // Pedido enviado desde el carrito de la tienda (sin sesión): queda como cotización nueva.
  if (accion === 'pedidoWeb') return conCandadoVentas_(function () {
    return registrarPedidoWeb_(pedido.pedido || {})
  })

  var usuario = usuarioDeSesion_(pedido.token)
  if (!usuario) return { ok: false, error: 'Tu sesión venció. Vuelve a iniciar sesión.', sesion: false }

  switch (accion) {
    case 'datos':
      return { ok: true, datos: leerCatalogo_(), usuarios: listarUsuarios_(), historial: leerHistorial_(40), usuario: usuario }
    case 'guardarProducto':
      return conCandado_(function () {
        return guardarProducto_(pedido.producto, pedido.variantes, pedido.imagenes, pedido.nuevo, usuario)
      })
    case 'eliminarProducto':
      return conCandado_(function () {
        return eliminarProducto_(pedido.id, usuario)
      })
    case 'ajustarStock':
      return conCandado_(function () {
        return ajustarStock_(pedido.sku, Number(pedido.cambio), usuario)
      })
    case 'guardarConfig':
      return conCandado_(function () {
        return guardarConfig_(pedido.config || {}, usuario)
      })
    case 'guardarMarcas':
      return conCandado_(function () {
        return guardarMarcas_(pedido.marcas || [], usuario)
      })
    case 'firmaFoto':
      return firmaCloudinary_()
    case 'ventas':
      return { ok: true, cotizaciones: leerVentas_('Cotizaciones'), pedidos: leerVentas_('Pedidos') }
    case 'guardarCotizacion':
      return conCandadoVentas_(function () {
        return guardarCotizacion_(pedido.cotizacion || {}, usuario)
      })
    case 'estadoCotizacion':
      return conCandadoVentas_(function () {
        return cambiarEstadoCotizacion_(pedido.numero, pedido.estado, usuario)
      })
    case 'convertirEnPedido':
      return conCandado_(function () {
        return convertirEnPedido_(pedido.numero, usuario)
      })
    case 'actualizarPedido':
      return conCandado_(function () {
        return actualizarPedido_(pedido.numero, pedido.cambios || {}, usuario)
      })
    case 'crearUsuario':
      return conCandado_(function () {
        crearUsuario_(pedido.nuevoUsuario, pedido.nombre, pedido.clave)
        registrar_(usuario, 'Creó usuario', pedido.nuevoUsuario)
        return { ok: true }
      })
    case 'cambiarClave':
      return conCandado_(function () {
        return cambiarClave_(usuario, pedido.claveActual, pedido.claveNueva)
      })
    case 'logout':
      CacheService.getScriptCache().remove('sesion_' + pedido.token)
      return { ok: true }
    default:
      return { ok: false, error: 'Acción desconocida: ' + accion }
  }
}

// Evita que dos personas escriban la hoja al mismo tiempo y deja el catálogo
// público actualizado al instante después de cada cambio.
function conCandado_(fn) {
  var candado = LockService.getScriptLock()
  candado.waitLock(20000)
  try {
    var r = fn()
    CacheService.getScriptCache().remove(CACHE_CATALOGO)
    return r
  } finally {
    candado.releaseLock()
  }
}

function guardarProducto_(p, variantes, imagenes, nuevo, usuario) {
  if (!p || !p.id) throw new Error('El producto no tiene id.')
  var id = String(p.id).trim()
  if (!/^[a-z0-9-]{1,40}$/i.test(id)) throw new Error('El id solo puede tener letras, números y guiones.')
  if (!String(p.nombre || '').trim()) throw new Error('El producto necesita un nombre.')

  var tabla = leerTabla_('Productos')
  var existente = tabla.filas.filter(function (f) {
    return String(f.id) === id
  })[0]
  if (nuevo && existente) throw new Error('Ya existe un producto con el id ' + id + '.')

  var registro = {
    id: id,
    nombre: String(p.nombre).trim(),
    categoria: p.categoria || '',
    subcategoria: p.subcategoria || '',
    marca: p.marca || '',
    descripcion: p.descripcion || '',
    precio: Number(p.precio) || 0,
    precio_usd: Number(p.precio_usd) || '',
    activo: p.activo ? 'SI' : 'NO',
    destacado: p.destacado ? 'SI' : 'NO',
    personalizable: p.personalizable ? 'SI' : 'NO',
    nota_personalizacion: p.nota_personalizacion || '',
    garantia: p.garantia || '',
    actualizado: new Date(),
    actualizado_por: usuario,
  }
  escribirFila_(tabla, existente ? existente._fila : null, registro)

  if (Array.isArray(variantes)) {
    var skus = {}
    var filasVariantes = variantes.map(function (v) {
      var sku = String(v.sku || id).trim()
      if (skus[sku]) throw new Error('El código ' + sku + ' está repetido en las opciones.')
      skus[sku] = true
      return {
        producto_id: id,
        sku: sku,
        color: String(v.color || '').trim(),
        stock: v.stock === '' || v.stock === null || v.stock === undefined ? '' : Math.max(0, Math.floor(Number(v.stock) || 0)),
        talla: String(v.talla || '').trim(),
        precio: Number(v.precio) > 0 ? Number(v.precio) : '',
      }
    })
    reemplazarHijos_('Variantes', id, filasVariantes)
  }
  if (Array.isArray(imagenes)) {
    reemplazarHijos_(
      'Imagenes',
      id,
      imagenes.map(function (url, i) {
        return { producto_id: id, orden: i + 1, url: String(url) }
      })
    )
  }
  registrar_(usuario, nuevo ? 'Creó producto' : 'Editó producto', id + ' · ' + registro.nombre)
  return { ok: true }
}

function eliminarProducto_(id, usuario) {
  id = String(id)
  var tabla = leerTabla_('Productos')
  var fila = tabla.filas.filter(function (f) {
    return String(f.id) === id
  })[0]
  if (!fila) throw new Error('No existe el producto ' + id + '.')
  tabla.hoja.deleteRow(fila._fila)
  reemplazarHijos_('Variantes', id, [])
  reemplazarHijos_('Imagenes', id, [])
  registrar_(usuario, 'Eliminó producto', id + ' · ' + fila.nombre)
  return { ok: true }
}

function ajustarStock_(sku, cambio, usuario) {
  if (!isFinite(cambio) || cambio === 0) throw new Error('Cambio de stock no válido.')
  var tabla = leerTabla_('Variantes')
  var fila = tabla.filas.filter(function (f) {
    return String(f.sku) === String(sku)
  })[0]
  if (!fila) throw new Error('No existe la variante ' + sku + '.')
  var nuevo = Math.max(0, (Number(fila.stock) || 0) + cambio)
  var col = tabla.encabezados.indexOf('stock') + 1
  tabla.hoja.getRange(fila._fila, col).setValue(nuevo)
  registrar_(usuario, cambio < 0 ? 'Vendió / restó stock' : 'Sumó stock', sku + ' · ' + (cambio > 0 ? '+' : '') + cambio + ' → ' + nuevo)
  return { ok: true, stock: nuevo }
}

function guardarConfig_(config, usuario) {
  var tabla = leerTabla_('Configuracion')
  Object.keys(config).forEach(function (clave) {
    var fila = tabla.filas.filter(function (f) {
      return String(f.clave) === clave
    })[0]
    escribirFila_(tabla, fila ? fila._fila : null, { clave: clave, valor: config[clave], descripcion: fila ? fila.descripcion : '' })
    tabla = leerTabla_('Configuracion')
  })
  registrar_(usuario, 'Cambió configuración', JSON.stringify(config))
  return { ok: true }
}

function guardarMarcas_(marcas, usuario) {
  var filas = marcas
    .filter(function (m) {
      return m && String(m.marca || '').trim()
    })
    .map(function (m) {
      return { marca: String(m.marca).trim(), logo_url: String(m.logo || m.logo_url || '').trim() }
    })
  reescribirHoja_('Marcas', filas)
  registrar_(usuario, 'Actualizó marcas', filas.length + ' marcas')
  return { ok: true }
}

// ===================================================================
// Usuarios y sesiones
// ===================================================================

// Las contraseñas nunca se guardan: solo una huella (hash con sal) en las
// propiedades privadas del script, que nadie ve desde la página ni desde el Sheet.
function leerUsuarios_() {
  var crudo = PropertiesService.getScriptProperties().getProperty('usuarios')
  return crudo ? JSON.parse(crudo) : {}
}

function guardarUsuarios_(usuarios) {
  PropertiesService.getScriptProperties().setProperty('usuarios', JSON.stringify(usuarios))
}

function huella_(sal, clave) {
  var valor = sal + ':' + clave
  for (var i = 0; i < 300; i++) {
    valor = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, valor, Utilities.Charset.UTF_8))
  }
  return valor
}

function normalizarUsuario_(u) {
  return String(u || '').trim().toLowerCase()
}

function crearUsuario_(usuario, nombre, clave) {
  usuario = normalizarUsuario_(usuario)
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) throw new Error('El usuario debe tener entre 3 y 30 letras, números, puntos o guiones, sin espacios.')
  if (String(clave || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
  var usuarios = leerUsuarios_()
  if (usuarios[usuario]) throw new Error('El usuario ' + usuario + ' ya existe.')
  var sal = Utilities.getUuid()
  usuarios[usuario] = { nombre: String(nombre || usuario).trim(), sal: sal, hash: huella_(sal, clave), creado: new Date().toISOString() }
  guardarUsuarios_(usuarios)
}

function listarUsuarios_() {
  var usuarios = leerUsuarios_()
  return Object.keys(usuarios).map(function (u) {
    return { usuario: u, nombre: usuarios[u].nombre }
  })
}

function iniciarSesion_(usuario, clave) {
  usuario = normalizarUsuario_(usuario)
  var cache = CacheService.getScriptCache()
  var claveIntentos = 'intentos_' + usuario
  var intentos = Number(cache.get(claveIntentos)) || 0
  if (intentos >= MAX_INTENTOS) {
    return { ok: false, error: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.' }
  }
  var datos = leerUsuarios_()[usuario]
  if (!datos || huella_(datos.sal, String(clave || '')) !== datos.hash) {
    cache.put(claveIntentos, String(intentos + 1), 15 * 60)
    return { ok: false, error: 'Usuario o contraseña incorrectos.' }
  }
  cache.remove(claveIntentos)
  var token = Utilities.getUuid() + Utilities.getUuid()
  cache.put('sesion_' + token, usuario, SESION_SEGUNDOS)
  registrar_(usuario, 'Inició sesión', '')
  return { ok: true, token: token, usuario: usuario, nombre: datos.nombre }
}

function usuarioDeSesion_(token) {
  if (!token) return null
  var cache = CacheService.getScriptCache()
  var usuario = cache.get('sesion_' + token)
  if (usuario) cache.put('sesion_' + token, usuario, SESION_SEGUNDOS) // renueva al usarla
  return usuario
}

function cambiarClave_(usuario, actual, nueva) {
  var usuarios = leerUsuarios_()
  var datos = usuarios[usuario]
  if (!datos || huella_(datos.sal, String(actual || '')) !== datos.hash) throw new Error('La contraseña actual no es correcta.')
  if (String(nueva || '').length < 8) throw new Error('La contraseña nueva debe tener al menos 8 caracteres.')
  datos.sal = Utilities.getUuid()
  datos.hash = huella_(datos.sal, nueva)
  guardarUsuarios_(usuarios)
  registrar_(usuario, 'Cambió su contraseña', '')
  return { ok: true }
}

// ===================================================================
// Fotos (Cloudinary con firma)
// ===================================================================

// El panel sube la foto directo a Cloudinary con una firma que se genera aquí.
// La clave secreta de Cloudinary vive solo en las propiedades del script.
function firmaCloudinary_() {
  var props = PropertiesService.getScriptProperties()
  var nube = props.getProperty('CLOUDINARY_CLOUD')
  var llave = props.getProperty('CLOUDINARY_KEY')
  var secreto = props.getProperty('CLOUDINARY_SECRET')
  if (!nube || !llave || !secreto) {
    return { ok: false, error: 'Cloudinary todavía no está configurado (menú Catálogo web > Configurar Cloudinary).' }
  }
  var timestamp = Math.floor(Date.now() / 1000)
  var carpeta = 'cartago/productos'
  var aFirmar = 'folder=' + carpeta + '&timestamp=' + timestamp + secreto
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, aFirmar, Utilities.Charset.UTF_8)
  var firma = digest
    .map(function (b) {
      return ('0' + (b & 0xff).toString(16)).slice(-2)
    })
    .join('')
  return { ok: true, cloudName: nube, apiKey: llave, timestamp: timestamp, folder: carpeta, signature: firma }
}

// ===================================================================
// Historial
// ===================================================================

function registrar_(usuario, accion, detalle) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Historial')
  if (!hoja) return
  hoja.appendRow([new Date(), usuario, accion, detalle])
}

function leerHistorial_(cuantos) {
  var filas = leerTabla_('Historial').filas.slice(-cuantos).reverse()
  return filas.map(function (f) {
    return {
      fecha: f.fecha instanceof Date ? f.fecha.toISOString() : String(f.fecha),
      usuario: String(f.usuario),
      accion: String(f.accion),
      detalle: String(f.detalle || ''),
    }
  })
}

// ===================================================================
// Utilidades de hoja
// ===================================================================

function leerTabla_(nombre) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre)
  if (!hoja) return { hoja: null, encabezados: [], filas: [] }
  var valores = hoja.getDataRange().getValues()
  var encabezados = (valores[0] || []).map(function (h) {
    return String(h).trim().toLowerCase()
  })
  var filas = []
  for (var i = 1; i < valores.length; i++) {
    if (valores[i].join('') === '') continue
    var obj = { _fila: i + 1 }
    encabezados.forEach(function (h, j) {
      obj[h] = valores[i][j]
    })
    filas.push(obj)
  }
  return { hoja: hoja, encabezados: encabezados, filas: filas }
}

function escribirFila_(tabla, numeroFila, registro) {
  var fila = tabla.encabezados.map(function (h) {
    return registro.hasOwnProperty(h) ? registro[h] : ''
  })
  var destino = numeroFila || tabla.hoja.getLastRow() + 1
  formatearCodigos_(tabla, destino - 1)
  tabla.hoja.getRange(destino, 1, 1, fila.length).setValues([fila])
}

// Reemplaza las filas de un producto en Variantes o Imagenes por las nuevas.
function reemplazarHijos_(nombre, productoId, nuevas) {
  var tabla = leerTabla_(nombre)
  var quedan = tabla.filas.filter(function (f) {
    return String(f.producto_id) !== String(productoId)
  })
  reescribirHoja_(nombre, quedan.concat(nuevas))
}

function reescribirHoja_(nombre, filas) {
  var tabla = leerTabla_(nombre)
  var hoja = tabla.hoja
  var ancho = tabla.encabezados.length
  var ultima = hoja.getLastRow()
  if (ultima > 1) hoja.getRange(2, 1, ultima - 1, ancho).clearContent()
  if (filas.length === 0) return
  var valores = filas.map(function (r) {
    return tabla.encabezados.map(function (h) {
      return r.hasOwnProperty(h) ? r[h] : ''
    })
  })
  formatearCodigos_(tabla, valores.length)
  hoja.getRange(2, 1, valores.length, ancho).setValues(valores)
}

// Los códigos son texto: sin esto, Sheets vuelve "085" el número 85 y el
// producto pierde sus colores y fotos.
function formatearCodigos_(tabla, filas) {
  ;['id', 'producto_id', 'sku'].forEach(function (columna) {
    var i = tabla.encabezados.indexOf(columna)
    if (i !== -1) tabla.hoja.getRange(2, i + 1, filas, 1).setNumberFormat('@')
  })
}

function esVerdadero_(valor) {
  var v = String(valor).trim().toUpperCase()
  return valor === true || valor === 1 || v === 'TRUE' || v === 'VERDADERO' || v === 'SI' || v === 'SÍ'
}

// ===================================================================
// Menú dentro del Sheet
// ===================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Catálogo web')
    .addItem('1. Configurar la hoja', 'configurarHoja')
    .addItem('2. Crear usuario del panel', 'menuCrearUsuario')
    .addItem('3. Configurar Cloudinary (fotos)', 'menuConfigurarCloudinary')
    .addItem('4. Restablecer contraseña de un usuario', 'menuRestablecerClave')
    .addToUi()
}

// Crea las pestañas y encabezados que falten, sin borrar datos existentes.
function configurarHoja() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  Object.keys(ESTRUCTURA).forEach(function (nombre) {
    var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre)
    var columnas = ESTRUCTURA[nombre]
    var actuales = hoja.getLastColumn() > 0 ? hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0] : []
    var normalizados = actuales.map(function (h) {
      return String(h).trim().toLowerCase()
    })
    columnas.forEach(function (col) {
      if (normalizados.indexOf(col) === -1) {
        hoja.getRange(1, normalizados.length + 1).setValue(col)
        normalizados.push(col)
      }
    })
    var encabezado = hoja.getRange(1, 1, 1, normalizados.length)
    encabezado.setFontWeight('bold').setFontColor('#ffffff').setBackground('#771541')
    hoja.setFrozenRows(1)
  })

  var listas = ss.getSheetByName('Listas')
  if (listas.getLastRow() < 2) {
    var filas = []
    Object.keys(CATEGORIAS).forEach(function (cat) {
      CATEGORIAS[cat].forEach(function (sub) {
        filas.push([cat, sub])
      })
    })
    listas.getRange(2, 1, filas.length, 2).setValues(filas)
  }
  var marcas = ss.getSheetByName('Marcas')
  if (marcas.getLastRow() < 2) {
    marcas.getRange(2, 1, MARCAS.length, 1).setValues(
      MARCAS.map(function (m) {
        return [m]
      })
    )
  }
  var config = ss.getSheetByName('Configuracion')
  if (config.getLastRow() < 2) {
    config.getRange(2, 1, 1, 3).setValues([['tasa_usd', 3000, 'Pesos por dólar para mostrar precios en USD. Se actualiza cada 8 días.']])
  }

  // Listas desplegables en Productos para quien edite directo en la hoja.
  var productos = ss.getSheetByName('Productos')
  var enc = productos.getRange(1, 1, 1, productos.getLastColumn()).getValues()[0].map(function (h) {
    return String(h).trim().toLowerCase()
  })
  var siNo = SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO'], true).build()
  ;['activo', 'destacado', 'personalizable'].forEach(function (col) {
    productos.getRange(2, enc.indexOf(col) + 1, 999, 1).setDataValidation(siNo)
  })

  var hojaInicial = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1')
  if (hojaInicial && hojaInicial.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(hojaInicial)

  CacheService.getScriptCache().remove(CACHE_CATALOGO)
  SpreadsheetApp.getUi().alert('Listo: la hoja tiene todas las pestañas y columnas del catálogo web.')
}

function menuCrearUsuario() {
  var ui = SpreadsheetApp.getUi()
  var u = ui.prompt('Nuevo usuario del panel', 'Usuario (sin espacios, ej. marcela):', ui.ButtonSet.OK_CANCEL)
  if (u.getSelectedButton() !== ui.Button.OK) return
  var n = ui.prompt('Nuevo usuario del panel', 'Nombre para mostrar (ej. Marcela Rivera):', ui.ButtonSet.OK_CANCEL)
  if (n.getSelectedButton() !== ui.Button.OK) return
  var c = ui.prompt('Nuevo usuario del panel', 'Contraseña (mínimo 8 caracteres):', ui.ButtonSet.OK_CANCEL)
  if (c.getSelectedButton() !== ui.Button.OK) return
  try {
    crearUsuario_(u.getResponseText(), n.getResponseText(), c.getResponseText())
    registrar_('(hoja)', 'Creó usuario', normalizarUsuario_(u.getResponseText()))
    ui.alert('Usuario creado: ' + normalizarUsuario_(u.getResponseText()))
  } catch (err) {
    ui.alert(err.message)
  }
}

// Para cuando a alguien se le olvida la contraseña. Solo lo puede usar quien
// tenga acceso de edición al Sheet, que es la misma gente que administra.
function restablecerClave_(usuario, nueva) {
  usuario = normalizarUsuario_(usuario)
  var usuarios = leerUsuarios_()
  if (!usuarios[usuario]) throw new Error('No existe el usuario "' + usuario + '". Usuarios actuales: ' + Object.keys(usuarios).join(', '))
  if (String(nueva || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
  var sal = Utilities.getUuid()
  usuarios[usuario].sal = sal
  usuarios[usuario].hash = huella_(sal, nueva)
  guardarUsuarios_(usuarios)
  CacheService.getScriptCache().remove('intentos_' + usuario) // quita el bloqueo por intentos fallidos
}

function menuRestablecerClave() {
  var ui = SpreadsheetApp.getUi()
  var lista = Object.keys(leerUsuarios_()).join(', ') || '(no hay usuarios)'
  var u = ui.prompt('Restablecer contraseña', 'Usuarios del panel: ' + lista + '\n\nEscribe el usuario:', ui.ButtonSet.OK_CANCEL)
  if (u.getSelectedButton() !== ui.Button.OK) return
  var c = ui.prompt('Restablecer contraseña', 'Contraseña nueva para "' + normalizarUsuario_(u.getResponseText()) + '" (mínimo 8 caracteres):', ui.ButtonSet.OK_CANCEL)
  if (c.getSelectedButton() !== ui.Button.OK) return
  try {
    restablecerClave_(u.getResponseText(), c.getResponseText())
    registrar_('(hoja)', 'Restableció contraseña', normalizarUsuario_(u.getResponseText()))
    ui.alert('Contraseña actualizada. Ya puedes entrar al panel con el usuario ' + normalizarUsuario_(u.getResponseText()) + '.')
  } catch (err) {
    ui.alert(err.message)
  }
}

function menuConfigurarCloudinary() {
  var ui = SpreadsheetApp.getUi()
  var props = PropertiesService.getScriptProperties()
  var pasos = [
    ['CLOUDINARY_CLOUD', 'Cloud name (aparece en el panel de Cloudinary):'],
    ['CLOUDINARY_KEY', 'API Key:'],
    ['CLOUDINARY_SECRET', 'API Secret:'],
  ]
  for (var i = 0; i < pasos.length; i++) {
    var r = ui.prompt('Cloudinary', pasos[i][1], ui.ButtonSet.OK_CANCEL)
    if (r.getSelectedButton() !== ui.Button.OK) return
    props.setProperty(pasos[i][0], r.getResponseText().trim())
  }
  ui.alert('Cloudinary configurado. Ya se pueden subir fotos desde el panel.')
}

// ===================================================================
// Cotizaciones y pedidos
// ===================================================================
// Cada cotización o pedido es una fila; los productos van en la columna
// "items" como JSON: [{sku, producto_id, nombre, color, talla, personalizacion,
// cantidad, precio, imagen}]. Un ítem sin sku es una pieza libre (p. ej. un
// trabajo a la medida que no está en el catálogo).

var ESTADOS_COTIZACION = ['Nueva', 'Borrador', 'Enviada', 'Convertida', 'Anulada']
var ESTADOS_PEDIDO = ['Por pagar', 'Pagado', 'Despachado', 'Entregado', 'Cancelado']
var MAX_PEDIDOS_WEB_HORA = 60

// Igual que conCandado_, pero sin borrar el caché del catálogo público.
function conCandadoVentas_(fn) {
  var candado = LockService.getScriptLock()
  candado.waitLock(20000)
  try {
    return fn()
  } finally {
    candado.releaseLock()
  }
}

// Crea la pestaña con sus encabezados la primera vez que se usa.
function asegurarHoja_(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  if (ss.getSheetByName(nombre)) return
  var hoja = ss.insertSheet(nombre)
  var columnas = ESTRUCTURA[nombre]
  hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#771541')
  hoja.setFrozenRows(1)
  hoja.getRange(2, 1, hoja.getMaxRows() - 1, 1).setNumberFormat('@')
}

// COT-2026-0001, PED-2026-0001… El siguiente número sale de los que ya están
// en la hoja (el mayor del año + 1); si se borran filas de prueba, la
// numeración se ajusta sola. Siempre se llama dentro del candado.
function siguienteNumero_(prefijo) {
  var anio = new Date().getFullYear()
  var nombre = prefijo === 'PED' ? 'Pedidos' : 'Cotizaciones'
  var inicio = prefijo + '-' + anio + '-'
  var mayor = 0
  leerTabla_(nombre).filas.forEach(function (f) {
    var numero = String(f.numero || '')
    if (numero.indexOf(inicio) === 0) mayor = Math.max(mayor, Number(numero.slice(inicio.length)) || 0)
  })
  return inicio + ('000' + (mayor + 1)).slice(-4)
}

function texto_(valor, maximo) {
  return String(valor == null ? '' : valor).trim().slice(0, maximo || 200)
}

function numero_(valor) {
  var n = Number(valor)
  return isFinite(n) && n > 0 ? Math.round(n) : 0
}

function limpiarItems_(items) {
  if (!Array.isArray(items)) return []
  return items.slice(0, 80).map(function (it) {
    return {
      sku: texto_(it.sku, 60),
      producto_id: texto_(it.producto_id, 60),
      nombre: texto_(it.nombre, 160),
      color: texto_(it.color, 60),
      talla: texto_(it.talla, 60),
      personalizacion: texto_(it.personalizacion, 300),
      cantidad: Math.max(1, Math.min(9999, Math.floor(Number(it.cantidad) || 1))),
      precio: numero_(it.precio),
      imagen: texto_(it.imagen, 400),
    }
  }).filter(function (it) {
    return it.nombre
  })
}

function totalDe_(items, descuento, envio) {
  var suma = items.reduce(function (acc, it) {
    return acc + it.precio * it.cantidad
  }, 0)
  return Math.max(0, suma - numero_(descuento) + numero_(envio))
}

function leerVentas_(nombre) {
  asegurarHoja_(nombre)
  return leerTabla_(nombre)
    .filas.map(function (f) {
      var r = {}
      ESTRUCTURA[nombre].forEach(function (c) {
        var v = f[c]
        r[c] = v instanceof Date ? v.toISOString() : v === undefined ? '' : v
      })
      try {
        r.items = JSON.parse(f.items || '[]')
      } catch (err) {
        r.items = []
      }
      r.numero = String(r.numero)
      return r
    })
    .reverse() // lo más reciente primero
}

function buscarFila_(nombre, numero) {
  var tabla = leerTabla_(nombre)
  var fila = tabla.filas.filter(function (f) {
    return String(f.numero) === String(numero)
  })[0]
  return { tabla: tabla, fila: fila }
}

function datosCliente_(c) {
  return {
    cliente: texto_(c.cliente, 120),
    documento: texto_(c.documento, 40),
    telefono: texto_(c.telefono, 40),
    correo: texto_(c.correo, 120),
    ciudad: texto_(c.ciudad, 80),
    direccion: texto_(c.direccion, 200),
    entrega: texto_(c.entrega, 60),
    pago: texto_(c.pago, 80),
  }
}

function guardarCotizacion_(c, usuario) {
  asegurarHoja_('Cotizaciones')
  var items = limpiarItems_(c.items)
  if (!texto_(c.cliente)) throw new Error('Escribe el nombre del cliente.')
  if (!items.length) throw new Error('Agrega al menos un producto.')
  var existente = c.numero ? buscarFila_('Cotizaciones', c.numero) : null
  if (existente && existente.fila && (existente.fila.estado === 'Convertida' || existente.fila.estado === 'Anulada')) {
    throw new Error('Esta cotización ya está ' + String(existente.fila.estado).toLowerCase() + ' y no se puede editar.')
  }
  var base = existente && existente.fila ? existente.fila : null
  var registro = datosCliente_(c)
  registro.numero = base ? String(base.numero) : siguienteNumero_('COT')
  registro.fecha = base ? base.fecha : new Date()
  registro.estado = ESTADOS_COTIZACION.indexOf(c.estado) !== -1 ? c.estado : base ? base.estado : 'Borrador'
  registro.origen = base ? base.origen : 'panel'
  registro.referencia = base ? base.referencia : ''
  registro.items = JSON.stringify(items)
  registro.descuento = numero_(c.descuento)
  registro.envio = numero_(c.envio)
  registro.total = totalDe_(items, c.descuento, c.envio)
  registro.notas = texto_(c.notas, 1000)
  registro.validez_dias = numero_(c.validez_dias) || ''
  registro.pedido = base ? base.pedido : ''
  registro.creado_por = base ? base.creado_por : usuario
  registro.actualizado = new Date()
  registro.actualizado_por = usuario
  var tabla = leerTabla_('Cotizaciones')
  escribirFila_(tabla, base ? base._fila : null, registro)
  registrar_(usuario, base ? 'Editó cotización' : 'Creó cotización', registro.numero + ' · ' + registro.cliente)
  return { ok: true, numero: registro.numero }
}

function cambiarEstadoCotizacion_(numero, estado, usuario) {
  if (['Nueva', 'Borrador', 'Enviada', 'Anulada'].indexOf(estado) === -1) throw new Error('Estado no válido.')
  var r = buscarFila_('Cotizaciones', numero)
  if (!r.fila) throw new Error('No existe la cotización ' + numero + '.')
  if (r.fila.estado === 'Convertida') throw new Error('La cotización ya es un pedido.')
  var col = r.tabla.encabezados.indexOf('estado') + 1
  r.tabla.hoja.getRange(r.fila._fila, col).setValue(estado)
  registrar_(usuario, 'Cotización ' + String(estado).toLowerCase(), numero)
  return { ok: true }
}

// Pasa la cotización a pedido y descuenta las unidades de los colores o
// tamaños que llevan control de inventario (stock con número).
function convertirEnPedido_(numero, usuario) {
  asegurarHoja_('Pedidos')
  var r = buscarFila_('Cotizaciones', numero)
  if (!r.fila) throw new Error('No existe la cotización ' + numero + '.')
  if (r.fila.estado === 'Convertida') throw new Error('Esta cotización ya se convirtió en el pedido ' + r.fila.pedido + '.')
  if (r.fila.estado === 'Anulada') throw new Error('La cotización está anulada.')
  var items = JSON.parse(r.fila.items || '[]')

  var variantes = leerTabla_('Variantes')
  var colStock = variantes.encabezados.indexOf('stock') + 1
  var descontado = {}
  items.forEach(function (it) {
    if (!it.sku) return
    var v = variantes.filas.filter(function (f) {
      return String(f.sku) === String(it.sku)
    })[0]
    if (!v || v.stock === '' || v.stock === null) return
    var actual = Number(v.stock) || 0
    var resta = Math.min(actual, it.cantidad)
    v.stock = actual - resta
    variantes.hoja.getRange(v._fila, colStock).setValue(v.stock)
    if (resta > 0) descontado[it.sku] = (descontado[it.sku] || 0) + resta
  })

  var pedido = {}
  ESTRUCTURA.Pedidos.forEach(function (c) {
    if (r.fila.hasOwnProperty(c)) pedido[c] = r.fila[c]
  })
  pedido.numero = siguienteNumero_('PED')
  pedido.fecha = new Date()
  pedido.estado = 'Por pagar'
  pedido.cotizacion = String(numero)
  pedido.guia = ''
  pedido.stock_descontado = JSON.stringify(descontado)
  pedido.creado_por = usuario
  pedido.actualizado = new Date()
  pedido.actualizado_por = usuario
  escribirFila_(leerTabla_('Pedidos'), null, pedido)

  var cols = r.tabla.encabezados
  r.tabla.hoja.getRange(r.fila._fila, cols.indexOf('estado') + 1).setValue('Convertida')
  r.tabla.hoja.getRange(r.fila._fila, cols.indexOf('pedido') + 1).setValue(pedido.numero)
  registrar_(usuario, 'Convirtió en pedido', numero + ' → ' + pedido.numero)
  return { ok: true, numero: pedido.numero }
}

// Estado, guía de envío, notas y forma de pago del pedido. Al cancelarlo se
// devuelven al inventario las unidades que se habían descontado.
function actualizarPedido_(numero, cambios, usuario) {
  var r = buscarFila_('Pedidos', numero)
  if (!r.fila) throw new Error('No existe el pedido ' + numero + '.')
  var fila = r.fila
  if (fila.estado === 'Cancelado') throw new Error('El pedido está cancelado y no se puede modificar.')
  var nuevoEstado = cambios.estado && ESTADOS_PEDIDO.indexOf(cambios.estado) !== -1 ? cambios.estado : fila.estado

  if (nuevoEstado === 'Cancelado') {
    var descontado = {}
    try {
      descontado = JSON.parse(fila.stock_descontado || '{}')
    } catch (err) {
      descontado = {}
    }
    var variantes = leerTabla_('Variantes')
    var colStock = variantes.encabezados.indexOf('stock') + 1
    Object.keys(descontado).forEach(function (sku) {
      var v = variantes.filas.filter(function (f) {
        return String(f.sku) === sku
      })[0]
      if (v && v.stock !== '' && v.stock !== null) variantes.hoja.getRange(v._fila, colStock).setValue((Number(v.stock) || 0) + descontado[sku])
    })
    fila.stock_descontado = '{}'
  }

  fila.estado = nuevoEstado
  if (cambios.hasOwnProperty('guia')) fila.guia = texto_(cambios.guia, 120)
  if (cambios.hasOwnProperty('notas')) fila.notas = texto_(cambios.notas, 1000)
  if (cambios.hasOwnProperty('pago')) fila.pago = texto_(cambios.pago, 80)
  fila.actualizado = new Date()
  fila.actualizado_por = usuario
  escribirFila_(r.tabla, fila._fila, fila)
  registrar_(usuario, 'Actualizó pedido', numero + ' · ' + nuevoEstado)
  return { ok: true }
}

// Pedido que el cliente armó en la tienda y envió por WhatsApp. Los precios y
// nombres se toman del catálogo, no de lo que mande el navegador. Hay un tope
// por hora para que nadie llene la hoja con envíos falsos.
function registrarPedidoWeb_(p) {
  asegurarHoja_('Cotizaciones')
  var cache = CacheService.getScriptCache()
  var referencia = texto_(p.referencia, 30)
  if (!referencia) throw new Error('Falta el código del pedido.')
  if (cache.get('pedido_web_' + referencia)) return { ok: true, repetido: true }
  var claveHora = 'pedidos_web_' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMddHH')
  var enLaHora = Number(cache.get(claveHora) || 0)
  if (enLaHora >= MAX_PEDIDOS_WEB_HORA) throw new Error('Demasiados pedidos en poco tiempo.')

  var catalogo = leerCatalogo_()
  var porId = {}
  catalogo.productos.forEach(function (prod) {
    porId[prod.id] = prod
  })
  var porSku = {}
  catalogo.variantes.forEach(function (v) {
    porSku[v.sku] = v
  })
  var items = (Array.isArray(p.items) ? p.items : []).slice(0, 60).map(function (it) {
    var v = porSku[String(it.sku)]
    var prod = v && porId[v.producto_id]
    if (!prod) return null
    return {
      sku: v.sku,
      producto_id: prod.id,
      nombre: prod.nombre,
      color: v.color,
      talla: v.talla,
      personalizacion: texto_(it.personalizacion, 300),
      cantidad: Math.max(1, Math.min(999, Math.floor(Number(it.cantidad) || 1))),
      precio: v.precio > 0 ? v.precio : prod.precio,
      imagen: prod.imagenes[0] || '',
    }
  }).filter(Boolean)
  if (!items.length) throw new Error('El pedido no tiene productos válidos.')

  var registro = datosCliente_(p)
  if (!registro.cliente) throw new Error('Falta el nombre del cliente.')
  registro.numero = siguienteNumero_('COT')
  registro.fecha = new Date()
  registro.estado = 'Nueva'
  registro.origen = 'web'
  registro.referencia = referencia
  registro.items = JSON.stringify(items)
  registro.descuento = 0
  registro.envio = 0
  registro.total = totalDe_(items, 0, 0)
  registro.notas = texto_(p.notas, 1000)
  registro.validez_dias = ''
  registro.pedido = ''
  registro.creado_por = 'tienda'
  registro.actualizado = new Date()
  registro.actualizado_por = 'tienda'
  escribirFila_(leerTabla_('Cotizaciones'), null, registro)
  cache.put('pedido_web_' + referencia, '1', 6 * 60 * 60)
  cache.put(claveHora, String(enLaHora + 1), 60 * 60)
  registrar_('tienda', 'Pedido web', registro.numero + ' · ' + referencia + ' · ' + registro.cliente)
  return { ok: true, numero: registro.numero }
}
