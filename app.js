const STORAGE_KEY = "lavanderia-local-v1";
const STATES = ["Recibido", "En lavado", "En secado", "Listo para retirar", "Retirado", "Abonado"];
const defaultData = {
  settings: {
    openHour: "09:00",
    closeHour: "19:00",
    washingMinutes: 30,
    dryingMinutes: 50,
    smallWashers: 4,
    dryers: 6,
    whatsappReceivedMessage: "Hola {cliente}. Recibimos tu pedido #{pedido}. Te avisamos cuando esté listo. Gracias.",
    whatsappWorkingMessage: "Hola {cliente}. Tu pedido #{pedido} ya está en proceso. Estimamos finalizarlo aproximadamente a las {estimado}.",
    whatsappMessage: "Hola {cliente}. Tu pedido #{pedido} de la lavandería ya está listo para retirar. Te esperamos hasta las 19:00. Gracias.",
    whatsappRetiredMessage: "Hola {cliente}. Dejamos constancia de que el pedido #{pedido} fue retirado el {fecha}. Muchas gracias.",
    whatsappRetiredPaidMessage: "Hola {cliente}. Dejamos constancia de que el pedido #{pedido} fue retirado y abonado el {fecha}. Muchas gracias.",
    storageNoticeDays: 30,
    storageNoticeText: "Condiciones de guarda: conforme las condiciones informadas al momento de recepción y el deber de información clara previsto por la Ley 24.240 de Defensa del Consumidor, los pedidos no retirados dentro de {dias} días corridos desde el aviso de disponibilidad podrán generar cargos de guarda y/o ser derivados a donación previa comunicación fehaciente al cliente. Texto sujeto a validación legal local.",
    cashPin: "1234",
  },
  services: [
    { id: 1, name: "Valet", price: 3500, wash: true, dry: true },
    { id: 2, name: "Lavado", price: 1800, wash: true, dry: false },
    { id: 3, name: "Secado", price: 1600, wash: false, dry: true },
    { id: 4, name: "Lavado + secado", price: 3000, wash: true, dry: true },
    { id: 5, name: "Otro", price: 0, wash: false, dry: false },
  ],
  clients: [
    { id: 1, name: "María Gómez", phone: "5491112345678", address: "", notes: "Prefiere WhatsApp", authorizedPickups: "Hijo: Lucas Gómez" },
    { id: 2, name: "Juan Pérez", phone: "5491198765432", address: "", notes: "", authorizedPickups: "" },
  ],
  orders: [],
  cash: [],
  locations: ["A", "B", "C", "D", "E", "F"].flatMap((row) => Array.from({ length: 6 }, (_, index) => `${row}${index + 1}`)).map((code, index) => ({ id: index + 1, code })),
};

let state = loadState();
let currentView = "dashboard";
let cashUnlocked = false;
let scheduleWeekStart = currentWeekStart(new Date()).toISOString().slice(0, 10);
let schedulePreview = null;

function mergeLocations(defaultLocations, savedLocations = []) {
  const byCode = new Map([...defaultLocations, ...(savedLocations || [])].map((location, index) => [location.code, { id: index + 1, code: location.code }]));
  return [...byCode.values()].map((location, index) => ({ ...location, id: index + 1 }));
}

