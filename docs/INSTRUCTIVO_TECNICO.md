# Instructivo técnico · Catálogo web Talabartería Cartago

El sitio (React en GitHub Pages) lee y escribe el catálogo en un Google Sheet
a través de un Apps Script. El Sheet es la base de datos; el equipo de
Cartago trabaja desde el panel `/admin` del sitio con usuario y contraseña.

```
Panel /admin ──(usuario + contraseña)──► Apps Script ──► Google Sheet
Tienda pública ◄──(catálogo en JSON, caché 5 min)── Apps Script
Panel /admin ──(foto firmada por Apps Script)──► Cloudinary
```

## 1. Crear la hoja y el script (una sola vez)

1. En la carpeta de Drive del proyecto, crear un Google Sheet en blanco:
   **Cartago · Base de datos del catálogo**.
2. En el Sheet: **Extensiones > Apps Script**. Borrar el contenido de
   `Código.gs` y pegar `apps-script/Code.gs` de este repositorio. Guardar.
3. Recargar el Sheet. Aparece el menú **Catálogo web**.
4. **Catálogo web > 1. Configurar la hoja**. La primera vez Google pide
   autorizar el script (cuenta de JCS Consultoría). Crea las pestañas
   Productos, Variantes, Imagenes, Marcas, Configuracion, Listas e Historial,
   con las categorías, las marcas y la tasa del dólar ($3.000).
5. **Catálogo web > 2. Crear usuario del panel**, una vez por persona:
   David, Marcela y JCS. Contraseña de mínimo 8 caracteres.

Las contraseñas se guardan como huella cifrada (SHA-256 con sal) en las
propiedades privadas del script; no quedan en el Sheet ni en la página.

## 2. Publicar el script

1. En Apps Script: **Implementar > Nueva implementación > Aplicación web**.
   - Ejecutar como: **Yo** (la cuenta dueña del Sheet).
   - Quién tiene acceso: **Cualquier persona**.
2. Copiar la URL que termina en `/exec` y pegarla en `src/config.js`
   (`SHEETS_API_URL`). Compilar y publicar: `npm run build && npm run deploy`.

"Cualquier persona" es necesario para que la tienda lea el catálogo. Las
acciones del panel igual exigen una sesión válida: sin usuario y contraseña
el script solo entrega el catálogo público.

**Cada vez que se cambie `Code.gs`**: Implementar > Gestionar implementaciones >
editar la existente > Versión: nueva. Así la URL no cambia.

## 3. Fotos con Cloudinary

1. Crear la cuenta gratuita en cloudinary.com (correo de JCS o de Cartago).
2. En el panel de Cloudinary copiar **Cloud name**, **API Key** y **API Secret**.
3. En el Sheet: **Catálogo web > 3. Configurar Cloudinary** y pegar los tres
   datos.

El panel pide una firma al script para cada foto y la sube directo a
Cloudinary (carpeta `cartago/productos`). El API Secret nunca llega al
navegador. Las fotos se reducen a 2000 px antes de subirlas.

## 4. Cómo funciona el panel

- **Productos**: crear, editar, ocultar (sin borrar) o eliminar; colores y
  stock; fotos (subir, ordenar, quitar o pegar un link); destacado,
  personalizable, garantía. El código se propone solo según la categoría
  (m = Monturas, e = Equino, j = Jinete, c = Cuidado del caballo, k = Caninos).
- **Stock rápido**: en la lista, "Stock" despliega los colores con − y +.
- **Ajustes**: tasa del dólar, marcas y logos, usuarios y cambio de contraseña.
- **Historial**: quién hizo cada cambio (también queda en la pestaña Historial).

Seguridad: sesiones de 6 horas; 5 intentos fallidos bloquean el usuario
15 minutos; las escrituras usan un candado para que dos personas no se pisen.
La tienda ve los cambios al instante (el script borra su caché al guardar).

## 5. Desarrollo local

`npm run dev`. Con `SHEETS_API_URL` vacío, el panel funciona con datos de
prueba en memoria (usuario `demo`, contraseña `demo1234`). Ese modo no se
incluye en la versión publicada.

## 6. Dominio propio

Cuando se conecte el dominio de Cartago:
- `vite.config.js`: `base: '/'`
- `public/404.html`: `pathSegmentsToKeep = 0`
- `.env`: `VITE_SITE_URL=https://www.dominio.com`
- Crear `public/CNAME` con el dominio, y configurarlo en GitHub >
  Settings > Pages.
