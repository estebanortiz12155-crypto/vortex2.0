# Vortex · panel de QR dinámicos, negocios y caja

Tus claves de Supabase ya están puestas en `config.js`. La página se conecta directo a Supabase desde el navegador: no hay servidor ni variables que configurar.

| Archivo | Qué es |
|---|---|
| `index.html` | Tu panel (pide correo y contraseña) |
| `r.html` | La página que abre el QR: cuenta el escaneo y manda a la reseña |
| `s.html` | Estadísticas de solo lectura para tu cliente |
| `config.js` | Tu URL y tu clave de Supabase |
| `supa.js`, `ui.js`, `labels.js` | El funcionamiento del panel y las etiquetas |
| `supabase.sql` | Las tablas, funciones y reglas de seguridad |
| `vercel.json` | Hace que `tudominio.com/r/código` abra `r.html` |

## Paso 1 · Supabase (una sola vez)

1. Entra a tu proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**. Pega todo `supabase.sql` y dale **Run**. Debe decir *Success*.
3. **Authentication → Users → Add user → Create new user**. Pon tu correo y una contraseña, marca **Auto Confirm User** y dale **Create user**. Con ese correo y contraseña entras a tu panel.
4. **Authentication → Sign In / Providers** (o *Settings*): apaga **Allow new users to sign up**. Así nadie más puede crearse cuenta.

## Paso 2 · GitHub