function currentWeekStart(reference) {
  const day = reference.getDay() || 7;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function loadState() {
  const defaults = structuredClone(defaultData);
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaults;

  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    console.warn("No se pudieron leer los datos guardados. Se cargan datos iniciales.", error);
    return defaults;
  }

  const merged = {
    ...defaults,
    ...parsed,
    settings: { ...defaults.settings, ...(parsed.settings || {}) },
    services: parsed.services?.length ? parsed.services : defaults.services,
    clients: parsed.clients?.length ? parsed.clients : defaults.clients,
    orders: parsed.orders || defaults.orders,
    cash: parsed.cash || defaults.cash,
    locations: mergeLocations(defaults.locations, parsed.locations),
  };

  merged.clients = merged.clients.map((client) => ({ authorizedPickups: "", ...client }));

  merged.orders = merged.orders.map((order) => ({
    ...order,
    paymentStatus: order.paymentStatus || (order.status === "Abonado" ? "Abonado" : "Pendiente"),
    paymentMethod: order.paymentMethod || "Efectivo",
    cycles: order.cycles || [],
  }));

  return merged;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "Sin estimar";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function normalizeClass(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-");
}

function nextId(list) {
  return list.length ? Math.max(...list.map((item) => item.id)) + 1 : 1;
}

function nextOrderNumber() {
  return String(1000 + nextId(state.orders)).padStart(4, "0");
}

function getClient(id) {
  return state.clients.find((client) => client.id === Number(id));
}

function getService(id) {
  return state.services.find((service) => service.id === Number(id));
}

function getOrder(id) {
  return state.orders.find((order) => order.id === Number(id));
}

function serviceSummary(order) {
  const service = getService(order.serviceId);
  return service ? service.name : "Servicio eliminado";
}

function orderClient(order) {
  const client = getClient(order.clientId);
  return client ? client.name : "Cliente eliminado";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function availableLocations(currentOrderId = null) {
  const busy = new Set(
    state.orders
      .filter((order) => order.id !== Number(currentOrderId) && order.location && !["Retirado", "Abonado"].includes(order.status))
      .map((order) => order.location),
  );
  return state.locations.filter((location) => !busy.has(location.code));
}

function createOrderSchedule(service, createdAt) {
  return LaundryScheduler.scheduleOrder(state.orders, service, state.settings, createdAt);
}

function currentWeekDays(reference = new Date()) {
  const monday = currentWeekStart(reference);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function hourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function cycleOverlapsHour(cycle, day, hour) {
  const start = new Date(cycle.start);
  const end = new Date(cycle.end);
  const blockStart = new Date(day);
  blockStart.setHours(hour, 0, 0, 0);
  const blockEnd = new Date(blockStart);
  blockEnd.setHours(hour + 1, 0, 0, 0);
  return start < blockEnd && end > blockStart;
}

function monthKey(value) {
  return new Date(value).toISOString().slice(0, 7);
}

function monthlyCashSummary() {
  const summary = {};
  state.cash.forEach((entry) => {
    const key = monthKey(entry.date);
    summary[key] ||= { income: 0, expense: 0, cash: 0, transfer: 0 };
    const amount = Number(entry.amount || 0);
    if (entry.type === "Ingreso") summary[key].income += amount;
    if (entry.type === "Egreso") summary[key].expense += amount;
    if (entry.method === "Efectivo") summary[key].cash += entry.type === "Ingreso" ? amount : -amount;
    if (entry.method === "Transferencia") summary[key].transfer += entry.type === "Ingreso" ? amount : -amount;
  });
  return Object.entries(summary).sort().map(([month, values], index, list) => {
    const balance = values.income - values.expense;
    const prevBalance = index > 0 ? list[index - 1][1].income - list[index - 1][1].expense : null;
    const diff = prevBalance ? Math.round(((balance - prevBalance) / Math.abs(prevBalance)) * 100) : null;
    return { month, ...values, balance, diff };
  });
}

function messageForOrder(order, type) {
  const templates = {
    received: state.settings.whatsappReceivedMessage,
    working: state.settings.whatsappWorkingMessage,
    ready: state.settings.whatsappMessage,
    retired: state.settings.whatsappRetiredMessage,
    retiredPaid: state.settings.whatsappRetiredPaidMessage,
  };
  return templates[type]
    .replaceAll("{cliente}", orderClient(order))
    .replaceAll("{pedido}", order.number)
    .replaceAll("{fecha}", formatDateTime(new Date().toISOString()))
    .replaceAll("{estimado}", formatDateTime(order.estimate))
    .replaceAll("{total}", money(order.total));
}

function render() {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === currentView));
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === currentView));
  renderDashboard();
  renderOrders();
  renderClients();
  renderSchedule();
  renderStorage();
  renderCash();
  renderSettings();
}

function setView(view) {
  currentView = view;
  render();
}

document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));

document.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (!action) return;
  const id = event.target.dataset.id;
  const handlers = {
    newOrder: openOrderModal,
    newClient: openClientModal,
    editClient: () => openClientModal(id),
    editOrderStatus: () => openOrderStatusModal(id),
    whatsapp: () => openWhatsappMenu(id),
    storageNotice: () => openStorageNoticeModal(id),
    openStorageOrder: () => openStorageOrder(id),
    prevWeek: () => moveScheduleWeek(-7),
    nextWeek: () => moveScheduleWeek(7),
    todayWeek: () => setScheduleWeek(currentWeekStart(new Date()).toISOString().slice(0, 10)),
    simulateSchedule: openScheduleSimulator,
    sendWhatsapp: () => sendWhatsapp(id, event.target.dataset.messageType),
    copyNotice: copyVisibleNotice,
    sendStorageNotice: () => sendStorageNotice(id),
    cashIncome: () => openCashModal("Ingreso"),
    cashExpense: () => openCashModal("Egreso"),
    unlockCash: unlockCash,
    saveSettings: saveSettings,
    resetDemo: resetDemo,
  };
  handlers[action]?.();
});

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal]")) closeModal();
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-search-orders]")) filterOrders(event.target.value);
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-schedule-week]")) {
    setScheduleWeek(event.target.value);
    return;
  }
  if (!event.target.matches("[data-service-select]")) return;
  const selected = event.target.selectedOptions[0];
  const priceInput = event.target.closest("form")?.querySelector("[name='total']");
  if (priceInput && selected?.dataset.price) priceInput.value = selected.dataset.price;
});

