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

- Clientes con nombre, teléfono, dirección, notas e historial de pedidos.
- Pedidos con número automático, servicio, cantidad de valets, paquetes, estado, horario estimado, precio y ubicación de depósito.
- Servicios iniciales: valet, lavado, secado, lavado + secado y otro.
- Estados del pedido: recibido, en lavado, en secado, listo para retirar, retirado y abonado.
- Turnos visuales según horario de lunes a viernes de 09:00 a 19:00.
- Asignación de ciclos por disponibilidad real de lavarropas/secadoras, evitando superponer pedidos en una misma máquina.
- Capacidad configurable: lavarropas chicos, secadoras, duración de lavado y duración de secado.
- Depósito visual con ubicaciones tipo A1, A2, A3 para encontrar paquetes rápido.
- Aviso al cliente por WhatsApp Web o copia manual del mensaje.
- Caja protegida con clave inicial `1234`, editable desde configuración, ingresos, egresos, efectivo y transferencia.
- Gastos por categorías como agua, luz, gas, insumos, alquiler y otros servicios.
- Reporte mensual simple de pedidos, ingresos potenciales y comparación mes a mes.
- Configuración de horarios, máquinas, ciclos y mensaje de WhatsApp.

## Flujo diario sugerido

1. Cargar o buscar cliente.
2. Crear pedido desde **Nuevo pedido**.
3. Elegir servicio, valets, paquetes, precio y ubicación de depósito si ya se conoce.
4. Avanzar estados con el botón **Estado**.
5. Al quedar listo, usar **WhatsApp** o **Copiar** para avisar al cliente.
6. Al retirar, avanzar a **Retirado** y luego **Abonado**.
7. Revisar caja con la clave del dueño.

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
