# TECO

Comparador de precios de productos tecnológicos (Perú). Busca un producto, revisa
sus características y compara el precio en tiendas grandes. Si no hay precio
validado, muestra "Consultar" y abre la búsqueda real en la tienda.

## Requisitos
- Node.js 18 o superior

## Instalación y ejecución (Windows)
```powershell
npm.cmd install
npm.cmd run install-browsers
npm.cmd start
```
Luego abre: http://localhost:3000

> `install-browsers` instala Chromium para Playwright (validación de precios).
> Si lo omites, la web funciona igual: los precios no validados muestran "Consultar".

## Accesos del panel (NO se muestran en la web pública)
- Administrador → rol "Administrador", contraseña: `teco2025`
- Proveedor → rol "Proveedor", contraseña: `proveedor2025`

Puedes cambiarlas con variables de entorno `ADMIN_PASS` y `PROVIDER_PASS`.

Al iniciar sesión, el servidor entrega un **token firmado (HMAC-SHA256)** que el
panel envía en cada acción. **Todas las rutas de escritura y la lista de
proveedores exigen ese token en el servidor** (no solo en el navegador): sin él
responden 401. El token caduca a las 12 h.

## Estructura
- `index.html`, `productos.html`, `buscador-online.html`, `detalle.html` → web pública
- `proveedor.html`, `login.html`, `panel-proveedor.html`, `admin.html` → afiliación y gestión
- `validar-precios.html`, `actualizar-precios.html` → precios (admin)
- `server/` → Express + datos JSON + validador Playwright

## Variables de entorno (producción)
- `ADMIN_PASS`, `PROVIDER_PASS` → contraseñas de los paneles.
- `TECO_SECRET` → secreto para firmar los tokens. Si no lo defines, se genera
  uno y se guarda en `server/.secret` (gitignored). **Defínelo si corres varias
  instancias** para que las sesiones valgan en todas.
- `SITE_URL` → URL pública (p.ej. `https://teco.pe`). La usan `sitemap.xml`,
  `robots.txt` y las etiquetas `canonical`/Open Graph del detalle.
- `AUTO_REFRESH_HOURS` → cada cuántas horas el servidor reimporta los feeds
  solo (por defecto 6; `0` lo desactiva). Corre también al arrancar.
- `PORT` → puerto (por defecto 3000).

## SEO
- `GET /sitemap.xml` y `GET /robots.txt` se generan solos desde el catálogo.
- La página de detalle se sirve con `<title>`, descripción, Open Graph y
  **JSON-LD `Product`** con los precios reales, para que Google y las redes
  indexen cada producto. Envía el `sitemap.xml` a Google Search Console.

## Imágenes de producto
- Si un producto trae `image` (columna `image` en CSV/JSON, o campo en el feed),
  se muestra en las tarjetas y en el detalle. Sin imagen, se usa el ícono de la
  categoría. Conviene poblar `image` desde los feeds de afiliados.

## Notas importantes
- Verifica/ajusta las URL de búsqueda de cada tienda en `server/company-sources.json`.
- Ajusta los selectores del validador en `server/price-sources.json` si una tienda cambia su HTML.
- El login usa contraseña compartida por rol + token firmado (suficiente para una
  primera versión real). Para multiusuario, añade cuentas y hashing por usuario.

## Cargar muchos productos (catálogo completo)
Escribir a mano no escala. Para llenar el catálogo en masa:

1. **Desde el panel** (admin → "Importar productos"): pega un CSV o JSON y dale Importar.
2. **Por archivo:** pon tu CSV en `server/import.csv` y ejecuta `npm.cmd run import`.
3. **Automático (rastrea las tiendas):** `npm.cmd run install-browsers` y luego `npm.cmd run crawl`. Lee las categorías de `server/catalog-sources.json` y agrega los productos solos (ajusta selectores en `server/price-sources.json` si una tienda cambia su HTML).

Columnas CSV: `name, brand, category, price, store, link, specs` (specs opcional, formato `Pantalla:6.1|RAM:8GB`). Los términos de búsqueda se generan automáticamente.

## Actualización automática de precios (lo importante)
Los precios cambian a diario, así que el catálogo se actualiza solo:

- **Con solo `npm.cmd start`**: el servidor reimporta los feeds al arrancar y
  luego **cada 6 h** (`AUTO_REFRESH_HOURS`). El estado se ve en el panel admin
  ("Última actualización… · próxima…"), y el botón **"Actualizar precios desde
  feeds"** fuerza una corrida al instante.
- `npm.cmd run schedule` → alternativa por separado, **cada 12 h** (cambia con `SCHEDULE_HOURS=6`). Para incluir el rastreo de tiendas: `SCHEDULE_CRAWL=1`.
- `npm.cmd run feeds` → importa una vez desde los feeds configurados en `server/feeds.json`.

**Fuente de datos recomendada: feeds de afiliados.** En `server/feeds.json` pones la URL del feed de tu programa de afiliados (Soicos, Awin, Admitad, etc., que cubren tiendas peruanas). El sistema descarga ese archivo (precio, stock, imagen, tu link de afiliado) y lo importa. Como es solo bajar un archivo, **no te bloquean** y además **ganas comisión** por venta.

### Conectar tu primer feed (paso a paso)
1. Crea cuenta en una red de afiliados que cubra Perú (Soicos, Awin, Admitad, Impact). Es gratis.
2. En su panel, busca el **catálogo/feed** de la tienda (Falabella, Ripley…) y copia la **URL del feed** (CSV o JSON). Trae tu *deeplink* de afiliado por producto.
3. Pega esa URL en `server/feeds.json` y ajusta `map` para que apunte a los nombres de columna reales del feed (ver formato en **`feed-demo.csv`**, un ejemplo listo).
4. Prueba: `npm.cmd run feeds` (o el botón **"Actualizar precios desde feeds"** en el panel admin).
5. Los productos entran con **link directo de compra** (`verified`), precio, precio especial e imagen — se ven completos en las tarjetas y el botón "Comprar" va directo a la ficha.

`feed-demo.csv` (en la raíz) muestra el formato esperado y sirve para probar el flujo sin cuenta todavía.

**Para 24/7 sin tener la PC prendida:**
- **GitHub Actions** (gratis): ya incluido en `.github/workflows/update-prices.yml`. Sube el proyecto a GitHub y corre solo cada 12 h (ideal para feeds).
- **VPS barato** (Hetzner/DigitalOcean ~US$5/mes) o **Render/Railway** con cron: corre `npm run schedule` siempre. Necesario si quieres rastreo (scraping), porque requiere IP no bloqueada.

Resumen: **feeds de afiliados + cron 24/7 = lo mejor**. El rastreador (`crawl`) queda como respaldo para tiendas sin feed.
