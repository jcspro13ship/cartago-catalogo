# Catálogo web de Talabartería Cartago — estado técnico

Proyecto de **JCS Consultoría Developments** (marca de JCS Consultoría Empresarial; "JCS Emprende" ya no se usa).
Cliente: **Cartago Talabartería SAS** (NIT 900905766-2), Cali. Contactos: David Morales y Marcela Rivera.
Este archivo es el punto de partida para cualquier trabajo nuevo (incluido el ERP de Cartago): describe cómo
está montado el catálogo, dónde viven los datos y las reglas aprendidas. Responder siempre en español.

## Enlaces

- Sitio: https://jcspro13ship.github.io/cartago-catalogo/ — panel: `/admin` (enlace "Acceso administrativo" en el pie)
- Repo: https://github.com/jcspro13ship/cartago-catalogo (rama `main`; GitHub Pages sirve la rama `gh-pages`)
- Base de datos: Google Sheet "Cartago · Base de datos del catálogo", ID `1YnE4xW93bd8_FPA6c15_c_7OjW_LslmMBs7hXXWhofQ`
- Apps Script (web app publicada sobre ese Sheet): la URL `/exec` está en `src/config.js` (`SHEETS_API_URL`)
- Fotos subidas desde el panel: Cloudinary de Cartago (cloud `ghb9k9u5`, carpeta `cartago/productos`)

## Stack

- React 18 + Vite 5 + react-router 6 (BrowserRouter con `basename = BASE_URL`). Sin backend propio.
- Google Sheets como base de datos; `apps-script/Code.gs` es la API:
  - `doGet` → catálogo público en JSON (caché de 5 min en CacheService, guardada en pedazos de 40.000 caracteres).
  - `doPost` → acciones del panel con token de sesión (texto plano para evitar la consulta CORS previa).
- Publicar el sitio: `npm run deploy` (compila con `predeploy` y sube `dist/` a `gh-pages`).
- Node: `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"`.
- Desarrollo sin Sheet: `VITE_MOCK=1 npm run dev` → datos de `src/data/` y panel de prueba (`src/admin/mock.js`, usuario `demo` / `demo1234`).

## Pestañas del Sheet (fuente de verdad: `ESTRUCTURA` en Code.gs)

| Pestaña | Columnas clave | Notas |
|---|---|---|
| Productos | id, nombre, categoria, subcategoria, marca, descripcion, precio, precio_usd, activo, destacado, personalizable, nota_personalizacion, garantia | ~259 productos. `id` = código del Excel de Cartago |
| Variantes | producto_id, sku, color, stock, talla, precio | stock vacío = sin control (siempre disponible). `precio` vacío = usa el del producto |
| Imagenes | producto_id, orden, url | url relativa `fotos/<id>/<n>.webp` (en el repo) o URL de Cloudinary |
| Marcas | marca, logo_url | Cartago, San Fermín, Mesacé, Al Torno, Sybeq, Natural V., Cheval |
| Configuracion | clave, valor | tasa_usd, avisos (cinta), avisos_marcas, video_*, preguntas_frecuentes (JSON), empresa_nit, empresa_correo, cotizacion_validez, cotizacion_condiciones |
| Cotizaciones | numero, fecha, estado, origen (panel/web), referencia, cliente…, items (JSON), descuento, envio, total, pedido | Estados: Nueva, Borrador, Enviada, Convertida, Anulada |
| Pedidos | numero, fecha, estado, cotizacion, cliente…, items (JSON), guia, stock_descontado (JSON) | Estados: Por pagar, Pagado, Despachado, Entregado, Cancelado |
| Historial | fecha, usuario, accion, detalle | Bitácora de todo lo que se hace desde el panel |
| Listas | categoria, subcategoria | Solo referencia |

`items` = `[{sku, producto_id, nombre, color, talla, personalizacion, cantidad, precio, imagen}]` (sin sku = pieza libre).

## Reglas aprendidas (importantes)