function renderDashboard() {
  const ready = state.orders.filter((order) => order.status === "Listo para retirar").length;
  const pending = state.orders.filter((order) => !["Retirado", "Abonado"].includes(order.status)).length;
  const income = state.cash.filter((entry) => entry.type === "Ingreso").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const late = state.orders.filter((order) => order.estimate && new Date(order.estimate) < new Date() && !["Retirado", "Abonado"].includes(order.status)).length;
  document.getElementById("dashboard").innerHTML = `
    <div class="grid four">
      <article class="card metric"><span>Pedidos activos</span><strong>${pending}</strong></article>
      <article class="card metric"><span>Listos para retirar</span><strong>${ready}</strong></article>
      <article class="card metric"><span>Atrasados</span><strong>${late}</strong></article>
      <article class="card metric"><span>Ingresos cargados</span><strong>${money(income)}</strong></article>
    </div>
    <div class="card">
      <div class="toolbar"><h2>Accesos rápidos</h2><div class="actions"><button class="primary" data-action="newOrder">+ Nuevo pedido</button><button class="secondary" data-action="newClient">+ Cliente</button></div></div>
      <p class="notice">Pantalla pensada para uso diario: botones grandes, estados por color, búsqueda simple y WhatsApp preparado.</p>
    </div>
    ${ordersTable(state.orders.slice(-6).reverse(), "Últimos pedidos")}
  `;
}

function renderOrders() {
  document.getElementById("orders").innerHTML = `
    <div class="card">
      <div class="toolbar"><h2>Pedidos</h2><div class="actions"><button class="primary" data-action="newOrder">+ Nuevo pedido</button></div></div>
      <input id="orderSearch" data-search-orders placeholder="Buscar por número, cliente, teléfono, estado o depósito" />
    </div>
    <div id="ordersTable">${ordersTable([...state.orders].reverse(), "Listado de pedidos")}</div>
  `;
}

window.filterOrders = (query) => {
  const q = query.toLowerCase();
  const filtered = state.orders.filter((order) => `${order.number} ${orderClient(order)} ${getClient(order.clientId)?.phone || ""} ${order.status} ${order.location || ""}`.toLowerCase().includes(q));
  document.getElementById("ordersTable").innerHTML = ordersTable(filtered.reverse(), "Resultados");
};

function ordersTable(orders, title) {
  return `
    <div class="card">
      <h2>${escapeHtml(title)}</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>N°</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Estimado</th><th>Depósito</th><th>Pago</th><th>Total</th><th>Acciones</th></tr></thead>
        <tbody>${orders.map((order) => `
          <tr>
            <td><strong>#${escapeHtml(order.number)}</strong></td>
            <td>${escapeHtml(orderClient(order))}<br><small>${escapeHtml(getClient(order.clientId)?.phone || "")}</small></td>
            <td>${escapeHtml(serviceSummary(order))}<br><small>${Number(order.valets || 0)} valet(s) · ${Number(order.packages || 1)} paquete(s)</small></td>
            <td><span class="badge ${normalizeClass(order.status)}">${escapeHtml(order.status)}</span></td>
            <td>${formatDateTime(order.estimate)}</td>
            <td>${escapeHtml(order.location || "Sin asignar")}</td>
            <td>${escapeHtml(order.paymentStatus || "Pendiente")}<br><small>${escapeHtml(order.paymentMethod || "-")}</small></td>
            <td>${money(order.total)}</td>
            <td class="actions"><button class="secondary" data-action="editOrderStatus" data-id="${order.id}">Editar</button><button class="success" data-action="whatsapp" data-id="${order.id}">WhatsApp</button></td>
          </tr>`).join("") || `<tr><td colspan="9">No hay pedidos cargados.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}


function renderClients() {
  document.getElementById("clients").innerHTML = `
    <div class="card section-card">
      <div class="toolbar"><div><p class="eyebrow-dark">Personas</p><h2>Clientes</h2></div><button class="primary" data-action="newClient">+ Nuevo cliente</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Autorizados a retirar</th><th>Dirección</th><th>Notas</th><th>Pedidos</th><th></th></tr></thead>
        <tbody>${state.clients.map((client) => `<tr><td><strong>${escapeHtml(client.name)}</strong></td><td>${escapeHtml(client.phone)}</td><td>${escapeHtml(client.authorizedPickups || "Solo titular")}</td><td>${escapeHtml(client.address || "-")}</td><td>${escapeHtml(client.notes || "-")}</td><td>${state.orders.filter((order) => order.clientId === client.id).length}</td><td><button class="secondary" data-action="editClient" data-id="${client.id}">Editar</button></td></tr>`).join("")}</tbody>
      </table></div>
    </div>`;
}


