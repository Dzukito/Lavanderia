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
- Pedidos con número automático, servicio, cantidad de valets, paquetes, estado, horario estimado, precio, estado de pago, medio de pago y ubicación de depósito.
- Servicios iniciales: valet, lavado, secado, lavado + secado y otro.
- Estados del pedido: recibido, en lavado, en secado, listo para retirar, retirado y abonado.
- Turnos visuales según horario de lunes a viernes de 09:00 a 19:00, con agenda grande por hora y por día de la semana.
- Asignación de ciclos por disponibilidad real de lavarropas/secadoras, evitando superponer pedidos en una misma máquina.
- Capacidad configurable: lavarropas chicos, secadoras, duración de lavado y duración de secado.
- Depósito visual con ubicaciones tipo A1, A2, A3 para encontrar paquetes rápido y cartel/aviso configurable para pedidos no retirados.
- Avisos al cliente por WhatsApp Web: pedido listo, constancia de retirado, constancia de retirado y abonado, o copia manual del mensaje.
- Caja protegida con clave inicial `1234`, editable desde configuración, ingresos, egresos, efectivo y transferencia; al marcar un pedido como abonado se genera el ingreso correspondiente.
- Gastos por categorías como agua, luz, gas, insumos, alquiler y otros servicios.
- Reporte mensual simple de pedidos, ingresos potenciales y comparación mes a mes de caja con ingresos, egresos, saldo, efectivo y transferencia.
- Configuración de horarios, máquinas, ciclos y mensaje de WhatsApp.

## Flujo diario sugerido

1. Cargar o buscar cliente.
2. Crear pedido desde **Nuevo pedido**.
3. Elegir servicio, valets, paquetes, precio y ubicación de depósito si ya se conoce.
4. Editar estado, depósito, pago y medio de pago desde el botón **Editar** del pedido.
5. Al quedar listo, usar **WhatsApp** para elegir entre aviso de listo, constancia de retirado o constancia de retirado y abonado.
6. Al retirar, avanzar a **Retirado** y luego **Abonado**.
7. Revisar caja con la clave del dueño.

## Aviso legal de depósito

El sistema incluye un texto editable para avisar condiciones de guarda de prendas no retiradas. No se encontró una norma nacional específica que permita donar automáticamente prendas de lavandería no retiradas; por eso el texto propuesto se apoya en informar claramente las condiciones al cliente conforme la Ley 24.240 de Defensa del Consumidor, especialmente el deber de información clara. Validar el plazo y la redacción final con asesoría legal/local antes de imprimirlo o enviarlo.

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
