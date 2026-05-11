window.addEventListener("error", (event) => {
  const root = document.querySelector(".content");
  if (!root) return;
  root.innerHTML = `<section class="view active"><div class="card"><h2>No se pudo iniciar el sistema</h2><p>Probá actualizar el navegador o abrir el sistema con <code>python3 -m http.server 8080</code>.</p><p><strong>Detalle:</strong> ${event.message}</p></div></section>`;
});

const STORAGE_KEY = "lavanderia-local-v1";
const STATES = ["Pendiente", "Listo", "Retirado"];
const defaultData = {
  settings: {
    openHour: "09:00",
    closeHour: "19:00",
    washingMinutes: 30,
    dryingMinutes: 50,
    smallWashers: 4,
    dryers: 6,
    whatsappReceivedMessage: "Hola {cliente}. Recibimos tu pedido {pedido}. {pago}. Te avisamos cuando esté listo. Gracias.",
    whatsappMessage: "Hola {cliente}. Tu pedido {pedido} ya está listo para retirar. {pago}. Te esperamos.",
    whatsappRetiredMessage: "Hola {cliente}. Dejamos constancia de que retiró su pedido {pedido} el {fecha}. {pago}. Muchas gracias.",
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
  locations: flatten(["A", "B", "C", "D", "E", "F"].map((row) => Array.from({ length: 6 }, (_, index) => `${row}${index + 1}`))).map((code, index) => ({ id: index + 1, code })),
};

function cloneData(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn("No se pudo clonar la información inicial", error);
    return value;
  }
}

function safeReplaceAll(value, search, replacement) {
  return String(value).split(search).join(replacement);
}

function flatten(list) {
  return Array.prototype.concat.apply([], list);
}

let state = loadState();
let currentView = "dashboard";
let cashUnlocked = false;
let selectedMachine = null;
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
  const defaults = cloneData(defaultData);
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
    services: parsed.services && parsed.services.length ? parsed.services : defaults.services,
    clients: parsed.clients && parsed.clients.length ? parsed.clients : defaults.clients,
    orders: parsed.orders || defaults.orders,
    cash: parsed.cash || defaults.cash,
    locations: mergeLocations(defaults.locations, parsed.locations),
  };

  merged.clients = merged.clients.map((client) => ({ authorizedPickups: "", ...client }));

  merged.orders = merged.orders.map((order) => {
    const paymentStatus = order.paymentStatus || (order.status === "Abonado" ? "Abonado" : "Pendiente");
    const status = ["Retirado", "Abonado"].includes(order.status) ? "Retirado" : order.status === "Listo para retirar" ? "Listo" : ["Pendiente", "Listo", "Retirado"].includes(order.status) ? order.status : "Pendiente";
    const items = order.items && order.items.length ? order.items : [{ name: serviceSummary(order), serviceId: order.serviceId, price: Number(order.total || 0) }];
    return { ...order, status, paymentStatus, paymentMethod: order.paymentMethod || "Efectivo", cycles: order.cycles || [], items };
  });

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
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "-");
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
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function availableLocations(currentOrderId = null) {
  const busy = new Set(
    state.orders
      .filter((order) => order.id !== Number(currentOrderId) && order.location && order.status !== "Retirado")
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
    ready: state.settings.whatsappMessage,
    retired: state.settings.whatsappRetiredMessage,
  };
  const isPaid = order.paymentStatus === "Abonado";
  const unpaidText = type === "ready" ? `Para retirar, el total a pagar es ${money(order.total)}.` : `Queda pendiente de pago ${money(order.total)}.`;
  const paymentText = isPaid ? `Ya figura pago por ${order.paymentMethod || "medio registrado"}.` : unpaidText;
  return safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(templates[type], "{cliente}", orderClient(order)), "{pedido}", order.number || order.location || ""), "{fecha}", formatDateTime(new Date().toISOString())), "{estimado}", formatDateTime(order.estimate)), "{pago}", paymentText), "{total}", money(order.total));
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
  renderCashReports();
  renderSettings();
}

function setView(view) {
  if (view === "cash") cashUnlocked = false;
  currentView = view;
  render();
}

