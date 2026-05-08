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
    whatsappMessage: "Hola {cliente}. Tu pedido #{pedido} de la lavandería ya está listo para retirar. Te esperamos hasta las 19:00. Gracias.",
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
    { id: 1, name: "María Gómez", phone: "5491112345678", address: "", notes: "Prefiere WhatsApp" },
    { id: 2, name: "Juan Pérez", phone: "5491198765432", address: "", notes: "" },
  ],
  orders: [],
  cash: [],
  locations: ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4"].map((code, index) => ({ id: index + 1, code })),
};

let state = loadState();
let currentView = "dashboard";
let cashUnlocked = false;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultData);
  return { ...structuredClone(defaultData), ...JSON.parse(saved) };
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

function todayInput() {
  return new Date().toISOString().slice(0, 10);
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

function render() {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === currentView));
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === currentView));
  renderDashboard();
  renderOrders();
  renderClients();
  renderSchedule();
  renderStorage();
  renderCash();
  renderReports();
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
    changeState: () => changeState(id),
    whatsapp: () => openWhatsapp(id),
    copyWhatsapp: () => copyWhatsapp(id),
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
      <input id="orderSearch" placeholder="Buscar por número, cliente, teléfono, estado o depósito" oninput="filterOrders(this.value)" />
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
        <thead><tr><th>N°</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Estimado</th><th>Depósito</th><th>Total</th><th>Acciones</th></tr></thead>
        <tbody>${orders.map((order) => `
          <tr>
            <td><strong>#${escapeHtml(order.number)}</strong></td>
            <td>${escapeHtml(orderClient(order))}<br><small>${escapeHtml(getClient(order.clientId)?.phone || "")}</small></td>
            <td>${escapeHtml(serviceSummary(order))}<br><small>${Number(order.valets || 0)} valet(s) · ${Number(order.packages || 1)} paquete(s)</small></td>
            <td><span class="badge ${normalizeClass(order.status)}">${escapeHtml(order.status)}</span></td>
            <td>${formatDateTime(order.estimate)}</td>
            <td>${escapeHtml(order.location || "Sin asignar")}</td>
            <td>${money(order.total)}</td>
            <td class="actions"><button class="secondary" data-action="changeState" data-id="${order.id}">Estado</button><button class="success" data-action="whatsapp" data-id="${order.id}">WhatsApp</button><button class="secondary" data-action="copyWhatsapp" data-id="${order.id}">Copiar</button></td>
          </tr>`).join("") || `<tr><td colspan="8">No hay pedidos cargados.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}


function renderClients() {
  document.getElementById("clients").innerHTML = `
    <div class="card">
      <div class="toolbar"><h2>Clientes</h2><button class="primary" data-action="newClient">+ Nuevo cliente</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Notas</th><th>Pedidos</th><th></th></tr></thead>
        <tbody>${state.clients.map((client) => `<tr><td><strong>${escapeHtml(client.name)}</strong></td><td>${escapeHtml(client.phone)}</td><td>${escapeHtml(client.address || "-")}</td><td>${escapeHtml(client.notes || "-")}</td><td>${state.orders.filter((order) => order.clientId === client.id).length}</td><td><button class="secondary" data-action="editClient" data-id="${client.id}">Editar</button></td></tr>`).join("")}</tbody>
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

  document.getElementById("schedule").innerHTML = `
    <div class="card"><h2>Turnos y máquinas</h2><p class="notice">Horario: lunes a viernes de ${escapeHtml(state.settings.openHour)} a ${escapeHtml(state.settings.closeHour)}. Estimación real por disponibilidad: ${state.settings.smallWashers} lavarropas chicos y ${state.settings.dryers} secadoras.</p></div>
    <div class="machine-board">${machines.map((machine) => {
      const assigned = activeCycles.filter((cycle) => cycle.machine === machine.name).slice(0, 8);
      return `<article class="machine"><h4>${escapeHtml(machine.name)}</h4><span class="badge ${machine.type === "Lavado" ? "en-lavado" : "en-secado"}">${machine.type}</span>${assigned.map((cycle) => `<div class="slot"><strong>#${escapeHtml(cycle.order.number)}</strong> ${escapeHtml(orderClient(cycle.order))}<br><small>${formatDateTime(cycle.start)} → ${formatDateTime(cycle.end)}</small></div>`).join("") || `<div class="slot">Libre</div>`}</article>`;
    }).join("")}</div>`;
}