function renderSchedule() {
  const machines = [
    ...LaundryScheduler.machineNames("Lavado", state.settings.smallWashers).map((name) => ({ type: "Lavado", name })),
    ...LaundryScheduler.machineNames("Secado", state.settings.dryers).map((name) => ({ type: "Secado", name })),
  ];
  const activeCycles = state.orders
    .filter((order) => !["Retirado", "Abonado"].includes(order.status))
    .flatMap((order) => (order.cycles || []).map((cycle) => ({ ...cycle, order })))
    .filter((cycle) => cycle.type !== "Preparación")
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const weekDays = currentWeekDays(new Date(`${scheduleWeekStart}T00:00:00`));
  const openHour = Number(state.settings.openHour.split(":")[0]);
  const closeHour = Number(state.settings.closeHour.split(":")[0]);
  const hours = Array.from({ length: Math.max(1, closeHour - openHour) }, (_, index) => openHour + index);
  const washDryMinutes = Number(state.settings.washingMinutes) + Number(state.settings.dryingMinutes);
  const preview = schedulePreview ? `<div class="notice preview-box"><strong>Estimación manual:</strong> ${escapeHtml(schedulePreview.client)} · ${escapeHtml(schedulePreview.service)} tarda aprox. <strong>${schedulePreview.minutes} minutos</strong>. Si entra ${formatDateTime(schedulePreview.start)}, estaría listo ${formatDateTime(schedulePreview.end)}.</div>` : "";

  document.getElementById("schedule").innerHTML = `
    <div class="card hero-card"><div><p class="eyebrow-dark">Turnero</p><h2>Agenda grande por hora</h2><p>Mostrando semana desde <strong>${weekDays[0].toLocaleDateString("es-AR")}</strong>. Un valet lavado + secado ocupa aprox. <strong>${washDryMinutes} minutos</strong>, pero la estimación real depende de máquinas libres.</p></div><div class="status-pill light">${state.settings.smallWashers} lavarropas · ${state.settings.dryers} secadoras</div></div>
    <div class="card"><div class="toolbar"><h3>Controles de agenda</h3><div class="actions"><button class="secondary" data-action="prevWeek">← Semana anterior</button><input class="week-input" type="date" data-schedule-week value="${scheduleWeekStart}" /><button class="secondary" data-action="todayWeek">Semana actual</button><button class="secondary" data-action="nextWeek">Semana siguiente →</button><button class="primary" data-action="simulateSchedule">Simular demora</button></div></div>${preview}</div>
    <div class="card schedule-card"><h3>Semana seleccionada</h3><div class="timeline-grid" style="--days:${weekDays.length}">
      <div class="timeline-head">Hora</div>${weekDays.map((day) => `<div class="timeline-head">${day.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" })}</div>`).join("")}
      ${hours.map((hour) => `<div class="timeline-hour">${hourLabel(hour)}</div>${weekDays.map((day) => {
        const cycles = activeCycles.filter((cycle) => cycleOverlapsHour(cycle, day, hour));
        return `<div class="timeline-cell">${cycles.map((cycle) => `<div class="timeline-event ${cycle.type === "Lavado" ? "wash" : "dry"}"><strong>${escapeHtml(orderClient(cycle.order))}</strong><span>${escapeHtml(cycle.type)} · ${escapeHtml(cycle.machine)}</span><small>${formatDateTime(cycle.start)} → ${formatDateTime(cycle.end)}</small></div>`).join("") || `<span class="free-text">Libre</span>`}</div>`;
      }).join("")}`).join("")}
    </div></div>
    <div class="card"><h3>Máquinas</h3><div class="machine-board">${machines.map((machine) => {
      const assigned = activeCycles.filter((cycle) => cycle.machine === machine.name).slice(0, 8);
      return `<article class="machine"><h4>${escapeHtml(machine.name)}</h4><span class="badge ${machine.type === "Lavado" ? "en-lavado" : "en-secado"}">${machine.type}</span>${assigned.map((cycle) => `<div class="slot"><strong>#${escapeHtml(cycle.order.number)}</strong> ${escapeHtml(orderClient(cycle.order))}<br><small>${formatDateTime(cycle.start)} → ${formatDateTime(cycle.end)}</small></div>`).join("") || `<div class="slot">Libre</div>`}</article>`;
    }).join("")}</div></div>`;
}

function setScheduleWeek(value) {
  scheduleWeekStart = currentWeekStart(new Date(`${value}T00:00:00`)).toISOString().slice(0, 10);
  renderSchedule();
}

function moveScheduleWeek(days) {
  const next = new Date(`${scheduleWeekStart}T00:00:00`);
  next.setDate(next.getDate() + days);
  setScheduleWeek(next.toISOString().slice(0, 10));
}

function openScheduleSimulator() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  openModal("Simular demora", `<form class="form-grid">
    <label>Cliente de referencia<input name="client" value="Cliente mostrador" /></label>
    <label>Servicio<select name="serviceId">${state.services.map((service) => `<option value="${service.id}">${escapeHtml(service.name)}</option>`).join("")}</select></label>
    <label>Fecha y hora de ingreso<input name="start" type="datetime-local" value="${localNow}" /></label>
    <label class="full">Usa pedidos ya cargados y máquinas configuradas para estimar cuánto tardaría.</label>
    <button class="primary full">Calcular demora</button>
  </form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    const service = getService(data.serviceId);
    const schedule = LaundryScheduler.scheduleOrder(state.orders, service, state.settings, new Date(data.start).toISOString());
    schedulePreview = { client: data.client || "Cliente mostrador", service: service.name, start: new Date(data.start).toISOString(), end: schedule.estimate, minutes: Math.max(0, Math.round((new Date(schedule.estimate) - new Date(data.start)) / 60000)) };
    setScheduleWeek(data.start.slice(0, 10));
    closeModal();
  });
}