1. Descomprime el zip. Te queda la carpeta `qr-supabase`.
2. En [github.com](https://github.com) crea un repositorio **privado** llamado `qr-dinamicos`. Si ya tienes uno de antes, borra sus archivos o crea uno nuevo.
3. **uploading an existing file** → arrastra todos los archivos de adentro de `qr-supabase` → **Commit changes**.

## Paso 3 · Vercel

1. En [vercel.com](https://vercel.com) → **Add New → Project** → importa `qr-dinamicos`.
2. Framework Preset: **Other**. No pongas variables.
3. **Deploy**.
4. Abre tu dirección (`qr-dinamicos.vercel.app`), entra con el correo y la contraseña del Paso 1, crea un QR de prueba y escanéalo.

## Lote de QR en blanco

Para imprimir folletos antes de venderlos:

1. **+ Lote de QR en blanco** → cuántos (ej. 3) → **Crear**. Se llaman Folleto 001, Folleto 002…
2. Se abre la impresión con 2 etiquetas por QR (frente y vuelta), 3 por hoja A4. 3 QR = 6 caras = 2 hojas.
3. Cuando vendas un folleto, en **Códigos QR** dale **Asignar liga** a ese QR y pon el nombre del negocio y su link de reseñas.

Mientras un QR no tenga liga, quien lo escanee ve una página de **¡Próximamente!** con su folio (ej. *Folleto 004*). Así, si se te revuelven, escaneas la etiqueta, ves qué folio es y le asignas la liga a ese en el panel. Puedes cambiar la liga cuando quieras.

Cada etiqueta lleva su folio impreso chiquito en la esquina de abajo. Se puede quitar en Imprimir etiquetas → *Imprimir el folio en la esquina*.

## Negocios (embudo de ventas)

**Prospectos** se ve en 3 columnas:
- **Contactado:** ya les hablaste o los visitaste.
- **Negociando:** les mandaste propuesta o precio.
- **Cerrado:** dijeron que sí, falta cobrar o entregar.

Cada negocio es una tarjeta con su valor estimado, sus servicios, WhatsApp, desde hace cuántos días está en ese paso y su próximo seguimiento (amarillo si es hoy, rojo si ya se pasó). Arrastra la tarjeta al siguiente paso o usa sus botones. En **Cerrado**, **Registrar venta** lo convierte en cliente. **Ver perdidos** muestra los que dijeron que no, y los puedes reactivar.

**Clientes:** todos a los que ya les vendiste algo, con lo que compraron, el total, su última compra y los servicios que todavía les puedes ofrecer.

**Mapa y estadísticas:** el mapa con cada negocio por color, negocios por paso y nuevos por semana. Arriba siempre ves tu avance contra la meta de 1,000.

## Caja

- **+ Venta:** escoge el negocio y el producto, y se llenan solos el precio y el costo. Al venderle, el negocio pasa a "Cliente".
- **− Gasto:** papel, tinta, gasolina, etiquetas NFC, publicidad…
- Arriba ves lo que facturaste hoy y tu ganancia del día. Luego, por periodo (hoy, 7 días, mes, año, todo): facturado, costo, gastos, utilidad, número de ventas y ticket promedio, con gráficas de ingresos contra gastos, lo que más vendes, en qué gastas y lo facturado por mes.

## Inventario

**Materiales:** agrega lo que compras (placa de acrílico, etiqueta NFC, sticker, papel fotográfico…) con su unidad, su costo por unidad, cuánto tienes y con cuánto quieres que te avise. Se edita directo en la tabla.

**+ Entrada de stock:** cuando compres material, pon cuánto y a cómo. Se suma al stock, se actualiza el costo y, si quieres, se registra como gasto en la Caja.

**Productos:** pon el precio de venta y los materiales que lleva cada pieza (ej. placa NFC = 1 placa + 1 etiqueta NFC + 1 sticker). Agrega también la mano de obra u otros costos. Para un servicio como un menú digital o una página web, pon todo su costo ahí. El sistema te dice cuánto te cuesta, cuánto ganas, tu margen y para cuántas piezas te alcanza el material.

Cada venta descuenta el material del stock. Si borras la venta, el material regresa. Los materiales que bajan de tu mínimo salen en rojo.

## Paso 4 · Tu dominio (antes de imprimir)

El link de cada QR usa la dirección desde donde entras al panel. Pon tu dominio en Vercel (**Settings → Domains**) antes de imprimir y entra siempre por él. Si lo cambias después, los QR impresos dejan de funcionar.

## Seguridad

- La clave `sb_publishable` es pública por diseño, puede ir en la página.
- Sin iniciar sesión nadie puede leer ni cambiar tus QR. Lo único público es escanear un QR y la página de estadísticas que tú compartes.
- Cada cuenta solo ve sus propios QR.
- Nunca pongas en `config.js` la clave **secret** de Supabase (`sb_secret_...`), solo la publishable.

## Si algo falla

| Lo que ves | Qué hacer |
|---|---|
| *Correo o contraseña incorrectos* | Revisa el usuario en Authentication → Users. Debe estar confirmado. |
| *Could not find the function* o *permission denied* | Corre otra vez `supabase.sql` en el SQL Editor. |
| El QR dice *Código no encontrado* | Revisa que el QR exista y esté activo en tu panel. |
| *404* al escanear | `vercel.json` debe estar en la raíz del repositorio. |

## Notas

- La ubicación es aproximada: se toma de la zona horaria del teléfono (por ejemplo *Mazatlan* o *Mexico City*). No se guarda la ubicación exacta.
- Las previsualizaciones de WhatsApp no cuentan como escaneo.
- Respaldo: en Supabase → **Table Editor** abre `qrs` y `scans` y dale **Export → CSV** una vez al mes.


## Novedades: cotizaciones, cobros mensuales, WhatsApp, reportes, metas y vendedores

**Antes de subir:** vuelve a correr `supabase.sql` completo en el SQL Editor (no borra nada) y sube a GitHub los archivos `index.html`, `negocios.js`, `inventario.js`, `supa.js` y el nuevo `vortex.js`.

- **Metas y ajustes** (botón en Negocios): nombre de tu empresa, tu nombre, teléfono y correo (salen en los PDF), moneda MXN o USD, metas del mes, vendedores con su % de comisión y los textos de WhatsApp.
- **Cotizaciones**: arma la propuesta con tus productos, se descarga el PDF con tu marca y el negocio pasa a Negociando. Cuando digan que sí, le das *Aceptada* y se registra la venta, se descuenta el material y el negocio pasa a cliente.
- **Cobros mensuales**: lo que te pagan cada mes (menú digital, hosting). Ves cuánto entra fijo, quién ya pagó, quién va atrasado y las renovaciones que vienen. *Cobrar* lo registra en la Caja y *Recordar* abre WhatsApp con el mensaje listo.
- **WhatsApp**: el botón de cada tarjeta abre el mensaje que toca según la etapa (primer contacto, seguimiento, propuesta, gracias, cobro, reporte). Lo puedes cambiar antes de mandarlo.
- **Reporte del mes**: en Clientes, *Reporte* descarga un PDF con los escaneos del mes de sus QR y *Mandar* le manda el link por WhatsApp. Para que funcione, el QR debe tener como *cliente* el mismo nombre que el negocio.
- **Metas del mes** con barra de avance en Negocios y en Caja, y **comisiones por vendedor** en la Caja.

## Contratos y movimientos de stock

**Antes de subir:** corre otra vez `supabase.sql` y sube `index.html`, `inventario.js`, `negocios.js`, `vortex.js` y el nuevo `contrato.js`.

- **Contratos** (en Cotizaciones o en la ficha del negocio): pones el cliente con su título, ciudad, fecha y total. El folio WEB-COM sale consecutivo y el subtotal, el IVA y la cantidad con letra se calculan solos. Se descarga en Word con la marca de Ajustes. Si el título es Dr. queda "EL CLIENTE" y si es Dra. queda "LA CLIENTE". *Firmado* registra la venta. En Ajustes pon tu ciudad y quién firma.
- **Mover stock** (Inventario): *Entrada* cuando compras, *Salida* para merma, muestras o uso propio, y *Conteo* para dejar el número que tienes de verdad. Cada material tiene *Historial* con todo lo que entró y salió, cuánto usaste en 30 días y para cuántos días te alcanza.

## Contratos por tipo, firma en línea, anticipos, recibos, compras, agenda y portal

**Antes de subir:** corre otra vez `supabase.sql` completo y sube a GitHub todos los archivos del zip. Los nuevos son `contrato-doc.js`, `pagos.js`, `compras.js`, `agenda.js`, `firma.html` y `portal.html`, y cambió `vercel.json`.

- **Contratos de 4 tipos:** sistema dental, página web, menú digital y placas, con anticipo y mensualidad opcionales.
- **Firma en línea:** al guardar el contrato eliges *Mandarle el link* y le llega por WhatsApp. El cliente lo lee y lo firma con el dedo en `/f/...`. Al firmar se registra la venta (con el anticipo), el negocio pasa a cliente y, si lleva mensualidad, se da de alta el cobro mensual. El Word del contrato firmado ya trae su firma.
- **Te deben (Caja):** las ventas con anticipo o a crédito. *Abonar* registra el pago y saca el recibo en PDF, y *Recordar* le manda el saldo por WhatsApp. Al aceptar una cotización te pregunta cuánto te pagaron.
- **Recibos de pago:** botón *Recibo* en cada venta.
- **Lista de compras (Inventario):** lo que está en el mínimo o que no te alcanza para dos semanas, con cuánto pedir y con quién sale más barato. *Pedir por WhatsApp* y *Ya lo compré*.
- **Proveedores:** a cuánto te da cada uno cada material.
- **Agenda de hoy (Negocios):** atrasados, hoy y la semana, con la ruta en el mapa y en Google Maps.
- **Portal del cliente:** `/c/...` con sus escaneos, sus pagos, sus mensualidades con botón para pagar y sus contratos. Se manda desde la ficha del negocio.
- **Inglés y link de pago:** en Ajustes eliges el idioma de lo que ven tus clientes (mensajes, PDFs, portal y página de firma) y pegas tu link de pago de Stripe o Mercado Pago.
