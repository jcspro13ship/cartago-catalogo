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

var VERSION = 2

var ESTRUCTURA = {
  Productos: [
    'id', 'nombre', 'categoria', 'subcategoria', 'marca', 'descripcion', 'precio', 'precio_usd',
    'activo', 'destacado', 'personalizable', 'nota_personalizacion', 'garantia', 'actualizado', 'actualizado_por',
  ],
  Variantes: ['producto_id', 'sku', 'color', 'stock'],
  Imagenes: ['producto_id', 'orden', 'url'],
  Marcas: ['marca', 'logo_url'],
  Configuracion: ['clave', 'valor', 'descripcion'],
  Listas: ['categoria', 'subcategoria'],
  Historial: ['fecha', 'usuario', 'accion', 'detalle'],
}

var CATEGORIAS = {
  Monturas: ['Sillas', 'Tereques', 'Galápagos', 'Kids'],
  Equino: ['Cabeza', 'Alfombras', 'Alforjas', 'Correaje', 'Tarabas'],
  Jinete: ['Sombreros', 'Marroquinería', 'Bisutería'],
  'Cuidado del caballo': ['Aseo', 'Suplementos', 'Accesorios'],
  Caninos: ['Pecheras', 'Collares', 'Traíllas', 'Bozales'],
}
var MARCAS = ['Cartago', 'San Fermín', 'Mesacé', 'Al Torno', 'Sybec', 'Natural V.', 'Cheval']

var CACHE_CATALOGO = 'catalogo_json_v2'
var CACHE_SEGUNDOS = 300 // el catálogo público se relee del Sheet como mucho cada 5 min
var SESION_SEGUNDOS = 6 * 60 * 60 // las sesiones del panel vencen a las 6 horas
var MAX_INTENTOS = 5 // intentos fallidos antes de bloquear el usuario 15 minutos

// ===================================================================
// Catálogo público
// ===================================================================

function doGet() {
  var cache = CacheService.getScriptCache()
  var json = cache.get(CACHE_CATALOGO)
  if (!json) {
    json = JSON.stringify(leerCatalogo_())
    cache.put(CACHE_CATALOGO, json, CACHE_SEGUNDOS)
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)
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
      stock: Number(v.stock) || 0,
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
  if (!/^[a-z0-9-]{1,20}$/i.test(id)) throw new Error('El id solo puede tener letras, números y guiones.')
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
      if (skus[sku]) throw new Error('El código ' + sku + ' está repetido en los colores.')
      skus[sku] = true
      return { producto_id: id, sku: sku, color: String(v.color || '').trim(), stock: Math.max(0, Math.floor(Number(v.stock) || 0)) }
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
  if (numeroFila) tabla.hoja.getRange(numeroFila, 1, 1, fila.length).setValues([fila])
  else tabla.hoja.appendRow(fila)
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
  hoja.getRange(2, 1, valores.length, ancho).setValues(valores)
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
