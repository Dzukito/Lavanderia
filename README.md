# Sistema local para lavandería

MVP web local para gestionar una lavandería desde una PC. Está pensado para usuarios no técnicos, con botones grandes, colores por estado y operación simple desde navegador.

## Cómo abrirlo localmente

Opción rápida:

1. Abrir `index.html` con doble clic en la computadora de la lavandería.
2. El sistema guarda los datos en el navegador mediante `localStorage`.

Opción recomendada para pruebas:

```bash
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080`.

## Importante sobre navegadores y datos

Los datos se guardan en el `localStorage` del navegador que se usa. Chrome, Firefox y Edge no comparten ese almacenamiento entre sí, y cada perfil/ruta local puede tener un espacio separado. Si cargás pedidos en Chrome y abrís el mismo `index.html` en Firefox o Edge, cada navegador tendrá su propia caja y pedidos. Para respaldo contable, usá **Caja → Exportar caja histórica CSV**, que descarga un archivo `.csv` compatible con Excel en la carpeta de descargas configurada del navegador.

## Funciones incluidas

- Clientes con nombre, teléfono, dirección, notas, botón de historial de pedidos y personas autorizadas a retirar.
- Pedidos con código visible compuesto por depósito + id interno, por ejemplo `A2#1001`; si está retirado usa formato `R#1001`, y si no tiene depósito pero sigue activo muestra `Sin depósito#1001`, prendas/trabajos manuales con cantidad, estado simple, horario estimado, total calculado, pago, medio de pago y observaciones visibles.
- Servicios iniciales: valet, lavado, secado, lavado + secado y otro.
- Estados simplificados del pedido: pendiente, listo y retirado.
- Turnos rediseñados de forma ultra simple: botón **+ Asignar pedido**, conteo de máquinas libres, tarjetas grandes de lavarropas/secadoras en verde o azul y agenda de hoy.
- Asignación automática por disponibilidad real, con opción de tocar una máquina para guardar un trabajo o tocar un trabajo de la agenda para moverlo/borrarlo. Las herramientas menos usadas quedan plegadas en **Opciones manuales**.
- Capacidad configurable: lavarropas chicos, secadoras, duración de lavado y duración de secado.
- Depósito visual con ubicaciones tipo A1, A2, A3 para encontrar paquetes rápido; al hacer clic se abre la vista del pedido sin editarlo, más cartel/aviso configurable para pedidos no retirados.
- Avisos al cliente por WhatsApp Web desde un único menú: recibimos tu pedido, tu pedido está listo y retiró su pedido; el texto cambia automáticamente si está pago o pendiente.
- Caja protegida con clave inicial `1234`, editable desde configuración, ingresos, egresos, efectivo y transferencia; al marcar un pedido como abonado se genera el ingreso correspondiente, y cada movimiento diario puede borrarse si se cargó mal.
- Gastos por categorías como agua, luz, gas, insumos, alquiler y otros servicios.
- Caja diaria protegida por clave cada vez que se entra, botón visible para **Empezar nuevo día** que archiva la caja actual en caja histórica, exportación CSV de caja histórica y métricas mensuales protegidas con clave propia editable, inicial `1111`, selector de mes, top 3 clientes, gráfico lineal de pedidos por hora, mejor mes histórico, caja mensual visible y exportación CSV solo de la caja mensual seleccionada.
- Configuración de horarios, máquinas, ciclos, mensajes simples de WhatsApp, clave de caja, clave de métricas e importación CSV de clientes o pedidos.

## Flujo diario sugerido

1. Cargar o buscar cliente con el buscador de **Clientes**.
2. Crear pedido desde **Nuevo pedido**.
3. Elegir depósito, cargar cada prenda/trabajo con cantidad, servicio y precio unitario; el total se calcula solo.
4. Cambiar el estado con el botón **Estado** y editar prendas, precios, datos de pago y observaciones con **Editar**.
5. Usar **WhatsApp** para elegir entre recibido, listo o retirado; el sistema agrega automáticamente si está pago o pendiente.
6. Al retirar, cambiar el estado a **Retirado** y registrar el pago si corresponde.
7. Revisar caja con la clave del dueño cada vez que se entra; al cerrar el día tocar **Empezar nuevo día** para pasar los movimientos al histórico y poder exportarlo desde **Caja → Exportar caja histórica CSV**. En **Métricas**, el botón **Exportar caja mensual CSV** descarga únicamente el mes seleccionado.

### Nuevo flujo de Turnos

La sección **Turnos** quedó reducida a lo esencial:

1. Botón grande **+ Asignar pedido**.
2. Resumen de máquinas libres y trabajos de hoy.
3. Tarjetas de **Lavarropas** y **Secadoras**: verde significa libre, azul ocupado y rojo reservado.
4. **Agenda de hoy** con hora, máquina y cliente/pedido.
5. **Opciones manuales** queda plegado para no molestar: reservar máquina, ver pedidos sin máquina, buscar libre, reordenar y calendario.

Cuando un pedido pasa a **Listo** o **Retirado**, deja de aparecer como trabajo activo en Turnos, para que las máquinas se liberen visualmente.

### Importar CSV desde Configuración

En **Config. → Importar CSV** se puede elegir si el archivo contiene **Clientes** o **Pedidos**. El importador acepta archivos separados por coma o punto y coma y suma datos sin borrar lo existente.

- Clientes: columnas sugeridas `nombre`, `telefono`, `direccion`, `notas`, `autorizados`.
- Pedidos: columnas sugeridas `cliente`, `telefono`, `prenda`, `cantidad`, `precio`, `estado`, `pago`, `medio`, `deposito`, `notas`.

## Si la pantalla queda en blanco

- Actualizar el navegador de la PC de la lavandería.
- Abrirlo con el servidor local recomendado: `python3 -m http.server 8080` y entrar a `http://localhost:8080`.
- Esta versión carga `polyfills.js` antes de la agenda y la app, y los scripts principales están publicados en sintaxis ES5 para evitar errores de parseo en navegadores viejos.

## Aviso legal de depósito

El sistema incluye un texto editable para avisar condiciones de guarda de prendas no retiradas. El texto propuesto está redactado como condición comercial informada al cliente y se apoya en el deber de brindar información clara conforme la Ley 24.240 de Defensa del Consumidor. Validar el plazo y la redacción final con asesoría legal/local antes de imprimirlo o enviarlo.

Fuentes de referencia:

- Ley 24.240, texto actualizado: https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion
- Ley simple de Defensa del Consumidor: https://www.argentina.gob.ar/justicia/derechofacil/leysimple/defensa-del-consumidor

## Pruebas

```bash
npm test
node --check app.js
node --check scheduler.js
node tests/startup.test.js
```

## Nota para producción

Este MVP no usa servidor ni base de datos externa. Para uso real prolongado se recomienda agregar:

- Backup automático diario.
- Usuario y contraseña reales con hash seguro.
- Base de datos SQLite local.
- Exportación CSV/Excel.
- Instalador de escritorio con Electron o Tauri.