function renderStorage() {
  const occupied = new Map(state.orders.filter((order) => order.location && !["Retirado", "Abonado"].includes(order.status)).map((order) => [order.location, order]));
  document.getElementById("storage").innerHTML = `
    <div class="card hero-card"><div><p class="eyebrow-dark">Depósito</p><h2>Ubicaciones y aviso de guarda</h2><p>Hacé clic en una ubicación ocupada para abrir el pedido correspondiente.</p></div><button class="secondary" data-action="storageNotice">Ver aviso general</button></div>
    <div class="notice legal-note"><strong>Aviso informativo:</strong> El texto de guarda es configurable y debe comunicarse de forma clara al recibir el pedido. Validar plazo y redacción final con asesoría local.</div>
    <div class="storage-grid">${state.locations.map((location) => {
      const order = occupied.get(location.code);
      return order
        ? `<button class="location busy location-button" data-action="openStorageOrder" data-id="${order.id}"><h3>${escapeHtml(location.code)}</h3><strong>#${escapeHtml(order.number)}</strong><span>${escapeHtml(orderClient(order))}</span><small>${escapeHtml(order.status)}</small></button>`
        : `<article class="location free"><h3>${escapeHtml(location.code)}</h3>Libre</article>`;
    }).join("")}</div>`;
}

function openStorageOrder(id) {
  setView("orders");
  const input = document.getElementById("orderSearch");
  const order = getOrder(id);
  if (input && order) {
    input.value = order.number;
    filterOrders(order.number);
  }
  openOrderStatusModal(id);
}


function cashReportHtml() {
  const rows = monthlyCashSummary();
  const latest = rows.at(-1) || { income: 0, expense: 0, balance: 0, diff: null, cash: 0, transfer: 0 };
  return `
    <div class="card report-panel"><div class="toolbar"><div><p class="eyebrow-dark">Reportes de caja</p><h2>Comparación mes a mes</h2></div><span class="status-pill light">Separado de la caja diaria</span></div>
      <div class="grid four report-metrics">
        <article class="mini-metric"><span>Ingresos mes</span><strong>${money(latest.income)}</strong></article>
        <article class="mini-metric"><span>Egresos mes</span><strong>${money(latest.expense)}</strong></article>
        <article class="mini-metric"><span>Saldo mes</span><strong>${money(latest.balance)}</strong></article>
        <article class="mini-metric"><span>Vs anterior</span><strong>${latest.diff === null ? "-" : `${latest.diff}%`}</strong></article>
      </div>
      <div class="bar-list">${rows.map((row) => {
        const max = Math.max(row.income, row.expense, 1);
        return `<div class="bar-row"><div><strong>${row.month}</strong><small>Saldo ${money(row.balance)} · Efectivo ${money(row.cash)} · Transf. ${money(row.transfer)}</small></div><div class="bars"><span class="bar income" style="width:${Math.max(4, (row.income / max) * 100)}%"></span><span class="bar expense" style="width:${Math.max(4, (row.expense / max) * 100)}%"></span></div></div>`;
      }).join("") || `<p class="notice">Cargá movimientos para ver la comparación mensual.</p>`}</div>
      <div class="table-wrap"><table><thead><tr><th>Mes</th><th>Ingresos</th><th>Egresos</th><th>Saldo</th><th>Vs mes anterior</th><th>Efectivo</th><th>Transferencia</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row.month}</td><td>${money(row.income)}</td><td>${money(row.expense)}</td><td>${money(row.balance)}</td><td>${row.diff === null ? "-" : `${row.diff}%`}</td><td>${money(row.cash)}</td><td>${money(row.transfer)}</td></tr>`).join("") || `<tr><td colspan="7">Sin movimientos de caja.</td></tr>`}</tbody></table></div>
    </div>`;
}

function renderCash() {
  if (!cashUnlocked) {
    document.getElementById("cash").innerHTML = `<div class="card"><h2>Caja protegida</h2><p>Ingresá la clave del dueño para ver ingresos, egresos y saldos.</p><div class="form-grid"><label>Clave<input id="cashPin" type="password" placeholder="Clave" /></label></div><br><button class="primary" data-action="unlockCash">Entrar</button><p><small>La clave inicial es 1234 y puede cambiarse desde Configuración.</small></p></div>`;
    return;
  }
  const income = state.cash.filter((entry) => entry.type === "Ingreso").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expense = state.cash.filter((entry) => entry.type === "Egreso").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const cash = state.cash.filter((entry) => entry.method === "Efectivo").reduce((sum, entry) => sum + (entry.type === "Ingreso" ? Number(entry.amount) : -Number(entry.amount)), 0);
  const transfer = state.cash.filter((entry) => entry.method === "Transferencia").reduce((sum, entry) => sum + (entry.type === "Ingreso" ? Number(entry.amount) : -Number(entry.amount)), 0);
  document.getElementById("cash").innerHTML = `
    <div class="grid four"><article class="card metric"><span>Ingresos</span><strong>${money(income)}</strong></article><article class="card metric"><span>Egresos</span><strong>${money(expense)}</strong></article><article class="card metric"><span>Efectivo</span><strong>${money(cash)}</strong></article><article class="card metric"><span>Transferencia</span><strong>${money(transfer)}</strong></article></div>
    <div class="card"><div class="toolbar"><h2>Caja del día / movimientos</h2><div class="actions"><button class="success" data-action="cashIncome">+ Ingreso</button><button class="danger" data-action="cashExpense">+ Egreso</button></div></div>${cashTable()}</div>
    ${cashReportHtml()}`;
}