function renderStorage() {
  const occupied = new Map(state.orders.filter((order) => order.location && !["Retirado", "Abonado"].includes(order.status)).map((order) => [order.location, order]));
  document.getElementById("storage").innerHTML = `
    <div class="card"><h2>Depósito</h2><p>Ubicación física para encontrar paquetes rápido cuando el cliente retira.</p></div>
    <div class="storage-grid">${state.locations.map((location) => {
      const order = occupied.get(location.code);
      return `<article class="location ${order ? "busy" : "free"}"><h3>${escapeHtml(location.code)}</h3>${order ? `<strong>#${escapeHtml(order.number)}</strong><br>${escapeHtml(orderClient(order))}<br><span class="badge ${normalizeClass(order.status)}">${escapeHtml(order.status)}</span>` : "Libre"}</article>`;
    }).join("")}</div>`;
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
    <div class="card"><div class="toolbar"><h2>Caja</h2><div class="actions"><button class="success" data-action="cashIncome">+ Ingreso</button><button class="danger" data-action="cashExpense">+ Egreso</button></div></div>${cashTable()}</div>`;
}

function cashTable() {
  return `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Medio</th><th>Importe</th></tr></thead><tbody>${[...state.cash].reverse().map((entry) => `<tr><td>${formatDateTime(entry.date)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.category)}</td><td>${escapeHtml(entry.description)}</td><td>${escapeHtml(entry.method)}</td><td>${money(entry.amount)}</td></tr>`).join("") || `<tr><td colspan="6">Sin movimientos.</td></tr>`}</tbody></table></div>`;
}


function renderReports() {
  const months = {};
  state.orders.forEach((order) => {
    const key = order.createdAt.slice(0, 7);
    months[key] ||= { orders: 0, income: 0 };
    months[key].orders += 1;
    months[key].income += Number(order.total || 0);
  });
  const rows = Object.entries(months).sort().map(([month, data], index, arr) => {
    const prev = arr[index - 1]?.[1].income || 0;
    const diff = prev ? `${Math.round(((data.income - prev) / prev) * 100)}%` : "-";
    return `<tr><td>${month}</td><td>${data.orders}</td><td>${money(data.income)}</td><td>${diff}</td></tr>`;
  }).join("");
  document.getElementById("reports").innerHTML = `<div class="card"><h2>Reportes simples</h2><div class="table-wrap"><table><thead><tr><th>Mes</th><th>Pedidos</th><th>Ingresos potenciales</th><th>Comparación</th></tr></thead><tbody>${rows || `<tr><td colspan="4">Cargá pedidos para ver reportes.</td></tr>`}</tbody></table></div></div>`;
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
      <label class="full">Mensaje WhatsApp<textarea id="whatsappMessage">${escapeHtml(state.settings.whatsappMessage)}</textarea></label>
    </div><br><div class="actions"><button class="primary" data-action="saveSettings">Guardar</button><button class="danger" data-action="resetDemo">Reiniciar demo</button></div></div>`;
}


function openModal(title, html, onSubmit) {
  const template = document.getElementById("modalTemplate").content.cloneNode(true);
  template.querySelector("h2").textContent = title;
  template.querySelector(".modal-body").innerHTML = html;
  document.body.appendChild(template);
  const form = document.querySelector(".modal-backdrop form");
  if (form) form.addEventListener("submit", (event) => { event.preventDefault(); onSubmit?.(new FormData(form)); });
}

function closeModal() {
  document.querySelector(".modal-backdrop")?.remove();
}