document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  const handlers = {
    newOrder: openOrderModal,
    newClient: openClientModal,
    editClient: () => openClientModal(id),
    editOrderStatus: () => openOrderEditModal(id),
    orderState: () => openOrderStateModal(id),
    dashboardTab: () => setDashboardTab(target.dataset.tab),
    clearOrderDate: clearOrderDate,
    whatsapp: () => openWhatsappMenu(id),
    storageNotice: () => openStorageNoticeModal(id),
    openStorageOrder: () => openStorageOrder(id),
    prevWeek: () => moveScheduleWeek(-7),
    nextWeek: () => moveScheduleWeek(7),
    todayWeek: () => setScheduleWeek(currentWeekStart(new Date()).toISOString().slice(0, 10)),

    sendWhatsapp: () => sendWhatsapp(id, target.dataset.messageType),
    copyNotice: copyVisibleNotice,
    sendStorageNotice: () => sendStorageNotice(id),
    machineEdit: () => openMachineModal(target.dataset.machine),
    cashIncome: () => openCashModal("Ingreso"),
    cashExpense: () => openCashModal("Egreso"),
    unlockCash: unlockCash,
    saveSettings: saveSettings,
    resetDemo: resetDemo,
  };
  if (handlers[action]) handlers[action]();
});

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal]")) closeModal();
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-search-orders], [data-order-date]")) applyOrderFilters();
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-schedule-week]")) {
    setScheduleWeek(event.target.value);
    return;
  }
  if (!event.target.matches("[data-service-select]")) return;
  const selected = event.target.selectedOptions[0];
  const form = event.target.closest("form");
  const priceInput = form ? form.querySelector("[name='total']") : null;
  if (priceInput && selected && selected.dataset.price) priceInput.value = selected.dataset.price;
});

function orderDisplayCode(order) {
  return order.location ? `${order.location}-#${String(order.id).padStart(4, "0")}` : `Sin depósito-#${String(order.id).padStart(4, "0")}`;
}

function itemSummary(order) {
  return (order.items || []).map((item) => `${item.name} (${money(item.price)})`).join(" · ") || serviceSummary(order);
}

function paymentBadge(order) {
  const status = order.paymentStatus || "Pendiente";
  return `<span class="payment-badge ${status === "Abonado" ? "paid" : "due"}">${status === "Abonado" ? "✅ Abonado" : "🟠 Pendiente"}</span>`;
}

function paymentMethodLabel(method) {
  return method === "Transferencia" ? "🏦 Transferencia" : "💵 Efectivo";
}

function nextFreeLocation() {
  return (availableLocations()[0] && availableLocations()[0].code) || "";
}

let dashboardTab = "Pendiente";

function orderGroup(order) {
  if (order.status === "Retirado") return "Retirado";
  if (order.status === "Listo") return "Listo";
  return "Pendiente";
}