function cashTable() {
  return `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Medio</th><th>Importe</th></tr></thead><tbody>${[...state.cash].reverse().map((entry) => `<tr><td>${formatDateTime(entry.date)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.category)}</td><td>${escapeHtml(entry.description)}</td><td>${escapeHtml(entry.method)}</td><td>${money(entry.amount)}</td></tr>`).join("") || `<tr><td colspan="6">Sin movimientos.</td></tr>`}</tbody></table></div>`;
}


function renderSettings() {
  document.getElementById("settings").innerHTML = `
    <div class="card"><h2>Configuración</h2><div class="form-grid">
      <label>Apertura<input id="openHour" type="time" value="${escapeHtml(state.settings.openHour)}" /></label>
      <label>Cierre<input id="closeHour" type="time" value="${escapeHtml(state.settings.closeHour)}" /></label>
      <label>Lavarropas chicos<input id="smallWashers" type="number" min="1" value="${Number(state.settings.smallWashers)}" /></label>
      <label>Secadoras<input id="dryers" type="number" min="1" value="${Number(state.settings.dryers)}" /></label>
      <label>Minutos lavado<input id="washingMinutes" type="number" min="1" value="${Number(state.settings.washingMinutes)}" /></label>
      <label>Minutos secado<input id="dryingMinutes" type="number" min="1" value="${Number(state.settings.dryingMinutes)}" /></label>
      <label>Clave de caja<input id="cashPin" type="password" value="${escapeHtml(state.settings.cashPin)}" /></label>
      <label class="full">WhatsApp pedido recibido<textarea id="whatsappReceivedMessage">${escapeHtml(state.settings.whatsappReceivedMessage)}</textarea></label>
      <label class="full">WhatsApp pedido en proceso<textarea id="whatsappWorkingMessage">${escapeHtml(state.settings.whatsappWorkingMessage)}</textarea></label>
      <label class="full">WhatsApp pedido listo<textarea id="whatsappMessage">${escapeHtml(state.settings.whatsappMessage)}</textarea></label>
      <label class="full">WhatsApp retirado<textarea id="whatsappRetiredMessage">${escapeHtml(state.settings.whatsappRetiredMessage)}</textarea></label>
      <label class="full">WhatsApp retirado y abonado<textarea id="whatsappRetiredPaidMessage">${escapeHtml(state.settings.whatsappRetiredPaidMessage)}</textarea></label>
      <label>Días para aviso depósito<input id="storageNoticeDays" type="number" min="1" value="${Number(state.settings.storageNoticeDays)}" /></label>
      <label class="full">Cartel de depósito<textarea id="storageNoticeText">${escapeHtml(state.settings.storageNoticeText)}</textarea></label>
    </div><br><div class="actions"><button class="primary" data-action="saveSettings">Guardar</button><button class="danger" data-action="resetDemo">Reiniciar demo</button></div></div>`;
}


function openModal(title, html, onSubmit) {
  const template = document.getElementById("modalTemplate").content.cloneNode(true);
  template.querySelector("h2").textContent = title;
  template.querySelector(".modal-body").innerHTML = html;
  document.body.appendChild(template);
  const modal = document.querySelector(".modal-backdrop");
  const form = modal.querySelector("form");
  if (form) form.addEventListener("submit", (event) => { event.preventDefault(); onSubmit?.(new FormData(form)); });
  return modal;
}

function closeModal() {
  document.querySelector(".modal-backdrop")?.remove();
}