function openClientModal(id) {
  const client = id ? getClient(id) : { name: "", phone: "", address: "", notes: "" };
  openModal(id ? "Editar cliente" : "Nuevo cliente", `<form class="form-grid"><label>Nombre<input name="name" required value="${escapeHtml(client.name)}" /></label><label>Teléfono WhatsApp<input name="phone" required value="${escapeHtml(client.phone)}" /></label><label>Dirección<input name="address" value="${escapeHtml(client.address || "")}" /></label><label>Notas<input name="notes" value="${escapeHtml(client.notes || "")}" /></label><button class="primary full">Guardar cliente</button></form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    if (id) Object.assign(client, data); else state.clients.push({ id: nextId(state.clients), ...data });
    saveState(); closeModal(); render();
  });
}


function openOrderModal() {
  openModal("Nuevo pedido", `<form class="form-grid">
    <label>Cliente<select name="clientId" required>${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} · ${escapeHtml(client.phone)}</option>`).join("")}</select></label>
    <label>Servicio<select name="serviceId" required>${state.services.map((service) => `<option value="${service.id}" data-price="${service.price}">${escapeHtml(service.name)} · ${money(service.price)}</option>`).join("")}</select></label>
    <label>Cantidad de valets<input name="valets" type="number" min="0" value="1" /></label>
    <label>Paquetes / bolsas<input name="packages" type="number" min="1" value="1" /></label>
    <label>Precio total<input name="total" type="number" min="0" value="3000" /></label>
    <label>Ubicación depósito<select name="location"><option value="">Asignar luego</option>${availableLocations().map((location) => `<option>${escapeHtml(location.code)}</option>`).join("")}</select></label>
    <label class="full">Observaciones<textarea name="notes" placeholder="Prendas delicadas, manchas, indicaciones..."></textarea></label>
    <button class="primary full">Crear pedido</button>
  </form>`, (form) => {
    const data = Object.fromEntries(form.entries());
    const createdAt = new Date().toISOString();
    const service = getService(data.serviceId);
    const schedule = createOrderSchedule(service, createdAt);
    state.orders.push({ id: nextId(state.orders), number: nextOrderNumber(), clientId: Number(data.clientId), serviceId: Number(data.serviceId), createdAt, estimate: schedule.estimate, cycles: schedule.cycles, status: "Recibido", valets: Number(data.valets), packages: Number(data.packages), total: Number(data.total), location: data.location, notes: data.notes });
    saveState(); closeModal(); setView("orders");
  });
}


function changeState(id) {
  const order = getOrder(id);
  const index = STATES.indexOf(order.status);
  order.status = STATES[Math.min(index + 1, STATES.length - 1)];
  if (order.status === "Abonado" && !state.cash.some((entry) => entry.orderId === order.id)) {
    state.cash.push({ id: nextId(state.cash), type: "Ingreso", category: "Pedido", description: `Cobro pedido #${order.number}`, method: "Efectivo", amount: order.total, orderId: order.id, date: new Date().toISOString() });
  }
  if (["Retirado", "Abonado"].includes(order.status)) order.location = "";
  saveState(); render();
}

function whatsappText(order) {
  return state.settings.whatsappMessage.replace("{cliente}", orderClient(order)).replace("{pedido}", order.number);
}

function openWhatsapp(id) {
  const order = getOrder(id);
  const phone = getClient(order.clientId)?.phone || "";
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsappText(order))}`, "_blank");
}

function copyWhatsapp(id) {
  navigator.clipboard.writeText(whatsappText(getOrder(id)));
  alert("Mensaje copiado para enviar manualmente por WhatsApp.");
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
  ["openHour", "closeHour", "whatsappMessage", "cashPin"].forEach((key) => state.settings[key] = document.getElementById(key).value);
  ["smallWashers", "dryers", "washingMinutes", "dryingMinutes"].forEach((key) => state.settings[key] = Number(document.getElementById(key).value));
  saveState(); render();
}

function resetDemo() {
  if (!confirm("¿Reiniciar datos de demostración?")) return;
  state = structuredClone(defaultData);
  cashUnlocked = false;
  saveState(); render();
}

render();