function ordersByGroup(group) {
  return state.orders.filter((order) => orderGroup(order) === group).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function setDashboardTab(tab) {
  dashboardTab = tab;
  renderDashboard();
}

function localDateInput(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function clearOrderDate() {
  const input = document.getElementById("orderDateFilter");
  if (input) input.value = "";
  applyOrderFilters();
}

function applyOrderFilters() {
  const query = (document.getElementById("orderSearch") && document.getElementById("orderSearch").value) || "";
  const date = (document.getElementById("orderDateFilter") && document.getElementById("orderDateFilter").value) || "";
  filterOrders(query, date);
}

function renderDashboard() {
  const groups = ["Pendiente", "Listo", "Retirado"];
  const selectedOrders = ordersByGroup(dashboardTab);
  document.getElementById("dashboard").innerHTML = `
    <div class="simple-home">
      <div class="home-actions"><button class="primary big-action" data-action="newOrder">+ Nuevo pedido</button><button class="secondary big-action" data-action="newClient">+ Nuevo cliente</button></div>
      <div class="tabs">${groups.map((group) => `<button class="tab-button ${dashboardTab === group ? "active" : ""}" data-action="dashboardTab" data-tab="${group}">${group}<strong>${ordersByGroup(group).length}</strong></button>`).join("")}</div>
      ${orderCards(selectedOrders, `Pedidos ${dashboardTab.toLowerCase()}s`, true)}
    </div>`;
}

function renderOrders() {
  const today = localDateInput();
  document.getElementById("orders").innerHTML = `
    <div class="card section-card">
      <div class="toolbar"><div><p class="eyebrow-dark">Operación</p><h2>Pedidos</h2></div><button class="primary" data-action="newOrder">+ Nuevo pedido</button></div>
      <div class="filters-row"><input id="orderSearch" data-search-orders placeholder="Buscar por depósito, cliente, teléfono, estado u observaciones" /><label>Fecha<input id="orderDateFilter" data-order-date type="date" value="${today}" /></label><button class="secondary" data-action="clearOrderDate">Ver todos</button></div>
    </div>
    <div id="ordersTable">${orderCards(state.orders.filter((order) => dateKey(order.createdAt) === today).reverse(), "Pedidos del día", false)}</div>
  `;
}

window.filterOrders = (query, date = "") => {
  const q = query.toLowerCase();
  const filtered = state.orders.filter((order) => {
    const matchesQuery = `${order.number} ${order.location || ""} ${orderClient(order)} ${getClient(order.clientId)?.phone || ""} ${order.status} ${order.notes || ""}`.toLowerCase().includes(q);
    const matchesDate = !date || dateKey(order.createdAt) === date;
    return matchesQuery && matchesDate;
  });
  document.getElementById("ordersTable").innerHTML = orderCards(filtered.reverse(), date ? "Pedidos filtrados" : "Todos los pedidos", false);
};

function orderCards(orders, title, compact = false) {
  return `
    <div class="card orders-panel">
      <h2>${escapeHtml(title)}</h2>
      <div class="order-card-list">${orders.map((order) => `
        <article class="order-card ${normalizeClass(orderGroup(order))}">
          <div class="order-main"><strong class="order-code">${escapeHtml(orderDisplayCode(order))}</strong><span class="badge ${normalizeClass(orderGroup(order))}">${escapeHtml(orderGroup(order))}</span></div>
          <div><strong>${escapeHtml(orderClient(order))}</strong><br><small>${escapeHtml(itemSummary(order))} · ${formatDateTime(order.estimate)}</small></div>
          <p class="order-notes">${escapeHtml(order.notes || "Sin observaciones")}</p>
          <div class="order-meta"><span>Pago: ${paymentBadge(order)} ${paymentMethodLabel(order.paymentMethod)}</span><span>Total: ${money(order.total)}</span></div>
          <div class="actions"><button class="secondary" data-action="orderState" data-id="${order.id}">Estado</button><button class="secondary" data-action="editOrderStatus" data-id="${order.id}">Editar</button><button class="success" data-action="whatsapp" data-id="${order.id}">WhatsApp</button></div>
        </article>`).join("") || `<p>No hay pedidos para mostrar.</p>`}</div>
    </div>`;
}

function ordersTable(orders, title) {
  return orderCards(orders, title, false);
}

function renderClients() {
  document.getElementById("clients").innerHTML = `
    <div class="card section-card">
      <div class="toolbar"><div><p class="eyebrow-dark">Personas</p><h2>Clientes</h2></div><button class="primary" data-action="newClient">+ Nuevo cliente</button></div>
      <div class="client-card-grid">${state.clients.map((client) => `<article class="client-card"><div class="client-avatar">👤</div><h3>${escapeHtml(client.name)}</h3><p><strong>Tel:</strong> ${escapeHtml(client.phone)}</p><p><strong>Retira:</strong> ${escapeHtml(client.authorizedPickups || "Solo titular")}</p><p><strong>Notas:</strong> ${escapeHtml(client.notes || "-")}</p><button class="secondary" data-action="editClient" data-id="${client.id}">Editar cliente</button></article>`).join("")}</div>
    </div>`;
}


function renderSchedule() {
  const machines = [
    ...LaundryScheduler.machineNames("Lavado", state.settings.smallWashers).map((name) => ({ type: "Lavado", name })),
    ...LaundryScheduler.machineNames("Secado", state.settings.dryers).map((name) => ({ type: "Secado", name })),
  ];
  const activeCycles = state.orders
    .filter((order) => order.status !== "Retirado")
    .reduce((list, order) => list.concat((order.cycles || []).map((cycle) => ({ ...cycle, order }))), [])
    .filter((cycle) => cycle.type !== "Preparación")
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const weekDays = currentWeekDays(new Date(`${scheduleWeekStart}T00:00:00`));
  const openHour = Number(state.settings.openHour.split(":")[0]);
  const closeHour = Number(state.settings.closeHour.split(":")[0]);
  const hours = Array.from({ length: Math.max(1, closeHour - openHour) }, (_, index) => openHour + index);
  const washDryMinutes = Number(state.settings.washingMinutes) + Number(state.settings.dryingMinutes);
  const preview = "";

  document.getElementById("schedule").innerHTML = `
    <div class="card hero-card"><div><p class="eyebrow-dark">Turnero</p><h2>Agenda grande por hora</h2><p>Mostrando semana desde <strong>${weekDays[0].toLocaleDateString("es-AR")}</strong>. Un valet lavado + secado ocupa aprox. <strong>${washDryMinutes} minutos</strong>, pero la estimación real depende de máquinas libres.</p></div><div class="status-pill light">${state.settings.smallWashers} lavarropas · ${state.settings.dryers} secadoras</div></div>
    <div class="card schedule-controls"><button class="secondary" data-action="prevWeek">←</button><label>Semana<input class="week-input" type="date" data-schedule-week value="${scheduleWeekStart}" /></label><button class="secondary" data-action="todayWeek">Hoy</button><button class="secondary" data-action="nextWeek">→</button>${preview}</div>
    <div class="card schedule-card"><h3>Semana seleccionada</h3><div class="timeline-grid" style="--days:${weekDays.length}">
      <div class="timeline-head">Hora</div>${weekDays.map((day) => `<div class="timeline-head">${day.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" })}</div>`).join("")}
      ${hours.map((hour) => `<div class="timeline-hour">${hourLabel(hour)}</div>${weekDays.map((day) => {
        const cycles = activeCycles.filter((cycle) => cycleOverlapsHour(cycle, day, hour));
        return `<div class="timeline-cell">${cycles.map((cycle) => `<div class="timeline-event ${cycle.type === "Lavado" ? "wash" : "dry"}"><strong>${escapeHtml(orderClient(cycle.order))}</strong><span>${escapeHtml(cycle.type)} · ${escapeHtml(cycle.machine)}</span><small>${formatDateTime(cycle.start)} → ${formatDateTime(cycle.end)}</small></div>`).join("") || `<span class="free-text">Libre</span>`}</div>`;
      }).join("")}`).join("")}
    </div></div>
    <div class="card"><h3 class="machine-section-title">Lavarropas</h3>${machineBoard(machines.filter((machine) => machine.type === "Lavado"), activeCycles)}<h3 class="machine-section-title">Secadoras</h3>${machineBoard(machines.filter((machine) => machine.type === "Secado"), activeCycles)}</div>`;
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

function machineBoard(machines, activeCycles) {
  return `<div class="machine-board">${machines.map((machine) => {
    const assigned = activeCycles.filter((cycle) => cycle.machine === machine.name).slice(0, 8);
    return `<button class="machine machine-click type-${normalizeClass(machine.type)} ${assigned.length ? "occupied" : "free-machine"}" data-action="machineEdit" data-machine="${escapeHtml(machine.name)}"><h4>${escapeHtml(machine.name)}</h4><span class="badge ${assigned.length ? "blocked" : "free-machine-badge"}">${assigned.length ? "Ocupada" : "Libre"}</span>${assigned.map((cycle) => `<div class="slot"><strong>${escapeHtml(orderDisplayCode(cycle.order))}</strong><br><span>${escapeHtml(orderClient(cycle.order))}</span></div>`).join("") || `<div class="slot">Disponible</div>`}</button>`;
  }).join("")}</div>`;
}

function openMachineModal(machineName) {
  selectedMachine = machineName;
  const assigned = state.orders
    .filter((order) => order.status !== "Retirado")
    .reduce((list, order) => list.concat((order.cycles || []).map((cycle) => ({ ...cycle, order }))), [])
    .filter((cycle) => cycle.machine === machineName)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  openModal(`Máquina ${escapeHtml(machineName)}`, `
    <div class="machine-modal-list">${assigned.map((cycle) => `<button class="slot machine-slot" data-action="openStorageOrder" data-id="${cycle.order.id}"><strong>${escapeHtml(orderDisplayCode(cycle.order))}</strong>${escapeHtml(orderClient(cycle.order))}<small>${formatDateTime(cycle.start)} → ${formatDateTime(cycle.end)}</small></button>`).join("") || `<p>Máquina libre. No hay pedidos asignados.</p>`}</div>`);
}

function renderStorage() {
  const occupied = new Map(state.orders.filter((order) => order.location && order.status !== "Retirado").map((order) => [order.location, order]));
  document.getElementById("storage").innerHTML = `
    <div class="card hero-card"><div><p class="eyebrow-dark">Depósito</p><h2>Ubicaciones y aviso de guarda</h2><p>Hacé clic en una ubicación ocupada para abrir el pedido correspondiente.</p></div><button class="secondary" data-action="storageNotice">Ver aviso general</button></div>
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
  openOrderEditModal(id);
}


function cashReportHtml() {
  const rows = monthlyCashSummary();
  const latest = rows[rows.length - 1] || { income: 0, expense: 0, balance: 0, diff: null, cash: 0, transfer: 0 };
  return `
    <div class="card report-panel cash-report-section"><div class="toolbar"><div><p class="eyebrow-dark">Reportes de caja</p><h2>Comparación mes a mes</h2></div><span class="status-pill light">Separado de la caja diaria</span></div>
      <div class="grid four report-metrics">
        <article class="mini-metric"><span>Ingresos mes</span><strong>${money(latest.income)}</strong></article>
        <article class="mini-metric"><span>Egresos mes</span><strong>${money(latest.expense)}</strong></article>
        <article class="mini-metric"><span>Saldo mes</span><strong>${money(latest.balance)}</strong></article>
        <article class="mini-metric"><span>Vs anterior</span><strong>${latest.diff === null ? "-" : `${latest.diff}%`}</strong></article>
      </div>
      <div class="bar-list">${rows.map((row) => {
        const max = Math.max(row.income, row.expense, 1);
        return `<div class="bar-row"><div><strong>${row.month}</strong><small>Saldo ${money(row.balance)} · Efectivo ${money(row.cash)} · Transf. ${money(row.transfer)}</small></div><div class="bars"><span class="bar income" style="width:${Math.max(4, (row.income / max) * 100)}%"></span><span class="bar expense" style="width:${Math.max(4, (row.expense / max) * 100)}%"></span></div></div>`;
      }).join("") || `<p>Cargá movimientos para ver la comparación mensual.</p>`}</div>
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
    <div class="card cash-section"><div class="toolbar"><h2>Caja del día / movimientos</h2><div class="actions"><button class="success" data-action="cashIncome">+ Ingreso</button><button class="danger" data-action="cashExpense">+ Egreso</button></div></div>${cashTable()}</div>`;
}

function cashTable() {
  return `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Medio</th><th>Importe</th></tr></thead><tbody>${[...state.cash].reverse().map((entry) => `<tr><td>${formatDateTime(entry.date)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.category)}</td><td>${escapeHtml(entry.description)}</td><td>${paymentMethodLabel(entry.method)}</td><td>${money(entry.amount)}</td></tr>`).join("") || `<tr><td colspan="6">Sin movimientos.</td></tr>`}</tbody></table></div>`;
}

function renderCashReports() {
  document.getElementById("cashReports").innerHTML = cashReportHtml();
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
      <label class="full">WhatsApp pedido listo<textarea id="whatsappMessage">${escapeHtml(state.settings.whatsappMessage)}</textarea></label>
      <label class="full">WhatsApp retirado<textarea id="whatsappRetiredMessage">${escapeHtml(state.settings.whatsappRetiredMessage)}</textarea></label>
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
  if (form) form.addEventListener("submit", (event) => { event.preventDefault(); if (onSubmit) onSubmit(new FormData(form)); });
  return modal;
}

function closeModal() {
  const modal = document.querySelector(".modal-backdrop"); if (modal) modal.remove();
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
  const defaultLocation = nextFreeLocation();
  const firstService = state.services[0];
  const modal = openModal("Nuevo pedido", `<form class="form-grid">
    <label>Cliente<select name="clientId" required>${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} · ${escapeHtml(client.phone)}</option>`).join("")}</select></label>
    <label>Depósito<select name="location" required>${availableLocations().map((location) => `<option ${location.code === defaultLocation ? "selected" : ""}>${escapeHtml(location.code)}</option>`).join("")}</select></label>
    <label>Pago<select name="paymentStatus"><option>Pendiente</option><option>Abonado</option></select></label>
    <label>Medio de pago<select name="paymentMethod"><option value="Efectivo">💵 Efectivo</option><option value="Transferencia">🏦 Transferencia</option></select></label>
    <div class="full items-builder"><h3>Prendas / trabajos</h3><div data-items-list>
      ${orderItemRow((firstService && firstService.id) || 1, (firstService && firstService.price) || 0, "")}
    </div><button class="secondary" type="button" data-add-item>+ Agregar prenda</button></div>
    <label>Precio total<input name="total" data-items-total type="number" min="0" value="${(firstService && firstService.price) || 0}" /></label>
    <label class="full">Observaciones<textarea name="notes" placeholder="Ej: Frasada polar roja, manchas, preferencias..."></textarea></label>
    <button class="primary full">Crear pedido</button>
  </form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    const createdAt = new Date().toISOString();
    const items = collectItems(form);
    const primaryService = getService((items[0] && items[0].serviceId) || (firstService && firstService.id));
    const schedule = createOrderSchedule(primaryService, createdAt);
    const orderId = nextId(state.orders);
    const location = data.location || nextFreeLocation();
    const total = Number(data.total || items.reduce((sum, item) => sum + Number(item.price || 0), 0));
    const order = { id: orderId, number: `${location}-#${String(orderId).padStart(4, "0")}`, clientId: Number(data.clientId), serviceId: Number(primaryService.id), createdAt, estimate: schedule.estimate, cycles: schedule.cycles, status: "Pendiente", items, total, location, notes: data.notes, paymentStatus: data.paymentStatus, paymentMethod: data.paymentMethod };
    state.orders.push(order);
    if (order.paymentStatus === "Abonado") syncOrderPayment(order);
    saveState(); closeModal(); setView("orders");
  });
  attachItemBuilder(modal);
}