function openClientModal(id) {
  const client = id ? getClient(id) : { name: "", phone: "", address: "", notes: "", authorizedPickups: "" };
  openModal(id ? "Editar cliente" : "Nuevo cliente", `<form class="form-grid"><label>Nombre<input name="name" required value="${escapeHtml(client.name)}" /></label><label>Teléfono WhatsApp<input name="phone" required value="${escapeHtml(client.phone)}" /></label><label>Dirección<input name="address" value="${escapeHtml(client.address || "")}" /></label><label>Autorizados a retirar<input name="authorizedPickups" placeholder="Ej: hijo Juan DNI..." value="${escapeHtml(client.authorizedPickups || "")}" /></label><label class="full">Notas<input name="notes" value="${escapeHtml(client.notes || "")}" /></label><button class="primary full">Guardar cliente</button></form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    if (id) Object.assign(client, data); else state.clients.push({ id: nextId(state.clients), ...data });
    saveState(); closeModal(); render();
  });
}


function openOrderModal() {
  const modal = openModal("Nuevo pedido", `<form class="form-grid">
    <label>Cliente<select name="clientId" required>${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} · ${escapeHtml(client.phone)}</option>`).join("")}</select></label>
    <label>Servicio<select name="serviceId" data-service-select required>${state.services.map((service) => `<option value="${service.id}" data-price="${service.price}">${escapeHtml(service.name)} · ${money(service.price)}</option>`).join("")}</select></label>
    <label>Cantidad de valets<input name="valets" type="number" min="0" value="1" /></label>
    <label>Paquetes / bolsas<input name="packages" type="number" min="1" value="1" /></label>
    <label>Precio total<input name="total" type="number" min="0" value="${state.services[0]?.price || 0}" /></label>
    <label>Ubicación depósito<select name="location"><option value="">Asignar luego</option>${availableLocations().map((location) => `<option>${escapeHtml(location.code)}</option>`).join("")}</select></label>
    <label>Pago<select name="paymentStatus"><option>Pendiente</option><option>Abonado</option></select></label>
    <label>Medio de pago<select name="paymentMethod"><option>Efectivo</option><option>Transferencia</option></select></label>
    <label class="full">Observaciones<textarea name="notes" placeholder="Prendas delicadas, manchas, indicaciones..."></textarea></label>
    <button class="primary full">Crear pedido</button>
  </form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    const createdAt = new Date().toISOString();
    const service = getService(data.serviceId);
    const schedule = createOrderSchedule(service, createdAt);
    const order = { id: nextId(state.orders), number: nextOrderNumber(), clientId: Number(data.clientId), serviceId: Number(data.serviceId), createdAt, estimate: schedule.estimate, cycles: schedule.cycles, status: "Recibido", valets: Number(data.valets), packages: Number(data.packages), total: Number(data.total), location: data.location, notes: data.notes, paymentStatus: data.paymentStatus, paymentMethod: data.paymentMethod };
    state.orders.push(order);
    if (order.paymentStatus === "Abonado") syncOrderPayment(order);
    saveState(); closeModal(); setView("orders");
  });
  modal.querySelector("[data-service-select]")?.dispatchEvent(new Event("change", { bubbles: true }));
}

function syncOrderPayment(order) {
  const existing = state.cash.find((entry) => entry.orderId === order.id && entry.category === "Pedido");
  if (order.paymentStatus !== "Abonado") {
    state.cash = state.cash.filter((entry) => !(entry.orderId === order.id && entry.category === "Pedido"));
    return;
  }

  const payment = { type: "Ingreso", category: "Pedido", description: `Cobro pedido #${order.number}`, method: order.paymentMethod || "Efectivo", amount: order.total, orderId: order.id };
  if (existing) Object.assign(existing, payment);
  else state.cash.push({ id: nextId(state.cash), date: new Date().toISOString(), ...payment });
}

function openOrderStatusModal(id) {
  const order = getOrder(id);
  if (!order) return;
  const locations = availableLocations(order.id);
  if (order.location && !locations.some((location) => location.code === order.location)) locations.unshift({ id: 0, code: order.location });

  openModal(`Editar pedido #${escapeHtml(order.number)}`, `<form class="form-grid">
    <label>Estado<select name="status">${STATES.map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
    <label>Ubicación depósito<select name="location"><option value="">Sin asignar</option>${locations.map((location) => `<option ${location.code === order.location ? "selected" : ""}>${escapeHtml(location.code)}</option>`).join("")}</select></label>
    <label>Pago<select name="paymentStatus"><option ${order.paymentStatus !== "Abonado" ? "selected" : ""}>Pendiente</option><option ${order.paymentStatus === "Abonado" ? "selected" : ""}>Abonado</option></select></label>
    <label>Medio de pago<select name="paymentMethod"><option ${order.paymentMethod !== "Transferencia" ? "selected" : ""}>Efectivo</option><option ${order.paymentMethod === "Transferencia" ? "selected" : ""}>Transferencia</option></select></label>
    <label>Precio total<input name="total" type="number" min="0" value="${Number(order.total || 0)}" /></label>
    <label class="full">Observaciones<textarea name="notes">${escapeHtml(order.notes || "")}</textarea></label>
    <button class="primary full">Guardar cambios</button>
  </form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    order.status = data.status;
    order.location = ["Retirado", "Abonado"].includes(order.status) ? "" : data.location;
    order.paymentStatus = data.paymentStatus;
    order.paymentMethod = data.paymentMethod;
    order.total = Number(data.total);
    order.notes = data.notes;
    if (order.paymentStatus === "Abonado" || order.status === "Abonado") order.paymentStatus = "Abonado";
    syncOrderPayment(order);
    saveState(); closeModal(); render();
  });
}

function storageNoticeText(order = null) {
  const base = state.settings.storageNoticeText.replaceAll("{dias}", state.settings.storageNoticeDays);
  if (!order) return base;
  return `${base}\n\nPedido #${order.number} - Cliente: ${orderClient(order)} - Ubicación: ${order.location || "sin asignar"}.`;
}

function sendWhatsapp(id, type) {
  const order = getOrder(id);
  const phone = (getClient(order.clientId)?.phone || "").replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageForOrder(order, type))}`, "_blank");
}

function openWhatsappMenu(id) {
  const order = getOrder(id);
  if (!order) return;
  openModal(`Mensajes WhatsApp #${escapeHtml(order.number)}`, `
    <div class="message-list">
      <button class="secondary" data-action="sendWhatsapp" data-message-type="received" data-id="${order.id}">Avisar recibido</button>
      <button class="secondary" data-action="sendWhatsapp" data-message-type="working" data-id="${order.id}">Avisar en proceso</button>
      <button class="success" data-action="sendWhatsapp" data-message-type="ready" data-id="${order.id}">Avisar que está listo</button>
      <button class="secondary" data-action="sendWhatsapp" data-message-type="retired" data-id="${order.id}">Constancia de retirado</button>
      <button class="secondary" data-action="sendWhatsapp" data-message-type="retiredPaid" data-id="${order.id}">Constancia retirado y abonado</button>
      <div class="copy-row"><button class="secondary" data-action="copyWhatsapp" data-message-type="received" data-id="${order.id}">Copiar recibido</button><button class="secondary" data-action="copyWhatsapp" data-message-type="working" data-id="${order.id}">Copiar en proceso</button><button class="secondary" data-action="copyWhatsapp" data-message-type="ready" data-id="${order.id}">Copiar listo</button></div>
      <textarea readonly>${escapeHtml(messageForOrder(order, "ready"))}</textarea>
    </div>`);
}

function copyWhatsapp(id, type = "ready") {
  const text = messageForOrder(getOrder(id), type);
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  else prompt("Copiá el mensaje para WhatsApp", text);
  alert("Mensaje preparado para enviar manualmente por WhatsApp.");
}

function openStorageNoticeModal(id) {
  const order = id ? getOrder(id) : null;
  const text = storageNoticeText(order);
  openModal(order ? `Cartel depósito #${escapeHtml(order.number)}` : "Cartel general de depósito", `
    <div class="notice legal-note">Usar como aviso comercial/condición informada. Revisar con asesoría legal local antes de imprimir o enviar.</div>
    <textarea class="notice-text" readonly>${escapeHtml(text)}</textarea>
    <div class="actions"><button class="primary" data-action="copyNotice">Copiar cartel</button>${order ? `<button class="success" data-action="sendStorageNotice" data-id="${order.id}">Enviar al cliente</button>` : ""}</div>`);
}

function copyVisibleNotice() {
  const text = document.querySelector(".notice-text")?.value || "";
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  else prompt("Copiá el cartel", text);
  alert("Cartel copiado/preparado.");
}

function sendStorageNotice(id) {
  const order = getOrder(id);
  const phone = (getClient(order.clientId)?.phone || "").replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(storageNoticeText(order))}`, "_blank");
}