- **Los códigos son texto.** Las columnas `id`, `producto_id` y `sku` tienen formato texto. Si se escribe al Sheet
  por API, usar apóstrofo (`'085`); si no, "085" se vuelve 85 y el producto pierde variantes y fotos.
  Code.gs lo protege con `formatearCodigos_`.
- **Cada cambio en Code.gs** obliga a que Juan Carlos lo pegue en el editor del Sheet y publique **una versión nueva**
  (Implementar → Administrar implementaciones → editar → Nueva versión). Subir `VERSION` y confirmar leyendo
  `version` en la respuesta de `doGet` (puede tardar hasta 5 min por la caché).
- **Nunca** manejar ni escribir contraseñas de usuarios. Los usuarios del panel viven en las propiedades del script
  (hash con sal). Para olvidos: menú del Sheet "Catálogo web → 4. Restablecer contraseña".
- Antes de modificar datos en el Sheet, **leer el estado actual**: Cartago (usuaria "anyelli") edita a diario desde el panel.
- La numeración COT-AAAA-0001 / PED-AAAA-0001 sale del mayor número del año que haya en la hoja.
- Al convertir una cotización en pedido se descuenta stock (solo variantes con número); al cancelar el pedido se devuelve.
- El carrito de la tienda registra cada pedido enviado por WhatsApp como cotización "Nueva" (acción pública
  `pedidoWeb`; precios tomados del catálogo; máximo 60 por hora).

## Categorías

Árbol en `src/config.js` (`CATEGORIAS`). En el Sheet cada producto guarda solo `categoria` (primer nivel) y
`subcategoria` (hoja u nodo marcado `general`); el camino completo lo deduce `src/utils/categorias.js`.
Monturas · Accesorios (Caballo: Cabeza/Lomo/Correaje/Colgantes; Jinete: Sombreros/Marroquinería/Bisutería) ·
Cuidado del caballo (Aseo/Suplementos/Accesorios) · Caninos.

## Funciones del sitio y del panel

- Tienda: catálogo con filtros y marcas, ficha con colores/tamaños (precio por tamaño), carrito → WhatsApp,
  COP/USD, compartir (producto, línea, marca), píxel de Meta `102264959871887`, videos, preguntas frecuentes.
- Panel: Productos (editor, fotos a Cloudinary o link de Drive, inventario), Cotizaciones (PDF corporativo con
  jsPDF, compartir por WhatsApp), Pedidos, Ajustes (tasa, cinta, videos, FAQ, marcas, datos del PDF, usuarios), Historial.

## Dominio (pendiente)

- talabarteriacartago.com: registrado en **GoDaddy**, pero los servidores de nombres son de **HostGator**
  (websitewelcome.com). Hoy muestra una página WordPress en HostGator (192.185.150.70) y el correo es **Zoho Mail**
  (MX zoho, SPF, verificación y DKIM `zmail._domainkey`): no perder esos registros.
- Plan: Fase 1 pasar el DNS a GoDaddy copiando los registros; Fase 2 (si Cartago aprueba) A @ → IPs de GitHub
  Pages y CNAME www → jcspro13ship.github.io. La rama `dominio-propio` tiene la configuración para la raíz del
  dominio (base `/`, `public/CNAME`, 404.html con 0 segmentos); hay que actualizarla con `main` antes de publicarla.
- El acceso de delegado de GoDaddy para Juan Carlos quedó mal enviado; Cartago debe reenviarlo a su correo.

## Pendientes con Cartago

Precios por tamaño (bozal rejilla, collares, brazalete, bolso manos libres, minis) · productos sin precio ·
subcategoría Suplementos vacía · aviso de cookies por el píxel · activar renovación automática del dominio ·
fotos de ~230 productos.

## Siguiente proyecto: ERP de Cartago

Se va a trabajar en un chat aparte. Debe reutilizar estos datos (productos, variantes, inventario, cotizaciones,
pedidos, clientes en cotizaciones). Decisión abierta: seguir en Google Sheets + Apps Script o pasar a una base de
datos real según volumen y módulos (Sheets tiene límites de celdas, cuotas del script y concurrencia).