function orderItemRow(serviceId, price, name = "") {
  return `<div class="item-row"><input name="itemName" placeholder="Ej: Frasada polar roja" value="${escapeHtml(name)}" /><select name="itemService">${state.services.map((service) => `<option value="${service.id}" data-price="${service.price}" ${Number(service.id) === Number(serviceId) ? "selected" : ""}>${escapeHtml(service.name)}</option>`).join("")}</select><input name="itemPrice" type="number" min="0" value="${Number(price || 0)}" /><button class="danger" type="button" data-remove-item>×</button></div>`;
}

function attachItemBuilder(modal) {
  const list = modal.querySelector("[data-items-list]");
  const recalc = () => {
    const total = Array.from(modal.querySelectorAll('[name="itemPrice"]')).reduce((sum, input) => sum + Number(input.value || 0), 0);
    modal.querySelector("[data-items-total]").value = total;
  };
  modal.addEventListener("click", (event) => {
    if (event.target.matches("[data-add-item]")) { list.insertAdjacentHTML("beforeend", orderItemRow(state.services[0].id, state.services[0].price)); recalc(); }
    if (event.target.matches("[data-remove-item]")) { { const row = event.target.closest(".item-row"); if (row) row.remove(); } recalc(); }
  });
  modal.addEventListener("change", (event) => {
    if (event.target.matches('[name="itemService"]')) {
      const price = (event.target.selectedOptions[0] && event.target.selectedOptions[0].dataset.price) || 0;
      event.target.closest(".item-row").querySelector('[name="itemPrice"]').value = price;
      recalc();
    }
  });
  modal.addEventListener("input", (event) => { if (event.target.matches('[name="itemPrice"]')) recalc(); });
}