function unlockCash() {
  cashUnlocked = document.getElementById("cashPin").value === state.settings.cashPin;
  if (!cashUnlocked) alert("Clave incorrecta");
  render();
}

function openCashModal(type) {
  const categories = type === "Ingreso" ? ["Pedido", "Seña", "Otro"] : ["Agua", "Luz", "Gas", "Insumos", "Alquiler", "Otros servicios"];
  openModal(`${type} de caja`, `<form class="form-grid"><label>Categoría<select name="category">${categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}</select></label><label>Medio<select name="method"><option>Efectivo</option><option>Transferencia</option></select></label><label>Importe<input name="amount" type="number" min="0" required /></label><label>Descripción<input name="description" required /></label><button class="primary full">Guardar ${type.toLowerCase()}</button></form>`, (form) => {
    state.cash.push({ id: nextId(state.cash), type, date: new Date().toISOString(), ...Object.fromEntries(form.entries()) });
    saveState(); closeModal(); render();
  });
}


function saveSettings() {
  ["openHour", "closeHour", "whatsappReceivedMessage", "whatsappWorkingMessage", "whatsappMessage", "whatsappRetiredMessage", "whatsappRetiredPaidMessage", "storageNoticeText", "cashPin"].forEach((key) => state.settings[key] = document.getElementById(key).value);
  ["smallWashers", "dryers", "washingMinutes", "dryingMinutes", "storageNoticeDays"].forEach((key) => state.settings[key] = Number(document.getElementById(key).value));
  saveState(); render();
}

function resetDemo() {
  if (!confirm("¿Reiniciar datos de demostración?")) return;
  state = structuredClone(defaultData);
  cashUnlocked = false;
  saveState(); render();
}

render();
