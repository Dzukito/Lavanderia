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

## Funciones incluidas

- Clientes con nombre, teléfono, dirección, notas, historial de pedidos y personas autorizadas a retirar.
- Pedidos con código visible compuesto por depósito + id interno, por ejemplo `A2 - 1001`, servicio, valets, paquetes, estado simple, horario estimado, precio, pago, medio de pago y observaciones visibles.
- Servicios iniciales: valet, lavado, secado, lavado + secado y otro.
- Estados simplificados del pedido: pendiente, listo y retirado.
- Turnos visuales con agenda grande por hora y por día de la semana, selector de semana para probar cualquier fecha y lectura visual de disponibilidad por máquinas.
- Asignación de ciclos por disponibilidad real de lavarropas/secadoras, evitando superponer pedidos en una misma máquina.
- Capacidad configurable: lavarropas chicos, secadoras, duración de lavado y duración de secado.
- Depósito visual con ubicaciones tipo A1, A2, A3 para encontrar paquetes rápido y cartel/aviso configurable para pedidos no retirados.
- Avisos al cliente por WhatsApp Web desde un único menú: recibimos tu pedido, tu pedido está listo y retiró su pedido; el texto cambia automáticamente si está pago o pendiente.
- Caja protegida con clave inicial `1234`, editable desde configuración, ingresos, egresos, efectivo y transferencia; al marcar un pedido como abonado se genera el ingreso correspondiente.
- Gastos por categorías como agua, luz, gas, insumos, alquiler y otros servicios.
- Caja diaria protegida por clave cada vez que se entra y comparación mensual en la pantalla separada **Caja mensual**, con tarjetas de ingresos, egresos, saldo, efectivo y transferencia.
- Configuración de horarios, máquinas, ciclos y mensaje de WhatsApp.

## Flujo diario sugerido

1. Cargar o buscar cliente.
2. Crear pedido desde **Nuevo pedido**.
3. Elegir servicio, valets, paquetes, precio y ubicación de depósito si ya se conoce.
4. Cambiar el estado con el botón **Estado** y editar datos de pago/observaciones con **Editar**.
5. Usar **WhatsApp** para elegir entre recibido, listo o retirado; el sistema agrega automáticamente si está pago o pendiente.
6. Al retirar, cambiar el estado a **Retirado** y registrar el pago si corresponde.
7. Revisar caja con la clave del dueño cada vez que se entra; la caja diaria queda separada de **Caja mensual**.

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
```

## Nota para producción

Este MVP no usa servidor ni base de datos externa. Para uso real prolongado se recomienda agregar:

- Backup automático diario.
- Usuario y contraseña reales con hash seguro.
- Base de datos SQLite local.
- Exportación CSV/Excel.
- Instalador de escritorio con Electron o Tauri.