function collectItems(form) {
  const rows = Array.from(form.querySelectorAll(".item-row"));
  return rows.map((row) => {
    const serviceId = Number(row.querySelector('[name="itemService"]').value);
    const service = getService(serviceId);
    return { name: row.querySelector('[name="itemName"]').value || service.name, serviceId, serviceName: service.name, price: Number(row.querySelector('[name="itemPrice"]').value || 0) };
  }).filter((item) => item.name || item.price);
}

function syncOrderPayment(order) {
  const existing = state.cash.find((entry) => entry.orderId === order.id && entry.category === "Pedido");
  if (order.paymentStatus !== "Abonado") {
    state.cash = state.cash.filter((entry) => !(entry.orderId === order.id && entry.category === "Pedido"));
    order.paymentSynced = false;
    return;
  }

  const payment = { type: "Ingreso", category: "Pedido", description: `${orderClient(order)} ${orderDisplayCode(order)}`, method: order.paymentMethod || "Efectivo", amount: order.total, orderId: order.id };
  if (existing) Object.assign(existing, payment);
  else state.cash.push({ id: nextId(state.cash), date: new Date().toISOString(), ...payment });
  order.paymentSynced = true;
}

function openOrderEditModal(id) {
  const order = getOrder(id);
  if (!order) return;
  const locations = availableLocations(order.id);
  if (order.location && !locations.some((location) => location.code === order.location)) locations.unshift({ id: 0, code: order.location });

  openModal(`Editar pedido ${escapeHtml(order.number)}`, `<form class="form-grid">
    <label>Depósito / número<select name="location"><option value="">Sin asignar</option>${locations.map((location) => `<option ${location.code === order.location ? "selected" : ""}>${escapeHtml(location.code)}</option>`).join("")}</select></label>
    <label>Pago<select name="paymentStatus"><option ${order.paymentStatus !== "Abonado" ? "selected" : ""}>Pendiente</option><option ${order.paymentStatus === "Abonado" ? "selected" : ""}>Abonado</option></select></label>
    <label>Medio de pago<select name="paymentMethod"><option value="Efectivo" ${order.paymentMethod !== "Transferencia" ? "selected" : ""}>💵 Efectivo</option><option value="Transferencia" ${order.paymentMethod === "Transferencia" ? "selected" : ""}>🏦 Transferencia</option></select></label>
    <label>Precio total<input name="total" type="number" min="0" value="${Number(order.total || 0)}" /></label>
    <label class="full">Observaciones<textarea name="notes">${escapeHtml(order.notes || "")}</textarea></label>
    <button class="primary full">Guardar cambios</button>
  </form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    order.location = data.location;
    order.number = orderDisplayCode(order);
    order.paymentStatus = data.paymentStatus;
    order.paymentMethod = data.paymentMethod;
    order.total = Number(data.total);
    order.notes = data.notes;
    if (order.paymentStatus === "Abonado") order.paymentStatus = "Abonado";
    syncOrderPayment(order);
    saveState(); closeModal(); render();
  });
}

function openOrderStateModal(id) {
  const order = getOrder(id);
  if (!order) return;
  openModal(`Cambiar estado ${escapeHtml(order.number)}`, `<form class="state-grid">
    ${STATES.map((status) => `<label class="state-option ${status === order.status ? "selected" : ""}"><input type="radio" name="status" value="${status}" ${status === order.status ? "checked" : ""} /> <span>${status}</span></label>`).join("")}
    <button class="primary full">Guardar estado</button>
  </form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    order.status = data.status;
    if (order.status === "Retirado") order.location = "";
    saveState(); closeModal(); render();
  });
}

function storageNoticeText(order = null) {
  const base = safeReplaceAll(state.settings.storageNoticeText, "{dias}", state.settings.storageNoticeDays);
  if (!order) return base;
  return `${base}\n\nPedido #${order.number} - Cliente: ${orderClient(order)} - Ubicación: ${order.location || "sin asignar"}.`;
}

function sendWhatsapp(id, type) {
  const order = getOrder(id);
  const phone = ((getClient(order.clientId) && getClient(order.clientId).phone) || "").replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageForOrder(order, type))}`, "_blank");
}

function openWhatsappMenu(id) {
  const order = getOrder(id);
  if (!order) return;
  openModal(`Mensajes WhatsApp #${escapeHtml(order.number)}`, `
    <div class="message-list">
      <button class="secondary" data-action="sendWhatsapp" data-message-type="received" data-id="${order.id}">Recibimos tu pedido</button>
      <button class="success" data-action="sendWhatsapp" data-message-type="ready" data-id="${order.id}">Tu pedido está listo</button>
      <button class="secondary" data-action="sendWhatsapp" data-message-type="retired" data-id="${order.id}">Retiró su pedido</button>
      <div class="copy-row"><button class="secondary" data-action="copyWhatsapp" data-message-type="received" data-id="${order.id}">Copiar recibido</button><button class="secondary" data-action="copyWhatsapp" data-message-type="ready" data-id="${order.id}">Copiar listo</button><button class="secondary" data-action="copyWhatsapp" data-message-type="retired" data-id="${order.id}">Copiar retirado</button></div>
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
    <textarea class="notice-text" readonly>${escapeHtml(text)}</textarea>
    <div class="actions"><button class="primary" data-action="copyNotice">Copiar cartel</button>${order ? `<button class="success" data-action="sendStorageNotice" data-id="${order.id}">Enviar al cliente</button>` : ""}</div>`);
}

function copyVisibleNotice() {
  const text = (document.querySelector(".notice-text") && document.querySelector(".notice-text").value) || "";
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  else prompt("Copiá el cartel", text);
  alert("Cartel copiado/preparado.");
}

function sendStorageNotice(id) {
  const order = getOrder(id);
  const phone = ((getClient(order.clientId) && getClient(order.clientId).phone) || "").replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(storageNoticeText(order))}`, "_blank");
}

function unlockCash() {
  cashUnlocked = document.getElementById("cashPin").value === state.settings.cashPin;
  if (!cashUnlocked) alert("Clave incorrecta");
  render();
}

function openCashModal(type) {
  const categories = type === "Ingreso" ? ["Pedido", "Seña", "Otro"] : ["Agua", "Luz", "Gas", "Insumos", "Alquiler", "Otros servicios"];
  openModal(`${type} de caja`, `<form class="form-grid"><label>Categoría<select name="category">${categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}</select></label><label>Medio<select name="method"><option value="Efectivo">💵 Efectivo</option><option value="Transferencia">🏦 Transferencia</option></select></label><label>Importe<input name="amount" type="number" min="0" required /></label><label>Descripción<input name="description" required /></label><button class="primary full">Guardar ${type.toLowerCase()}</button></form>`, (form) => {
    state.cash.push({ id: nextId(state.cash), type, date: new Date().toISOString(), ...Object.fromEntries(form.entries()) });
    saveState(); closeModal(); render();
  });
}


function saveSettings() {
  ["openHour", "closeHour", "whatsappReceivedMessage", "whatsappMessage", "whatsappRetiredMessage", "storageNoticeText", "cashPin"].forEach((key) => state.settings[key] = document.getElementById(key).value);
  ["smallWashers", "dryers", "washingMinutes", "dryingMinutes", "storageNoticeDays"].forEach((key) => state.settings[key] = Number(document.getElementById(key).value));
  saveState(); render();
}

function resetDemo() {
  if (!confirm("¿Reiniciar datos de demostración?")) return;
  state = cloneData(defaultData);
  cashUnlocked = false;
  saveState(); render();
}

render();
