"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var appStarted = false;
function isOpaqueExternalError(event) {
    var message = event && event.message ? event.message : "";
    return (message === "Script error." || message === "Script error") && !(event && event.filename) && !(event && event.error);
}
window.addEventListener("error", function (event) {
    if (isOpaqueExternalError(event)) {
        if (window.console && console.warn)
            console.warn("Se ignoró un error externo sin detalle del navegador/extensión.", event);
        return;
    }
    if (appStarted) {
        if (window.console && console.error)
            console.error("Error no crítico luego del arranque", event && (event.error || event.message || event));
        return;
    }
    var root = document.querySelector(".content");
    if (!root)
        return;
    var detail = event && event.message ? event.message : "Error desconocido";
    if (event && event.filename)
        detail += " (" + event.filename + ":" + (event.lineno || "?") + ":" + (event.colno || "?") + ")";
    if (event && event.error && event.error.stack)
        detail += "\n" + event.error.stack;
    root.innerHTML = "<section class=\"view active\"><div class=\"card\"><h2>No se pudo iniciar el sistema</h2><p>Prob\u00E1 actualizar el navegador o abrir el sistema con <code>python3 -m http.server 8080</code>.</p><p><strong>Detalle:</strong></p><pre class=\"error-detail\">".concat(escapeHtml(detail), "</pre></div></section>" );
});
var STORAGE_KEY = "lavanderia-local-v1";
var STATES = ["Pendiente", "Listo", "Retirado"];
var defaultData = {
    settings: {
        openHour: "09:00",
        closeHour: "19:00",
        washingMinutes: 30,
        dryingMinutes: 50,
        smallWashers: 4,
        dryers: 6,
        whatsappReceivedMessage: "Hola {cliente}, recibimos tu pedido {pedido}. Total: {total}. Te avisamos cuando esté listo. Gracias.",
        whatsappMessage: "Hola {cliente}, tu pedido {pedido} ya está listo para retirar. Total: {total}. {pago} Te esperamos.",
        whatsappRetiredMessage: "Hola {cliente}, registramos la entrega de tu pedido {pedido}. Muchas gracias por elegirnos.",
        storageNoticeDays: 30,
        storageNoticeText: "Condiciones de guarda: conforme las condiciones informadas al momento de recepción y el deber de información clara previsto por la Ley 24.240 de Defensa del Consumidor, los pedidos no retirados dentro de {dias} días corridos desde el aviso de disponibilidad podrán generar cargos de guarda y/o ser derivados a donación previa comunicación fehaciente al cliente. Texto sujeto a validación legal local.",
        cashPin: "1234",
        metricsPin: "1111",
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
    cashHistory: [],
    locations: buildDefaultLocations(),
};
function cloneData(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    }
    catch (error) {
        console.warn("No se pudo clonar la información inicial", error);
        return value;
    }
}
function safeReplaceAll(value, search, replacement) {
    return String(value).split(search).join(replacement);
}
function buildDefaultLocations() {
    var rows = ["A", "B", "C", "D", "E", "F"];
    var locations = [];
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        for (var slot = 1; slot <= 6; slot += 1) {
            locations.push({ id: locations.length + 1, code: rows[rowIndex] + slot });
        }
    }
    return locations;
}
function forEachNode(nodes, callback) {
    for (var index = 0; index < nodes.length; index += 1) callback(nodes[index], index);
}
function listFrom(nodes) {
    var list = [];
    for (var index = 0; index < nodes.length; index += 1) list.push(nodes[index]);
    return list;
}
function storageGet(key) {
    try {
        return window.localStorage ? window.localStorage.getItem(key) : null;
    }
    catch (error) {
        console.warn("No se pudo leer el almacenamiento local. El sistema queda en modo temporal.", error);
        return null;
    }
}
function storageSet(key, value) {
    try {
        if (window.localStorage)
            window.localStorage.setItem(key, value);
    }
    catch (error) {
        console.warn("No se pudo guardar en el almacenamiento local. Revisá permisos del navegador.", error);
    }
}
function leftPad(value, length, character) {
    var text = String(value || "");
    var pad = character || "0";
    while (text.length < length)
        text = pad + text;
    return text;
}
function formDataToObject(form) {
    var result = {};
    if (window.FormData) {
        try {
            var data = new FormData(form);
            if (data.forEach) {
                data.forEach(function (value, key) { result[key] = value; });
                return result;
            }
        }
        catch (error) {}
    }
    forEachNode(form.elements || [], function (field) {
        if (field.name && !field.disabled)
            result[field.name] = field.value;
    });
    return result;
}
function formatShortDateTime(date) {
    var value = new Date(date);
    if (isNaN(value.getTime()))
        return "Sin estimar";
    return "".concat(leftPad(value.getDate(), 2, "0"), "/").concat(leftPad(value.getMonth() + 1, 2, "0"), "/").concat(String(value.getFullYear()).slice(-2), " ").concat(leftPad(value.getHours(), 2, "0"), ":").concat(leftPad(value.getMinutes(), 2, "0"));
}
function flatten(list) {
    return Array.prototype.concat.apply([], list);
}
var state = loadState();
var currentView = "dashboard";
var cashUnlocked = false;
var selectedMachine = null;
var scheduleWeekStart = currentWeekStart(new Date()).toISOString().slice(0, 10);
var scheduleSelectedDate = localDateInput();
var selectedScheduleTicketId = 0;
var draggedScheduleTicketId = 0;
var draggedScheduleCycle = null;
var scheduleViewMode = "day";
var scheduleSlotMinutes = 30;
var scheduleSimpleMode = true;
var schedulePreview = null;
var selectedMetricsMonth = "";
function mergeLocations(defaultLocations, savedLocations) {
    if (savedLocations === void 0) { savedLocations = []; }
    var result = [];
    function addLocation(location) {
        if (!location || !location.code)
            return;
        for (var index = 0; index < result.length; index += 1) {
            if (result[index].code === location.code)
                return;
        }
        result.push({ id: result.length + 1, code: location.code });
    }
    defaultLocations.forEach(addLocation);
    (savedLocations || []).forEach(addLocation);
    return result;
}
function currentWeekStart(reference) {
    var day = reference.getDay() || 7;
    var monday = new Date(reference);
    monday.setDate(reference.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
}
function loadState() {
    var defaults = cloneData(defaultData);
    var saved = storageGet(STORAGE_KEY);
    if (!saved)
        return defaults;
    var parsed;
    try {
        parsed = JSON.parse(saved);
    }
    catch (error) {
        console.warn("No se pudieron leer los datos guardados. Se cargan datos iniciales.", error);
        return defaults;
    }
    var merged = __assign(__assign(__assign({}, defaults), parsed), { settings: __assign(__assign({}, defaults.settings), (parsed.settings || {})), services: parsed.services && parsed.services.length ? parsed.services : defaults.services, clients: parsed.clients && parsed.clients.length ? parsed.clients : defaults.clients, orders: parsed.orders || defaults.orders, cash: parsed.cash || defaults.cash, locations: mergeLocations(defaults.locations, parsed.locations), cashHistory: parsed.cashHistory || defaults.cashHistory });
    if (!parsed.settings || !Object.prototype.hasOwnProperty.call(parsed.settings, "metricsPin") || parsed.settings.metricsPin === "1234")
        merged.settings.metricsPin = defaults.settings.metricsPin;
    if (!parsed.settings || parsed.settings.whatsappReceivedMessage === "Hola {cliente}. Recibimos tu pedido {pedido}. {pago}. Te avisamos cuando esté listo. Gracias." )
        merged.settings.whatsappReceivedMessage = defaults.settings.whatsappReceivedMessage;
    if (!parsed.settings || parsed.settings.whatsappMessage === "Hola {cliente}. Tu pedido {pedido} ya está listo para retirar. {pago}. Te esperamos." )
        merged.settings.whatsappMessage = defaults.settings.whatsappMessage;
    if (!parsed.settings || parsed.settings.whatsappRetiredMessage === "Hola {cliente}. Dejamos constancia de que retiró su pedido {pedido} el {fecha}. {pago}. Muchas gracias." )
        merged.settings.whatsappRetiredMessage = defaults.settings.whatsappRetiredMessage;
    merged.clients = merged.clients.map(function (client) { return (__assign({ authorizedPickups: "" }, client)); });
    merged.orders = merged.orders.map(function (order) {
        var paymentStatus = order.paymentStatus || (order.status === "Abonado" ? "Abonado" : "Pendiente");
        var status = ["Retirado", "Abonado"].includes(order.status) ? "Retirado" : order.status === "Listo para retirar" ? "Listo" : ["Pendiente", "Listo", "Retirado"].includes(order.status) ? order.status : "Pendiente";
        var items = order.items && order.items.length ? order.items : [{ name: serviceSummary(order), serviceId: order.serviceId, price: Number(order.total || 0), quantity: 1 }];
        items = items.map(function (item) { return __assign({ quantity: 1 }, item); });
        return ensureOrderCycleIds(__assign(__assign({}, order), { status: status, paymentStatus: paymentStatus, paymentMethod: order.paymentMethod || "Efectivo", cycles: order.cycles || [], items: items }));
    });
    return merged;
}
function saveState() {
    storageSet(STORAGE_KEY, JSON.stringify(state));
}
function money(value) {
    var amount = Number(value || 0);
    try {
        if (window.Intl && window.Intl.NumberFormat)
            return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
    }
    catch (error) {}
    return "$ " + Math.round(amount);
}
function formatDateTime(value) {
    if (!value)
        return "Sin estimar";
    return formatShortDateTime(value);
}
function normalizeClass(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "-");
}
function nextId(list) {
    return list.length ? Math.max.apply(Math, list.map(function (item) { return item.id; })) + 1 : 1;
}
function nextOrderNumber() {
    return leftPad(1000 + nextId(state.orders), 4, "0");
}
function getClient(id) {
    return state.clients.find(function (client) { return client.id === Number(id); });
}
function getService(id) {
    return state.services.find(function (service) { return service.id === Number(id); });
}
function getOrder(id) {
    return state.orders.find(function (order) { return order.id === Number(id); });
}
function serviceSummary(order) {
    var service = getService(order.serviceId);
    return service ? service.name : "Servicio eliminado";
}
function orderClient(order) {
    var client = getClient(order.clientId);
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
function availableLocations(currentOrderId) {
    if (currentOrderId === void 0) { currentOrderId = null; }
    var busy = {};
    state.orders.filter(function (order) { return order.id !== Number(currentOrderId) && order.location && order.status !== "Retirado"; }).forEach(function (order) {
        busy[order.location] = true;
    });
    return state.locations.filter(function (location) { return !busy[location.code]; });
}
function createOrderSchedule(service, createdAt) {
    return { estimate: createdAt || new Date().toISOString(), cycles: [] };
}
function nextCycleId(orderId, index) {
    return "c" + String(orderId || "nuevo") + "-" + String(index || 0) + "-" + String(new Date().getTime());
}
function ensureOrderCycleIds(order) {
    (order.cycles || []).forEach(function (cycle, index) {
        if (!cycle.cycleId)
            cycle.cycleId = nextCycleId(order.id, index);
    });
    return order;
}
function refreshOrderEstimate(order) {
    var latest = order.createdAt || new Date().toISOString();
    (order.cycles || []).forEach(function (cycle) {
        if (cycle.end && new Date(cycle.end) > new Date(latest))
            latest = cycle.end;
    });
    order.estimate = latest;
}
function currentWeekDays(reference) {
    if (reference === void 0) { reference = new Date(); }
    var monday = currentWeekStart(reference);
    var days = [];
    for (var index = 0; index < 5; index += 1) {
        var date = new Date(monday);
        date.setDate(monday.getDate() + index);
        days.push(date);
    }
    return days;
}
function dateKey(date) {
    return new Date(date).toISOString().slice(0, 10);
}
function hourLabel(hour) {
    return "".concat(leftPad(hour, 2, "0"), ":00");
}
function cycleOverlapsHour(cycle, day, hour) {
    var start = new Date(cycle.start);
    var end = new Date(cycle.end);
    var blockStart = new Date(day);
    blockStart.setHours(hour, 0, 0, 0);
    var blockEnd = new Date(blockStart);
    blockEnd.setHours(hour + 1, 0, 0, 0);
    return start < blockEnd && end > blockStart;
}
function monthKey(value) {
    return new Date(value).toISOString().slice(0, 7);
}
function allCashEntries() {
    var archived = [];
    (state.cashHistory || []).forEach(function (day) {
        (day.entries || []).forEach(function (entry) { archived.push(__assign({ archivedDay: day.closedAt }, entry)); });
    });
    return __spreadArray(__spreadArray([], state.cash || [], true), archived, true);
}
function topMetrics(values, limit) {
    var list = [];
    for (var key in values) {
        if (Object.prototype.hasOwnProperty.call(values, key))
            list.push(values[key]);
    }
    list.sort(function (a, b) { return b.count - a.count; });
    return list.slice(0, limit || 3);
}
function emptyHourlyCounts() {
    var hours = [];
    for (var hour = 0; hour < 24; hour += 1)
        hours.push({ hour: hour, label: leftPad(hour, 2, "0") + ":00", count: 0 });
    return hours;
}
function monthlyCashSummary() {
    var summary = {};
    allCashEntries().forEach(function (entry) {
        var key = monthKey(entry.date);
        if (!summary[key])
            summary[key] = { income: 0, expense: 0, cash: 0, transfer: 0 };
        var amount = Number(entry.amount || 0);
        if (entry.type === "Ingreso")
            summary[key].income += amount;
        if (entry.type === "Egreso")
            summary[key].expense += amount;
        if (entry.method === "Efectivo")
            summary[key].cash += entry.type === "Ingreso" ? amount : -amount;
        if (entry.method === "Transferencia")
            summary[key].transfer += entry.type === "Ingreso" ? amount : -amount;
    });
    operationalOrders().forEach(function (order) {
        var orderMonth = monthKey(order.createdAt);
        if (!summary[orderMonth])
            summary[orderMonth] = { income: 0, expense: 0, cash: 0, transfer: 0 };
    });
    var months = [];
    for (var month in summary) {
        if (Object.prototype.hasOwnProperty.call(summary, month))
            months.push(month);
    }
    months.sort();
    return months.map(function (month, index) {
        var values = summary[month];
        var balance = values.income - values.expense;
        var previousValues = index > 0 ? summary[months[index - 1]] : null;
        var previous = previousValues ? previousValues.income - previousValues.expense : null;
        var diff = previous ? Math.round(((balance - previous) / Math.abs(previous)) * 100) : null;
        var monthOrders = operationalOrders().filter(function (order) { return monthKey(order.createdAt) === month; });
        var hourlyCounts = emptyHourlyCounts();
        var clients = {};
        monthOrders.forEach(function (order) {
            var client = getClient(order.clientId);
            var clientKey = String(order.clientId || orderClient(order));
            if (!clients[clientKey])
                clients[clientKey] = { id: order.clientId, name: client ? client.name : orderClient(order), count: 0 };
            clients[clientKey].count += 1;
            var hour = new Date(order.createdAt).getHours();
            if (hourlyCounts[hour])
                hourlyCounts[hour].count += 1;
        });
        var orderTotal = monthOrders.reduce(function (sum, order) { return sum + Number(order.total || 0); }, 0);
        var averageTicket = monthOrders.length ? Math.round(orderTotal / monthOrders.length) : 0;
        var margin = values.income ? Math.round((balance / values.income) * 100) : 0;
        return __assign(__assign({ month: month }, values), { balance: balance, diff: diff, orders: monthOrders.length, orderTotal: orderTotal, averageTicket: averageTicket, margin: margin, topClients: topMetrics(clients, 3), hourlyCounts: hourlyCounts });
    });
}
function signedCashAmount(entry) {
    var amount = Number(entry.amount || 0);
    return entry.type === "Egreso" ? -Math.abs(amount) : amount;
}
function moneySigned(value) {
    var amount = Number(value || 0);
    return amount < 0 ? "-" + money(Math.abs(amount)) : money(amount);
}
function historicalCashRows() {
    var rows = [];
    (state.cashHistory || []).forEach(function (day) {
        (day.entries || []).forEach(function (entry) {
            rows.push(__assign({ closedAt: day.closedAt }, entry));
        });
    });
    rows.sort(function (a, b) { return new Date(b.closedAt || b.date) - new Date(a.closedAt || a.date); });
    return rows;
}
function monthlyCashHtml(month) {
    var rows = historicalCashRows().filter(function (entry) { return monthKey(entry.date) === month; });
    return '<details class="monthly-cash-panel"><summary class="secondary history-toggle">Ver caja mensual</summary><div class="toolbar compact-toolbar"><h3>Caja mensual ' + escapeHtml(month || "sin mes") + '</h3><button class="secondary" data-action="exportMonthlyCash" data-month="' + escapeHtml(month || "") + '">Exportar caja mensual CSV</button></div><div class="table-wrap"><table class="cash-history-table"><thead><tr><th>Cierre</th><th>Movimiento</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Medio</th><th>Importe</th></tr></thead><tbody>'.concat(rows.map(function (entry) { return '<tr class="'.concat(entry.type === "Ingreso" ? "cash-income-row" : "cash-expense-row", '"><td>').concat(formatDateTime(entry.closedAt), '</td><td>').concat(formatDateTime(entry.date), '</td><td>').concat(escapeHtml(entry.type), '</td><td>').concat(escapeHtml(entry.category), '</td><td>').concat(escapeHtml(entry.description), '</td><td>').concat(paymentMethodLabel(entry.method), '</td><td class="').concat(signedCashAmount(entry) < 0 ? 'negative-amount' : '', '">').concat(moneySigned(signedCashAmount(entry)), '</td></tr>'); }).join('') || '<tr><td colspan="7">No hay caja archivada para este mes.</td></tr>', '</tbody></table></div></details>');
}
function orderHourLineChart(row) {
    var counts = row.hourlyCounts || emptyHourlyCounts();
    var max = counts.reduce(function (best, item) { return Math.max(best, item.count); }, 1);
    var chartTop = 24;
    var chartBottom = 150;
    var chartLeft = 48;
    var chartRight = 584;
    var points = counts.map(function (item, index) {
        var x = chartLeft + index * ((chartRight - chartLeft) / 23);
        var y = chartBottom - (item.count / max) * (chartBottom - chartTop);
        return Math.round(x) + "," + Math.round(y);
    }).join(" ");
    var yTicks = [];
    for (var tick = 0; tick <= 4; tick += 1) {
        var value = Math.round((max / 4) * tick);
        var y = chartBottom - (value / max) * (chartBottom - chartTop);
        yTicks.push({ value: value, y: Math.round(y) });
    }
    var yLines = yTicks.map(function (tick) { return '<g><line class="grid-line" x1="'.concat(chartLeft, '" y1="').concat(tick.y, '" x2="').concat(chartRight, '" y2="').concat(tick.y, '"></line><text x="8" y="').concat(tick.y + 4, '">').concat(tick.value, '</text></g>'); }).join("");
    var dots = counts.map(function (item, index) {
        var x = chartLeft + index * ((chartRight - chartLeft) / 23);
        var y = chartBottom - (item.count / max) * (chartBottom - chartTop);
        return '<circle cx="'.concat(Math.round(x), '" cy="').concat(Math.round(y), '" r="').concat(item.count ? 4 : 2, '"><title>').concat(escapeHtml(item.label), ': ').concat(item.count, ' pedidos</title></circle>');
    }).join("");
    var labels = counts.filter(function (item) { return item.count > 0; }).map(function (item) { return '<span><strong>'.concat(escapeHtml(item.label), '</strong>').concat(item.count, '</span>'); }).join('') || '<span>Sin pedidos en este mes.</span>';
    var xLabels = counts.map(function (item) { return "<span>" + escapeHtml(item.label) + "</span>"; }).join("");
    return '<div class="hour-line-chart"><div class="hour-chart-wrap"><span class="y-axis-title">Pedidos</span><svg viewBox="0 0 600 180" role="img" aria-label="Pedidos por hora"><g class="y-axis-labels">'.concat(yLines, '</g><line class="axis-line" x1="').concat(chartLeft, '" y1="').concat(chartBottom, '" x2="').concat(chartRight, '" y2="').concat(chartBottom, '"></line><line class="axis-line" x1="').concat(chartLeft, '" y1="').concat(chartTop, '" x2="').concat(chartLeft, '" y2="').concat(chartBottom, '"></line><polyline points="').concat(points, '"></polyline><g class="hour-points">').concat(dots, '</g></svg></div><div class="hour-axis-labels">').concat(xLabels, '</div><div class="hour-chart-labels">').concat(labels, '</div></div>');
}
function monthSelectorHtml(rows, selectedMonth) {
    return '<label>Ver mes<select data-metrics-month>'.concat(rows.map(function (row) { return '<option value="'.concat(escapeHtml(row.month), '" ').concat(row.month === selectedMonth ? 'selected' : '', '>').concat(escapeHtml(row.month), '</option>'); }).join(''), '</select></label>');
}
function messageForOrder(order, type) {
    var templates = {
        received: state.settings.whatsappReceivedMessage,
        ready: state.settings.whatsappMessage,
        retired: state.settings.whatsappRetiredMessage,
    };
    var isPaid = order.paymentStatus === "Abonado";
    var unpaidText = type === "ready" ? "Para retirar, el total a pagar es ".concat(money(order.total), ".") : "Queda pendiente de pago ".concat(money(order.total), ".");
    var paymentText = isPaid ? "Ya figura pago por ".concat(order.paymentMethod || "medio registrado", ".") : unpaidText;
    return safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(templates[type], "{cliente}", orderClient(order)), "{pedido}", customerOrderCode(order)), "{fecha}", formatDateTime(new Date().toISOString())), "{estimado}", formatDateTime(order.estimate)), "{pago}", paymentText), "{total}", money(order.total));
}
function safeRenderView(id, callback) {
    try {
        callback();
    }
    catch (error) {
        var target = document.getElementById(id);
        if (target)
            target.innerHTML = "<div class=\"card\"><h2>La secci\u00F3n no pudo cargar</h2><pre class=\"error-detail\">".concat(escapeHtml(error && (error.stack || error.message) || error), "</pre></div>");
        if (window.console && console.error)
            console.error("No se pudo renderizar " + id, error);
    }
}
function render() {
    forEachNode(document.querySelectorAll(".view"), function (view) { return view.classList.toggle("active", view.id === currentView); });
    forEachNode(document.querySelectorAll(".nav-button"), function (button) { return button.classList.toggle("active", button.getAttribute("data-view") === currentView); });
    safeRenderView("dashboard", renderDashboard);
    safeRenderView("orders", renderOrders);
    safeRenderView("clients", renderClients);
    safeRenderView("schedule", renderSchedule);
    safeRenderView("storage", renderStorage);
    safeRenderView("cash", renderCash);
    safeRenderView("cashReports", renderCashReports);
    safeRenderView("settings", renderSettings);
}
function setView(view) {
    if (view === "cash" || view === "cashReports")
        cashUnlocked = false;
    currentView = view;
    render();
}
forEachNode(document.querySelectorAll(".nav-button"), function (button) { return button.addEventListener("click", function () { return setView(button.getAttribute("data-view")); }); });
document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-action]");
    if (!target)
        return;
    var action = target.getAttribute("data-action");
    var id = target.getAttribute("data-id");
    var handlers = {
        newOrder: openOrderModal,
        newClient: openClientModal,
        editClient: function () { return openClientModal(id); },
        clientHistory: function () { return openClientHistoryModal(id); },
        viewOrder: function () { return openOrderViewModal(id); },
        editOrderStatus: function () { return openOrderEditModal(id); },
        orderState: function () { return openOrderStateModal(id); },
        dashboardTab: function () { return setDashboardTab(target.getAttribute("data-tab")); },
        clearOrderDate: clearOrderDate,
        whatsapp: function () { return openWhatsappMenu(id); },
        storageNotice: function () { return openStorageNoticeModal(id); },
        openStorageOrder: function () { return openStorageOrder(id); },
        prevWeek: function () { return moveScheduleWeek(-7); },
        nextWeek: function () { return moveScheduleWeek(7); },
        todayWeek: function () { return setScheduleDate(localDateInput()); },
        scheduleViewMode: function () { return setScheduleViewMode(target.getAttribute("data-mode")); },
        openMachineBlockModal: openMachineBlockModal,
        saveMachineBlock: function () { return saveMachineBlock(target); },
        rescheduleActiveOrders: rescheduleActiveOrders,
        openFreeSlotFinder: openFreeSlotFinder,
        openUnscheduledOrdersModal: openUnscheduledOrdersModal,
        openCycleEdit: function () { return openCycleEditModal(id, target.getAttribute("data-cycle-id")); },
        saveCycleEdit: function () { return saveCycleEdit(target); },
        deleteCycle: function () { return deleteCycle(id, target.getAttribute("data-cycle-id")); },
        shiftCycle: function () { return shiftCycleMinutes(id, target.getAttribute("data-cycle-id"), target.getAttribute("data-minutes")); },
        moveCycleNextFree: function () { return moveCycleToNextFreeSlot(id, target.getAttribute("data-cycle-id")); },
        moveCycleFreeMachine: function () { return moveCycleToFreeMachine(id, target.getAttribute("data-cycle-id")); },
        finishCycleNow: function () { return finishCycleNow(id, target.getAttribute("data-cycle-id")); },
        assignNextOrder: assignNextOrder,
        openAssignAtSuggestedSlot: function () { return openAssignAtSuggestedSlot(target.getAttribute("data-type")); },
        confirmSuggestedSlot: function () { return confirmSuggestedSlot(target); },
        toggleScheduleAdvancedMode: toggleScheduleAdvancedMode,
        sendWhatsapp: function () { return sendWhatsapp(id, target.getAttribute("data-message-type")); },
        copyWhatsapp: function () { return copyWhatsapp(id, target.getAttribute("data-message-type")); },
        copyNotice: copyVisibleNotice,
        sendStorageNotice: function () { return sendStorageNotice(id); },
        machineEdit: function () { return openMachineModal(target.getAttribute("data-machine")); },
        saveMachineSlot: function () { return saveMachineSlot(target); },
        saveQuickMachineSlot: function () { return saveQuickMachineSlot(target); },
        selectScheduleTicket: function () { return selectScheduleTicket(id); },
        assignSelectedTicketToMachine: function () { return assignSelectedTicketToMachine(target.getAttribute("data-machine"), target.getAttribute("data-machine-type")); },
        scheduleTicketDetail: function () { return openOrderViewModal(id); },
        calculateScheduleFromSelectedTime: calculateScheduleFromSelectedTime,
        cashIncome: function () { return openCashModal("Ingreso"); },
        cashExpense: function () { return openCashModal("Egreso"); },
        openDeleteCashModal: openDeleteCashModal,
        deleteCashEntry: function () { return deleteCashEntry(id); },
        closeCashDay: closeCashDay,
        exportHistoricalCash: exportHistoricalCash,
        exportMonthlyCash: function () { return exportMonthlyCash(target.getAttribute("data-month")); },
        importCsvData: importCsvData,
        unlockCash: unlockCash,
        saveSettings: saveSettings,
        resetDemo: resetDemo,
    };
    if (handlers[action])
        handlers[action]();
});
document.addEventListener("click", function (event) {
    if (event.target.matches("[data-close-modal]"))
        closeModal();
});
document.addEventListener("input", function (event) {
    if (event.target.matches("[data-search-orders], [data-order-date]"))
        applyOrderFilters();
    if (event.target.matches("[data-search-clients]"))
        filterClients(event.target.value);
    if (event.target.matches("[data-preview-field]"))
        updateSchedulePreview(event.target.closest(".modal-backdrop"));
});
document.addEventListener("change", function (event) {
    if (event.target.matches("[data-metrics-month]")) {
        selectedMetricsMonth = event.target.value;
        renderCashReports();
        return;
    }
    if (event.target.matches("[data-schedule-week], [data-schedule-date]")) {
        setScheduleDate(event.target.value);
        return;
    }
    if (event.target.matches("[data-schedule-slot]")) {
        scheduleSlotMinutes = Number(event.target.value || 30);
        renderSchedule();
        return;
    }
    if (event.target.matches("[data-preview-field]")) {
        updateSchedulePreview(event.target.closest(".modal-backdrop"));
        return;
    }
    if (!event.target.matches("[data-service-select]"))
        return;
    var selected = event.target.options[event.target.selectedIndex];
    var form = event.target.closest("form");
    var priceInput = form ? form.querySelector("[name='total']") : null;
    if (priceInput && selected && selected.getAttribute("data-price"))
        priceInput.value = selected.getAttribute("data-price");
});
document.addEventListener("dragstart", function (event) {
    var ticket = event.target.closest("[data-drag-ticket]");
    var cycle = event.target.closest("[data-drag-cycle]");
    if (ticket) {
        draggedScheduleTicketId = Number(ticket.getAttribute("data-order-id") || 0);
        selectedScheduleTicketId = draggedScheduleTicketId;
        if (event.dataTransfer)
            event.dataTransfer.setData("text/plain", "ticket:" + draggedScheduleTicketId);
        ticket.className += " dragging";
        return;
    }
    if (cycle) {
        draggedScheduleCycle = { orderId: cycle.getAttribute("data-id"), cycleId: cycle.getAttribute("data-cycle-id") };
        if (event.dataTransfer)
            event.dataTransfer.setData("text/plain", "cycle:" + draggedScheduleCycle.orderId + ":" + draggedScheduleCycle.cycleId);
    }
});
document.addEventListener("dragend", function () {
    draggedScheduleTicketId = 0;
    draggedScheduleCycle = null;
    forEachNode(document.querySelectorAll(".dragging, .drop-hover"), function (node) {
        node.className = node.className.replace(/\s?dragging/g, "").replace(/\s?drop-hover/g, "");
    });
});
document.addEventListener("dragover", function (event) {
    var dropTime = event.target.closest("[data-drop-time]");
    if (dropTime)
        event.preventDefault();
});
document.addEventListener("drop", function (event) {
    var dropTime = event.target.closest("[data-drop-time]");
    var data = event.dataTransfer ? event.dataTransfer.getData("text/plain") : "";
    if (dropTime) {
        event.preventDefault();
        if (draggedScheduleCycle) {
            moveCycleToTime(draggedScheduleCycle.orderId, draggedScheduleCycle.cycleId, dropTime.getAttribute("data-slot-start"));
            return;
        }
        assignOrderToCalendarTime(draggedScheduleTicketId || Number(String(data).replace("ticket:", "")), dropTime.getAttribute("data-slot-start"));
    }
});
function fourDigitId(id) {
    return leftPad(id, 4, "0");
}
function orderDisplayCode(order) {
    if (order.status === "Retirado")
        return "R#" + fourDigitId(order.id);
    if (!order.location)
        return "Sin depósito#" + fourDigitId(order.id);
    return "".concat(order.location, "#").concat(fourDigitId(order.id));
}
function customerOrderCode(order) {
    return order && order.id ? "#" + fourDigitId(order.id) : "Sin pedido";
}
function itemLineTotal(item) {
    return Number(item.price || 0) * Number(item.quantity || 1);
}
function orderItemsTotal(items) {
    return (items || []).reduce(function (sum, item) { return sum + itemLineTotal(item); }, 0);
}
function itemSummary(order) {
    return (order.items || []).map(function (item) {
        var quantity = Number(item.quantity || 1);
        var prefix = quantity > 1 ? quantity + " x " : "";
        return "".concat(prefix).concat(item.name, " (").concat(money(itemLineTotal(item)), ")");
    }).join(" · ") || serviceSummary(order);
}
function orderItemsHtml(order) {
    var items = order.items || [];
    return "<div class=\"order-items-list\">".concat(items.map(function (item) {
        return "<div class=\"order-item-line\"><span>".concat(Number(item.quantity || 1), " x ").concat(escapeHtml(item.name), "</span><small>").concat(escapeHtml(item.serviceName || serviceSummary(order)), " · unit. ").concat(money(item.price), "</small><strong>").concat(money(itemLineTotal(item)), "</strong></div>");
    }).join("") || "<p>Sin prendas cargadas.</p>", "</div>");
}
function paymentBadge(order) {
    var status = order.paymentStatus || "Pendiente";
    return "<span class=\"payment-badge ".concat(status === "Abonado" ? "paid" : "due", "\">").concat(status === "Abonado" ? "✅ Abonado" : "🟠 Pendiente", "</span>");
}
function paymentMethodLabel(method) {
    return method === "Transferencia" ? "Transferencia" : "Efectivo";
}
function nextFreeLocation() {
    return (availableLocations()[0] && availableLocations()[0].code) || "";
}
var dashboardTab = "Pendiente";
function operationalOrders() {
    return state.orders.filter(function (order) { return !order.block; });
}
function orderGroup(order) {
    if (order.status === "Retirado")
        return "Retirado";
    if (order.status === "Listo")
        return "Listo";
    return "Pendiente";
}
function ordersByGroup(group) {
    return operationalOrders().filter(function (order) { return orderGroup(order) === group; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
}
function setDashboardTab(tab) {
    dashboardTab = tab;
    renderDashboard();
}
function localDateInput(date) {
    if (date === void 0) { date = new Date(); }
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function clearOrderDate() {
    var input = document.getElementById("orderDateFilter");
    if (input)
        input.value = "";
    applyOrderFilters();
}
function applyOrderFilters() {
    var query = (document.getElementById("orderSearch") && document.getElementById("orderSearch").value) || "";
    var date = (document.getElementById("orderDateFilter") && document.getElementById("orderDateFilter").value) || "";
    filterOrders(query, date);
}
function renderDashboard() {
    var groups = ["Pendiente", "Listo", "Retirado"];
    var selectedOrders = ordersByGroup(dashboardTab);
    document.getElementById("dashboard").innerHTML = "\n    <div class=\"simple-home\">\n      <div class=\"home-actions\"><button class=\"primary big-action\" data-action=\"newOrder\">+ Nuevo pedido</button><button class=\"secondary big-action\" data-action=\"newClient\">+ Nuevo cliente</button></div>\n      <div class=\"tabs\">".concat(groups.map(function (group) { return "<button class=\"tab-button ".concat(dashboardTab === group ? "active" : "", "\" data-action=\"dashboardTab\" data-tab=\"").concat(group, "\">").concat(group, "<strong>").concat(ordersByGroup(group).length, "</strong></button>"); }).join(""), "</div>\n      ").concat(orderCards(selectedOrders, "Pedidos ".concat(dashboardTab.toLowerCase(), "s"), true), "\n    </div>");
}
function renderOrders() {
    var today = localDateInput();
    document.getElementById("orders").innerHTML = "\n    <div class=\"card section-card\">\n      <div class=\"toolbar\"><div><p class=\"eyebrow-dark\">Operaci\u00F3n</p><h2>Pedidos</h2></div><button class=\"primary\" data-action=\"newOrder\">+ Nuevo pedido</button></div>\n      <div class=\"filters-row\"><input id=\"orderSearch\" data-search-orders placeholder=\"Buscar por dep\u00F3sito, cliente, tel\u00E9fono, estado u observaciones\" /><label>Fecha<input id=\"orderDateFilter\" data-order-date type=\"date\" value=\"".concat(today, "\" /></label><button class=\"secondary\" data-action=\"clearOrderDate\">Ver todos</button></div>\n    </div>\n    <div id=\"ordersTable\">").concat(orderCards(operationalOrders().filter(function (order) { return dateKey(order.createdAt) === today; }).reverse(), "Pedidos del día", false), "</div>\n  ");
}
window.filterOrders = function (query, date) {
    if (date === void 0) { date = ""; }
    var q = query.toLowerCase();
    var filtered = operationalOrders().filter(function (order) {
        var matchesQuery = "".concat(order.number, " ").concat(order.location || "", " ").concat(orderClient(order), " ").concat(orderDisplayCode(order), " ").concat((getClient(order.clientId) && getClient(order.clientId).phone) || "", " ").concat(order.status, " ").concat(order.notes || "").toLowerCase().includes(q);
        var matchesDate = !date || dateKey(order.createdAt) === date;
        return matchesQuery && matchesDate;
    });
    document.getElementById("ordersTable").innerHTML = orderCards(filtered.reverse(), date ? "Pedidos filtrados" : "Todos los pedidos", false);
};
function orderCards(orders, title, compact) {
    if (compact === void 0) { compact = false; }
    return "\n    <div class=\"card orders-panel\">\n      <h2>".concat(escapeHtml(title), "</h2>\n      <div class=\"order-card-list\">").concat(orders.map(function (order) { return "\n        <article class=\"order-card ".concat(normalizeClass(orderGroup(order)), "\">\n          <div class=\"order-main\"><strong class=\"order-code\">").concat(escapeHtml(orderDisplayCode(order)), "</strong><span class=\"badge ").concat(normalizeClass(orderGroup(order)), "\">").concat(escapeHtml(orderGroup(order)), "</span></div>\n          <div><strong>").concat(escapeHtml(orderClient(order)), "</strong><br><small>Estimado: ").concat(formatDateTime(order.estimate), "</small></div>\n          ").concat(orderItemsHtml(order), "\n          <p class=\"order-notes\">").concat(escapeHtml(order.notes || "Sin observaciones"), "</p>\n          <div class=\"order-meta\"><span>Pago: ").concat(paymentBadge(order), " ").concat(paymentMethodLabel(order.paymentMethod), "</span><span>Total: ").concat(money(order.total), "</span></div>\n          <div class=\"actions\"><button class=\"secondary\" data-action=\"orderState\" data-id=\"").concat(order.id, "\">Estado</button><button class=\"secondary\" data-action=\"editOrderStatus\" data-id=\"").concat(order.id, "\">Editar</button><button class=\"success\" data-action=\"whatsapp\" data-id=\"").concat(order.id, "\">WhatsApp</button></div>\n        </article>"); }).join("") || "<p>No hay pedidos para mostrar.</p>", "</div>\n    </div>");
}
function ordersTable(orders, title) {
    return orderCards(orders, title, false);
}
function clientCards(clients) {
    return clients.map(function (client) { return "<article class=\"client-card\"><div class=\"client-avatar\">👤</div><h3>".concat(escapeHtml(client.name), "</h3><p><strong>Tel:</strong> ").concat(escapeHtml(client.phone), "</p><p><strong>Retira:</strong> ").concat(escapeHtml(client.authorizedPickups || "Solo titular"), "</p><p><strong>Notas:</strong> ").concat(escapeHtml(client.notes || "-"), "</p><div class=\"actions\"><button class=\"success\" data-action=\"clientHistory\" data-id=\"").concat(client.id, "\">Historial</button><button class=\"primary\" data-action=\"editClient\" data-id=\"").concat(client.id, "\">Editar cliente</button></div></article>"); }).join("") || "<p>No hay clientes para mostrar.</p>";
}
function filterClients(query) {
    var value = String(query || "").toLowerCase();
    var filtered = state.clients.filter(function (client) {
        return (client.name + " " + client.phone + " " + (client.address || "") + " " + (client.notes || "") + " " + (client.authorizedPickups || "")).toLowerCase().indexOf(value) !== -1;
    });
    var target = document.getElementById("clientsList");
    if (target)
        target.innerHTML = clientCards(filtered);
}
function renderClients() {
    document.getElementById("clients").innerHTML = "\n    <div class=\"card section-card\">\n      <div class=\"toolbar\"><div><p class=\"eyebrow-dark\">Personas</p><h2>Clientes</h2></div><button class=\"primary\" data-action=\"newClient\">+ Nuevo cliente</button></div>\n      <div class=\"filters-row\"><input id=\"clientSearch\" data-search-clients placeholder=\"Buscar cliente por nombre, teléfono, autorizado o notas\" /></div>\n      <div id=\"clientsList\" class=\"client-card-grid\">".concat(clientCards(state.clients), "</div>\n    </div>");
}
function scheduleMachines() {
    return __spreadArray(__spreadArray([], LaundryScheduler.machineNames("Lavado", state.settings.smallWashers).map(function (name) { return ({ type: "Lavado", name: name }); }), true), LaundryScheduler.machineNames("Secado", state.settings.dryers).map(function (name) { return ({ type: "Secado", name: name }); }), true);
}
function activeScheduleCycles() {
    var cycles = state.orders
        .filter(function (order) { return order.block || order.status === "Pendiente"; })
        .reduce(function (list, order) { return list.concat((order.cycles || []).map(function (cycle, index) { return (__assign(__assign({}, cycle), { order: order, cycleIndex: index, cycleId: cycle.cycleId || String(order.id) + "-" + String(index) })); })); }, [])
        .filter(function (cycle) { return cycle.type !== "Preparación"; })
        .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    return cycles;
}
function calendarScheduleCycles() {
    var cycles = state.orders
        .filter(function (order) { return order.block || (order.cycles || []).length; })
        .reduce(function (list, order) { return list.concat((order.cycles || []).map(function (cycle, index) { return (__assign(__assign({}, cycle), { order: order, cycleIndex: index, cycleId: cycle.cycleId || String(order.id) + "-" + String(index) })); })); }, [])
        .filter(function (cycle) { return cycle.type !== "Preparación"; })
        .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    return cycles;
}
function scheduleVisibleDays() {
    if (scheduleViewMode === "week")
        return currentWeekDays(new Date("".concat(scheduleWeekStart, "T00:00:00")));
    return [new Date("".concat(scheduleSelectedDate, "T00:00:00"))];
}
function setScheduleDate(value) {
    scheduleSelectedDate = value || localDateInput();
    scheduleWeekStart = currentWeekStart(new Date("".concat(scheduleSelectedDate, "T00:00:00"))).toISOString().slice(0, 10);
    renderSchedule();
}
function setScheduleViewMode(mode) {
    scheduleViewMode = mode === "week" ? "week" : "day";
    renderSchedule();
}
function scheduleTimeSlots() {
    var openHour = Number(state.settings.openHour.split(":")[0]);
    var closeHour = Number(state.settings.closeHour.split(":")[0]);
    var slots = [];
    var cursor = openHour * 60;
    var end = closeHour * 60;
    while (cursor < end) {
        slots.push({ minutes: cursor, label: hourLabel(Math.floor(cursor / 60)).replace(":00", ":") + leftPad(cursor % 60, 2, "0") });
        cursor += Number(scheduleSlotMinutes || 30);
    }
    return slots;
}
function cycleOverlapsRange(cycle, start, end) {
    return new Date(cycle.start) < end && new Date(cycle.end) > start;
}
function machineConflicts(machineName, start, end, ignoreOrderId, ignoreCycleId) {
    return activeScheduleCycles().filter(function (cycle) {
        if (cycle.machine !== machineName)
            return false;
        if (ignoreOrderId && cycle.order.id === Number(ignoreOrderId) && String(cycle.cycleId) === String(ignoreCycleId))
            return false;
        return cycleOverlapsRange(cycle, start, end);
    });
}
function nextFreeMachineSlot(type, durationMinutes, fromDate) {
    var machines = scheduleMachines().filter(function (machine) { return machine.type === type; });
    var cursor = LaundryScheduler.normalizeBusinessStart(fromDate || new Date(), state.settings);
    var guard = 0;
    while (guard < 80) {
        for (var index = 0; index < machines.length; index += 1) {
            var end = new Date(cursor.getTime() + Number(durationMinutes || 30) * 60000);
            if (!machineConflicts(machines[index].name, cursor, end).length)
                return { machine: machines[index].name, start: cursor, end: end };
        }
        cursor = new Date(cursor.getTime() + Number(scheduleSlotMinutes || 30) * 60000);
        cursor = LaundryScheduler.normalizeBusinessStart(cursor, state.settings);
        guard += 1;
    }
    return null;
}
function schedulePredictions(activeCycles, machines, days) {
    var now = new Date();
    var todayKey = dateKey(now);
    var occupied = activeCycles.filter(function (cycle) { return cycleOverlapsRange(cycle, now, new Date(now.getTime() + 1)); });
    var today = activeCycles.filter(function (cycle) { return dateKey(cycle.start) === todayKey; });
    var wash = nextFreeMachineSlot("Lavado", state.settings.washingMinutes, now);
    var dry = nextFreeMachineSlot("Secado", state.settings.dryingMinutes, now);
    return { occupied: occupied.length, free: Math.max(0, machines.length - occupied.length), today: today.length, wash: wash, dry: dry, days: days.length };
}
function machineTypeFromCycle(cycle) {
    return cycle && cycle.type === "Secado" ? "Secado" : cycle && cycle.type === "Bloqueo" ? "Reservada" : "Lavando";
}
function currentCycleForMachine(machineName, activeCycles) {
    var now = new Date();
    for (var index = 0; index < activeCycles.length; index += 1) {
        if (activeCycles[index].machine === machineName && cycleOverlapsRange(activeCycles[index], now, new Date(now.getTime() + 1)))
            return activeCycles[index];
    }
    return null;
}
function nextCycleForMachine(machineName, activeCycles) {
    var now = new Date();
    var list = activeCycles.filter(function (cycle) { return cycle.machine === machineName && new Date(cycle.start) >= now; });
    list.sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    return list[0] || null;
}
function machineStatusLabel(machine, currentCycle) {
    if (!currentCycle)
        return "Libre";
    if (currentCycle.type === "Bloqueo")
        return "Reservada";
    return currentCycle.type === "Secado" ? "Secando" : "Lavando";
}
function cyclePersonLabel(cycle) {
    if (!cycle)
        return "Sin trabajo";
    if (cycle.type === "Bloqueo")
        return cycle.description || "Reservada";
    return orderClient(cycle.order) + " · " + orderDisplayCode(cycle.order);
}
function schedulePlanningStart() {
    var date = scheduleSelectedDate || localDateInput();
    var time = state.settings.openHour || "09:00";
    return LaundryScheduler.normalizeBusinessStart(new Date(date + "T" + time + ":00"), state.settings);
}
function pendingScheduleOrders() {
    return operationalOrders().filter(function (order) { return order.status === "Pendiente"; }).sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
}
function estimatedOrderMinutes(order) {
    var service = getService(order.serviceId) || state.services[0];
    var total = 0;
    if (service && service.wash)
        total += Number(state.settings.washingMinutes || 0);
    if (service && service.dry)
        total += Number(state.settings.dryingMinutes || 0);
    return total || Number(state.settings.washingMinutes || 30);
}
function shortTicketLabel(order) {
    var items = order.items || [];
    var count = items.reduce(function (sum, item) { return sum + Number(item.quantity || 1); }, 0);
    return count ? count + " prendas" : serviceSummary(order);
}
function compactOrderTicketHtml(order) {
    var selected = selectedScheduleTicketId === order.id ? " selected-ticket" : "";
    return '<article class="pending-ticket compact-ticket'.concat(selected, '" draggable="true" data-drag-ticket data-order-id="').concat(order.id, '"><button class="pending-ticket-main" data-action="selectScheduleTicket" data-id="').concat(order.id, '"><strong class="pending-ticket-code">').concat(escapeHtml(customerOrderCode(order)), '</strong><span class="pending-ticket-client">').concat(escapeHtml(orderClient(order)), '</span><small class="pending-ticket-meta">').concat(escapeHtml(shortTicketLabel(order)), ' · ').concat(estimatedOrderMinutes(order), ' min</small></button><button class="detail-dot" data-action="scheduleTicketDetail" data-id="').concat(order.id, '">Ver</button></article>');
}
function pendingScheduleTicketsHtml() {
    var orders = pendingScheduleOrders();
    return '<aside class="pending-ticket-column"><div class="pending-ticket-header"><h3>Pendientes</h3><strong>'.concat(orders.length, '</strong></div>').concat(orders.map(compactOrderTicketHtml).join('') || '<p class="empty-mini">Sin pendientes</p>', '</aside>');
}
function compactCycleHtml(cycle) {
    return '<button class="compact-cycle" draggable="true" data-drag-cycle data-id="'.concat(cycle.order.id, '" data-cycle-id="').concat(escapeHtml(cycle.cycleId), '" data-action="openCycleEdit"><strong>').concat(formatShortDateTime(cycle.start).slice(-5), '</strong><span>').concat(escapeHtml(cycle.machine), '</span><em>').concat(escapeHtml(cyclePersonLabel(cycle)), '</em></button>');
}
function dailyScheduleSlots(date, slotMinutes) {
    var slots = [];
    var open = Number(state.settings.openHour.split(":")[0]) * 60;
    var close = Number(state.settings.closeHour.split(":")[0]) * 60;
    var cursor = open;
    while (cursor < close) {
        var start = new Date(date);
        start.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
        slots.push({ start: start, label: leftPad(Math.floor(cursor / 60), 2, "0") + ":" + leftPad(cursor % 60, 2, "0") });
        cursor += Number(slotMinutes || 30);
    }
    return slots;
}
function schedulePrimarySummary(prediction) {
    return '<div class="simple-schedule-summary"><article><span>Lavarropas libres</span><strong>' + freeMachineCount("Lavado") + '/' + Number(state.settings.smallWashers || 0) + '</strong></article><article><span>Secadoras libres</span><strong>' + freeMachineCount("Secado") + '/' + Number(state.settings.dryers || 0) + '</strong></article><article><span>Trabajos de hoy</span><strong>' + prediction.today + '</strong></article></div>';
}
function schedulePredictionHtml(prediction) {
    return '<div class="schedule-prediction-strip"><article><span>Máquinas libres</span><strong>'.concat(prediction.free, '</strong><small>Trabajando: ').concat(prediction.occupied, '</small></article><article><span>Trabajos de hoy</span><strong>').concat(prediction.today, '</strong><small>Lavados, secados y reservas</small></article></div>');
}
function freeMachineCount(type) {
    var activeCycles = activeScheduleCycles();
    var machines = scheduleMachines().filter(function (machine) { return machine.type === type; });
    var now = new Date();
    var occupied = 0;
    machines.forEach(function (machine) {
        if (currentCycleForMachine(machine.name, activeCycles))
            occupied += 1;
    });
    return Math.max(0, machines.length - occupied);
}
function toggleScheduleAdvancedMode() {
    scheduleSimpleMode = !scheduleSimpleMode;
    renderSchedule();
}
function renderSchedule() {
    var machines = scheduleMachines();
    var activeCycles = activeScheduleCycles();
    var calendarCycles = calendarScheduleCycles();
    var prediction = schedulePredictions(activeCycles, machines, [new Date(scheduleSelectedDate + "T00:00:00")]);
    var html = "";
    html += "<div class=\"schedule-workspace\"><main class=\"schedule-main-board\">";
    html += "<div class=\"card schedule-simple-hero\"><div><p class=\"eyebrow-dark\">Turnos</p><h2>Máquinas de hoy</h2></div></div>";
    html += schedulePrimarySummary(prediction);
    html += "<div class=\"card schedule-machine-overview simple-machine-panel\"><div class=\"simple-section-title\"><h3>Lavarropas</h3></div>" + machineBoard(machines.filter(function (machine) { return machine.type === "Lavado"; }), activeCycles) + "<div class=\"simple-section-title\"><h3>Secadoras</h3></div>" + machineBoard(machines.filter(function (machine) { return machine.type === "Secado"; }), activeCycles) + "</div>";
    html += scheduleDayAgendaHtml(calendarCycles, new Date(scheduleSelectedDate + "T00:00:00"));
    html += "<details class=\"card schedule-advanced-actions simple-advanced\"><summary><strong>Opciones manuales</strong></summary><div class=\"schedule-quick-actions simple-manual-actions\"><button class=\"secondary\" data-action=\"openMachineBlockModal\">Reservar máquina</button><button class=\"secondary\" data-action=\"openUnscheduledOrdersModal\">Pedidos sin máquina</button><button class=\"secondary\" data-action=\"openFreeSlotFinder\">Buscar libre</button></div></details>";
    html += "</main>" + pendingScheduleTicketsHtml() + "</div>";
    document.getElementById("schedule").innerHTML = html;
}
function scheduleDayAgendaHtml(calendarCycles, selectedDate) {
    var key = dateKey(selectedDate);
    var dayCycles = calendarCycles.filter(function (cycle) { return dateKey(cycle.start) === key; });
    var slots = dailyScheduleSlots(selectedDate, 30);
    var rows = slots.map(function (slot) {
        var slotEnd = new Date(slot.start.getTime() + 30 * 60000);
        var cycles = dayCycles.filter(function (cycle) { return cycleOverlapsRange(cycle, slot.start, slotEnd); });
        return '<div class="daily-slot" data-drop-time data-slot-start="'.concat(slot.start.toISOString(), '"><strong>').concat(escapeHtml(slot.label), '</strong><div>').concat(cycles.map(compactCycleHtml).join('') || '<span class="slot-empty">Libre</span>', '</div></div>');
    }).join('');
    return '<div class="card day-agenda simple-day-agenda"><div class="simple-section-title"><h3>Agenda de hoy</h3><label class="simple-date-picker">Fecha <input class="week-input" type="date" data-schedule-date value="' + escapeHtml(scheduleSelectedDate) + '" /></label></div><div class="daily-slot-list">' + rows + '</div></div>';
}
function scheduleAgendaGroup(cycles, label) {
    cycles.sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    return '<section class="agenda-group"><h4>' + escapeHtml(label) + '</h4>' + (cycles.map(function (cycle) { return '<article class="agenda-item"><div class="agenda-time"><strong>' + formatShortDateTime(cycle.start).slice(-5) + ' - ' + formatShortDateTime(cycle.end).slice(-5) + '</strong><small>' + escapeHtml(cycle.type) + '</small></div><div class="agenda-machine">' + escapeHtml(cycle.machine) + '</div><div><strong>' + escapeHtml(cyclePersonLabel(cycle)) + '</strong></div><div class="actions mini"><button class="secondary" data-action="openCycleEdit" data-id="' + cycle.order.id + '" data-cycle-id="' + escapeHtml(cycle.cycleId) + '">Mover</button></div></article>'; }).join('') || '<p>Sin trabajos.</p>') + '</section>';
}

function scheduleSlotHtml(day, slot, activeCycles) {
    var start = new Date(day);
    start.setHours(Math.floor(slot.minutes / 60), slot.minutes % 60, 0, 0);
    var end = new Date(start.getTime() + Number(scheduleSlotMinutes || 30) * 60000);
    var cycles = activeCycles.filter(function (cycle) { return cycleOverlapsRange(cycle, start, end); });
    return "<div class=\"timeline-cell schedule-slot\">".concat(cycles.map(function (cycle) { return "<button class=\"timeline-event ".concat(cycle.type === "Lavado" ? "wash" : cycle.type === "Bloqueo" ? "blocked-slot" : "dry", "\" data-action=\"openCycleEdit\" data-id=\"").concat(cycle.order.id, "\" data-cycle-id=\"").concat(escapeHtml(cycle.cycleId), "\"><strong>").concat(escapeHtml(cycle.type === "Bloqueo" ? cycle.description || "Bloqueo" : orderClient(cycle.order)), "</strong><span>").concat(escapeHtml(cycle.type), " · ").concat(escapeHtml(cycle.machine), "</span><small>").concat(formatDateTime(cycle.start), " → ").concat(formatDateTime(cycle.end), "</small></button>"); }).join("") || "<span class=\"free-text\">Libre</span>", "</div>");
}
function setScheduleWeek(value) {
    setScheduleDate(value);
}
function moveScheduleWeek(days) {
    var next = new Date("".concat(scheduleSelectedDate, "T00:00:00"));
    next.setDate(next.getDate() + days);
    setScheduleDate(next.toISOString().slice(0, 10));
}
function machineBoard(machines, activeCycles) {
    return "<div class=\"machine-board simple-machine-grid\">".concat(machines.map(function (machine) {
        var current = currentCycleForMachine(machine.name, activeCycles);
        var status = machineStatusLabel(machine, current);
        var stateClass = current ? current.type === "Bloqueo" ? "reserved" : "working" : "free";
        return "<article class=\"machine simple-machine-card ".concat(stateClass, " type-").concat(normalizeClass(machine.type), "\"><strong>").concat(escapeHtml(machine.name), "</strong><span>").concat(escapeHtml(status), "</span><small>").concat(escapeHtml(current ? cyclePersonLabel(current) : "Libre"), "</small>").concat(current ? "<em>Hasta " + formatShortDateTime(current.end).slice(-5) + "</em>" : "", "</article>");
    }).join(""), "</div>");
}

function cycleOptionHtml(selected) {
    return '<option '.concat(selected === "Lavado" ? "selected" : "", '>Lavado</option><option ').concat(selected === "Secado" ? "selected" : "", '>Secado</option><option ').concat(selected === "Bloqueo" ? "selected" : "", '>Bloqueo</option><option ').concat(selected === "Preparación" ? "selected" : "", '>Preparación</option>');
}
function machineOptionsHtml(selected) {
    return scheduleMachines().map(function (machine) { return '<option value="'.concat(escapeHtml(machine.name), '" ').concat(machine.name === selected ? 'selected' : '', '>').concat(escapeHtml(machine.name), '</option>'); }).join('');
}
function updateSchedulePreview(container) {
    if (!container)
        return;
    var target = container.querySelector(".schedule-preview-note");
    if (!target)
        return;
    var startInput = container.querySelector('[name="start"]');
    var minutesInput = container.querySelector('[name="minutes"]');
    var machineSelect = container.querySelector('[name="machine"]');
    var machineButton = container.querySelector('[data-action="saveMachineSlot"]');
    var machine = machineSelect ? machineSelect.value : machineButton ? machineButton.getAttribute("data-machine") : "";
    var start = startInput ? new Date(startInput.value) : null;
    var minutes = minutesInput ? Number(minutesInput.value || 0) : 0;
    if (!start || isNaN(start.getTime()) || !minutes) {
        target.textContent = "Vista previa: completá inicio y duración.";
        return;
    }
    var end = new Date(start.getTime() + minutes * 60000);
    var conflicts = machine ? machineConflicts(machine, start, end) : [];
    var openMinutes = Number(state.settings.openHour.split(":")[0]) * 60;
    var closeMinutes = Number(state.settings.closeHour.split(":")[0]) * 60;
    var startMinutes = start.getHours() * 60 + start.getMinutes();
    var endMinutes = end.getHours() * 60 + end.getMinutes();
    var outside = startMinutes < openMinutes || endMinutes > closeMinutes;
    target.textContent = "Vista previa: termina " + formatDateTime(end) + (conflicts.length ? " · choca con " + conflicts.length + " trabajo(s)" : " · libre") + (outside ? " · fuera del horario del local" : "");
}
function openMachineModal(machineName) {
    selectedMachine = machineName;
    var activeCycles = activeScheduleCycles();
    var current = currentCycleForMachine(machineName, activeCycles);
    var next = nextCycleForMachine(machineName, activeCycles);
    var machineType = machineName.indexOf("Secadora") === 0 ? "Secado" : "Lavado";
    var defaultMinutes = machineType === "Secado" ? state.settings.dryingMinutes : state.settings.washingMinutes;
    var orderOptions = operationalOrders().filter(function (order) { return order.status === "Pendiente"; }).map(function (order) { return "<option value=\"".concat(order.id, "\">").concat(escapeHtml(orderDisplayCode(order)), " · ").concat(escapeHtml(orderClient(order)), "</option>"); }).join("");
    var statusHtml = current
        ? '<div class="machine-simple-status busy"><span>Ocupada</span><strong>' + escapeHtml(cyclePersonLabel(current)) + '</strong><small>Termina ' + formatShortDateTime(current.end).slice(-5) + '</small></div><div class="machine-simple-actions"><button class="primary" data-action="finishCycleNow" data-id="' + current.order.id + '" data-cycle-id="' + escapeHtml(current.cycleId) + '">Terminó</button><button class="secondary" data-action="shiftCycle" data-minutes="15" data-id="' + current.order.id + '" data-cycle-id="' + escapeHtml(current.cycleId) + '">+15 min</button><button class="secondary" data-action="openCycleEdit" data-id="' + current.order.id + '" data-cycle-id="' + escapeHtml(current.cycleId) + '">Cambiar</button></div>'
        : '<div class="machine-simple-status free"><span>Libre</span><strong>' + escapeHtml(machineName) + '</strong><small>Lista para usar</small></div>';
    var nextHtml = next && (!current || String(next.cycleId) !== String(current.cycleId)) ? '<p class="schedule-help">Sigue: ' + escapeHtml(cyclePersonLabel(next)) + ' a las ' + formatShortDateTime(next.start).slice(-5) + '.</p>' : '';
    var assignHtml = '<details class="simple-assign-details" ' + (current ? '' : 'open') + '><summary>' + (current ? 'Agregar otro trabajo' : 'Asignar pedido ahora') + '</summary><form class="form-grid machine-assign-form simple-assign-form"><label class="full">Pedido<select name="orderId" required>' + (orderOptions || '<option value="">No hay pedidos pendientes</option>') + '</select></label><label>Minutos<input name="minutes" type="number" min="1" value="' + Number(defaultMinutes || 30) + '" required /></label><button class="primary full" type="button" data-action="saveQuickMachineSlot" data-machine="' + escapeHtml(machineName) + '" data-type="' + escapeHtml(machineType) + '">Guardar</button></form></details>';
    openModal(escapeHtml(machineName), '<div class="simple-machine-modal">' + statusHtml + nextHtml + assignHtml + '</div>');
}

function addCycleToOrder(order, cycle) {
    order.cycles = order.cycles || [];
    cycle.cycleId = cycle.cycleId || nextCycleId(order.id, order.cycles.length);
    order.cycles.push(cycle);
    refreshOrderEstimate(order);
}
function saveMachineSlot(button) {
    var form = button.closest("form");
    var data = formDataToObject(form);
    var order = getOrder(data.orderId);
    if (!order) {
        alert("Elegí un pedido activo.");
        return;
    }
    var start = new Date(data.start);
    if (isNaN(start.getTime())) {
        alert("Indicá fecha y hora de inicio.");
        return;
    }
    var minutes = Number(data.minutes || 0);
    if (!minutes) {
        alert("Indicá duración en minutos.");
        return;
    }
    var end = new Date(start.getTime() + minutes * 60000);
    var conflicts = machineConflicts(button.getAttribute("data-machine"), start, end);
    if (conflicts.length && !confirm("Este horario choca con otro trabajo en la misma máquina. ¿Guardar igual?"))
        return;
    addCycleToOrder(order, { type: data.type || "Preparación", machine: button.getAttribute("data-machine"), start: start.toISOString(), end: end.toISOString(), minutes: minutes, manual: true });
    saveState();
    closeModal();
    render();
}
function selectScheduleTicket(id) {
    selectedScheduleTicketId = Number(id || 0);
    renderSchedule();
}
function assignSelectedTicketToMachine(machineName, machineType) {
    if (!selectedScheduleTicketId) {
        openMachineModal(machineName);
        return;
    }
    assignOrderToMachineFromDrop(selectedScheduleTicketId, machineName, machineType);
}
function nextFreeSlotForMachine(machineName, durationMinutes, fromDate) {
    var cursor = LaundryScheduler.normalizeBusinessStart(fromDate || schedulePlanningStart(), state.settings);
    var guard = 0;
    while (guard < 80) {
        var end = new Date(cursor.getTime() + Number(durationMinutes || 30) * 60000);
        if (!machineConflicts(machineName, cursor, end).length)
            return { start: cursor, end: end };
        cursor = new Date(cursor.getTime() + Number(scheduleSlotMinutes || 30) * 60000);
        cursor = LaundryScheduler.normalizeBusinessStart(cursor, state.settings);
        guard += 1;
    }
    return null;
}
function clearAutomaticCycles(order) {
    order.cycles = [];
}
function cyclesForServiceFromType(order, firstType) {
    var service = getService(order.serviceId) || state.services[0];
    var cycles = [];
    if (firstType === "Secado")
        cycles.push({ type: "Secado", minutes: Number(state.settings.dryingMinutes || 50) });
    else {
        cycles.push({ type: "Lavado", minutes: Number(state.settings.washingMinutes || 30) });
        if (service && service.dry)
            cycles.push({ type: "Secado", minutes: Number(state.settings.dryingMinutes || 50) });
    }
    return cycles;
}
function firstAvailableMachine(type, start, minutes, preferredMachine) {
    var machines = scheduleMachines().filter(function (machine) { return machine.type === type; });
    if (preferredMachine)
        machines.sort(function (a, b) { return a.name === preferredMachine ? -1 : b.name === preferredMachine ? 1 : 0; });
    for (var index = 0; index < machines.length; index += 1) {
        var end = LaundryScheduler.addWorkingMinutes(start, minutes, state.settings);
        if (!machineConflicts(machines[index].name, start, end).length)
            return { machine: machines[index].name, start: start, end: end };
    }
    return null;
}
function nextSlotAnyMachine(type, minutes, fromDate, preferredMachine) {
    var cursor = LaundryScheduler.normalizeBusinessStart(fromDate || schedulePlanningStart(), state.settings);
    var guard = 0;
    while (guard < 120) {
        var slot = firstAvailableMachine(type, cursor, minutes, preferredMachine);
        if (slot)
            return slot;
        cursor = new Date(cursor.getTime() + 15 * 60000);
        cursor = LaundryScheduler.normalizeBusinessStart(cursor, state.settings);
        guard += 1;
    }
    return null;
}
function assignOrderSequence(order, firstType, firstMachine, startAt) {
    clearAutomaticCycles(order);
    var cursor = LaundryScheduler.normalizeBusinessStart(startAt || schedulePlanningStart(), state.settings);
    var requested = cyclesForServiceFromType(order, firstType);
    for (var index = 0; index < requested.length; index += 1) {
        var preferred = index === 0 ? firstMachine : "";
        var slot = nextSlotAnyMachine(requested[index].type, requested[index].minutes, cursor, preferred);
        if (!slot)
            return false;
        addCycleToOrder(order, { type: requested[index].type, machine: slot.machine, start: slot.start.toISOString(), end: slot.end.toISOString(), minutes: requested[index].minutes, manual: index === 0 });
        cursor = slot.end;
    }
    return true;
}
function assignOrderToCalendarTime(orderId, slotStart) {
    var order = getOrder(orderId);
    var start = new Date(slotStart);
    if (!order || isNaN(start.getTime()))
        return;
    var service = getService(order.serviceId) || state.services[0];
    var firstType = service && service.dry && !(service && service.wash) ? "Secado" : "Lavado";
    var ok = assignOrderSequence(order, firstType, "", start);
    if (!ok) {
        alert("No hay hueco disponible.");
        return;
    }
    selectedScheduleTicketId = 0;
    saveState();
    renderSchedule();
}
function assignOrderToMachineFromDrop(orderId, machineName, machineType) {
    var order = getOrder(orderId);
    if (!order || !machineName)
        return;
    var ok = assignOrderSequence(order, machineType === "Secado" ? "Secado" : "Lavado", machineName, schedulePlanningStart());
    if (!ok) {
        alert("No hay hueco disponible.");
        return;
    }
    selectedScheduleTicketId = 0;
    saveState();
    renderSchedule();
}

function moveCycleToMachineName(orderId, cycleId, machineName) {
    var found = findOrderCycle(orderId, cycleId);
    if (!found || !machineName)
        return;
    var start = new Date(found.cycle.start);
    var end = new Date(found.cycle.end);
    var conflicts = machineConflicts(machineName, start, end, found.order.id, found.cycle.cycleId);
    if (conflicts.length && !confirm("Esa máquina está ocupada en ese horario. ¿Mover igual?"))
        return;
    found.cycle.machine = machineName;
    found.cycle.manual = true;
    refreshOrderEstimate(found.order);
    saveState();
    renderSchedule();
}
function moveCycleToTime(orderId, cycleId, newStart) {
    var found = findOrderCycle(orderId, cycleId);
    if (!found)
        return;
    var start = new Date(newStart);
    var minutes = Number(found.cycle.minutes || Math.max(1, Math.round((new Date(found.cycle.end) - new Date(found.cycle.start)) / 60000)));
    if (isNaN(start.getTime()) || !minutes)
        return;
    var end = new Date(start.getTime() + minutes * 60000);
    var conflicts = machineConflicts(found.cycle.machine, start, end, found.order.id, found.cycle.cycleId);
    if (conflicts.length && !confirm("Ese horario está ocupado. ¿Mover igual?"))
        return;
    found.cycle.start = start.toISOString();
    found.cycle.end = end.toISOString();
    found.cycle.minutes = minutes;
    found.cycle.manual = true;
    refreshOrderEstimate(found.order);
    saveState();
    renderSchedule();
}
function calculateScheduleFromSelectedTime() {
    var start = schedulePlanningStart();
    var orders = operationalOrders().filter(function (order) { return order.status === "Pendiente" && !order.block; }).sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    orders.forEach(function (order) {
        var manual = (order.cycles || []).filter(function (cycle) { return cycle.manual; });
        order.cycles = manual;
        if (manual.length)
            return;
        var service = getService(order.serviceId) || state.services[0];
        var scheduled = LaundryScheduler.scheduleOrder(state.orders, service, state.settings, start.toISOString());
        order.cycles = scheduled.cycles;
        ensureOrderCycleIds(order);
        refreshOrderEstimate(order);
    });
    saveState();
    renderSchedule();
}
function saveQuickMachineSlot(button) {
    var form = button.closest("form");
    var data = formDataToObject(form);
    var order = getOrder(data.orderId);
    if (!order) {
        alert("Elegí un pedido pendiente.");
        return;
    }
    var start = schedulePlanningStart();
    var minutes = Number(data.minutes || 0);
    if (!minutes) {
        alert("Indicá duración en minutos.");
        return;
    }
    var end = new Date(start.getTime() + minutes * 60000);
    var machine = button.getAttribute("data-machine");
    var conflicts = machineConflicts(machine, start, end);
    if (conflicts.length && !confirm("Esta máquina ya tiene un trabajo en ese horario. ¿Guardarlo igual?"))
        return;
    addCycleToOrder(order, { type: button.getAttribute("data-type") || "Lavado", machine: machine, start: start.toISOString(), end: end.toISOString(), minutes: minutes, manual: true });
    saveState();
    closeModal();
    render();
}
function findOrderCycle(orderId, cycleId) {
    var order = getOrder(orderId);
    if (!order)
        return null;
    ensureOrderCycleIds(order);
    for (var index = 0; index < (order.cycles || []).length; index += 1) {
        if (String(order.cycles[index].cycleId) === String(cycleId))
            return { order: order, cycle: order.cycles[index], index: index };
    }
    return null;
}
function openCycleEditModal(orderId, cycleId) {
    var found = findOrderCycle(orderId, cycleId);
    if (!found)
        return;
    var cycle = found.cycle;
    var start = localDateTimeValue(cycle.start);
    var html = '<div class="cycle-quick-actions"><button class="cycle-quick-button" data-action="shiftCycle" data-minutes="15" data-id="'.concat(found.order.id, '" data-cycle-id="').concat(escapeHtml(cycle.cycleId), '">+15 min</button><button class="cycle-quick-button" data-action="shiftCycle" data-minutes="-15" data-id="').concat(found.order.id, '" data-cycle-id="').concat(escapeHtml(cycle.cycleId), '">-15 min</button><button class="cycle-quick-button" data-action="moveCycleNextFree" data-id="').concat(found.order.id, '" data-cycle-id="').concat(escapeHtml(cycle.cycleId), '">Mover al próximo hueco</button><button class="cycle-quick-button" data-action="moveCycleFreeMachine" data-id="').concat(found.order.id, '" data-cycle-id="').concat(escapeHtml(cycle.cycleId), '">Cambiar a otra máquina libre</button><button class="cycle-quick-button" data-action="finishCycleNow" data-id="').concat(found.order.id, '" data-cycle-id="').concat(escapeHtml(cycle.cycleId), '">Termina ahora</button><button class="cycle-quick-button danger" data-action="deleteCycle" data-id="').concat(found.order.id, '" data-cycle-id="').concat(escapeHtml(cycle.cycleId), '">Borrar turno</button></div><form class="form-grid"><label>Máquina<select name="machine" data-preview-field>').concat(machineOptionsHtml(cycle.machine), '</select></label><label>Tipo<select name="type">').concat(cycleOptionHtml(cycle.type), '</select></label><label>Inicio<input name="start" type="datetime-local" required data-preview-field value="').concat(escapeHtml(start), '" /></label><label>Minutos<input name="minutes" type="number" min="1" required data-preview-field value="').concat(Number(cycle.minutes || Math.max(1, Math.round((new Date(cycle.end) - new Date(cycle.start)) / 60000))), '" /></label><p class="full schedule-preview-note">Vista previa: cambiá inicio, duración o máquina para recalcular.</p><label class="full">Descripción / nota<input name="description" value="').concat(escapeHtml(cycle.description || ""), '" /></label><button class="primary full" type="button" data-action="saveCycleEdit" data-id="').concat(found.order.id, '" data-cycle-id="').concat(escapeHtml(cycle.cycleId), '">Guardar turno</button></form>');
    openModal("Editar turno", html);
}
function localDateTimeValue(value) {
    var date = new Date(value);
    if (isNaN(date.getTime()))
        return "";
    return date.getFullYear() + "-" + leftPad(date.getMonth() + 1, 2, "0") + "-" + leftPad(date.getDate(), 2, "0") + "T" + leftPad(date.getHours(), 2, "0") + ":" + leftPad(date.getMinutes(), 2, "0");
}
function saveCycleEdit(button) {
    var found = findOrderCycle(button.getAttribute("data-id"), button.getAttribute("data-cycle-id"));
    if (!found)
        return;
    var data = formDataToObject(button.closest("form"));
    var start = new Date(data.start);
    var minutes = Number(data.minutes || 0);
    if (isNaN(start.getTime()) || !minutes) {
        alert("Revisá inicio y duración.");
        return;
    }
    var end = new Date(start.getTime() + minutes * 60000);
    var conflicts = machineConflicts(data.machine, start, end, found.order.id, found.cycle.cycleId);
    if (conflicts.length && !confirm("Este horario choca con otro trabajo en la misma máquina. ¿Guardar igual?"))
        return;
    found.cycle.machine = data.machine;
    found.cycle.type = data.type;
    found.cycle.start = start.toISOString();
    found.cycle.end = end.toISOString();
    found.cycle.minutes = minutes;
    found.cycle.description = data.description || "";
    found.cycle.manual = true;
    refreshOrderEstimate(found.order);
    saveState();
    closeModal();
    render();
}
function deleteCycle(orderId, cycleId) {
    var found = findOrderCycle(orderId, cycleId);
    if (!found || !confirm("¿Borrar este turno?"))
        return;
    found.order.cycles.splice(found.index, 1);
    refreshOrderEstimate(found.order);
    saveState();
    closeModal();
    render();
}
function saveCycleAndRefresh(found) {
    refreshOrderEstimate(found.order);
    saveState();
    closeModal();
    render();
}
function shiftCycleMinutes(orderId, cycleId, minutes) {
    var found = findOrderCycle(orderId, cycleId);
    if (!found)
        return;
    var delta = Number(minutes || 0) * 60000;
    found.cycle.start = new Date(new Date(found.cycle.start).getTime() + delta).toISOString();
    found.cycle.end = new Date(new Date(found.cycle.end).getTime() + delta).toISOString();
    found.cycle.manual = true;
    saveCycleAndRefresh(found);
}
function moveCycleToNextFreeSlot(orderId, cycleId) {
    var found = findOrderCycle(orderId, cycleId);
    if (!found)
        return;
    var minutes = Number(found.cycle.minutes || Math.max(1, Math.round((new Date(found.cycle.end) - new Date(found.cycle.start)) / 60000)));
    var slot = nextFreeMachineSlot(found.cycle.type === "Secado" ? "Secado" : "Lavado", minutes, new Date());
    if (!slot) {
        alert("No encontré un hueco libre cercano.");
        return;
    }
    found.cycle.machine = slot.machine;
    found.cycle.start = slot.start.toISOString();
    found.cycle.end = slot.end.toISOString();
    found.cycle.manual = true;
    saveCycleAndRefresh(found);
}
function moveCycleToFreeMachine(orderId, cycleId) {
    var found = findOrderCycle(orderId, cycleId);
    if (!found)
        return;
    var start = new Date(found.cycle.start);
    var end = new Date(found.cycle.end);
    var machines = scheduleMachines().filter(function (machine) { return found.cycle.type === "Secado" ? machine.type === "Secado" : machine.type === "Lavado"; });
    for (var index = 0; index < machines.length; index += 1) {
        if (machines[index].name !== found.cycle.machine && !machineConflicts(machines[index].name, start, end, found.order.id, found.cycle.cycleId).length) {
            found.cycle.machine = machines[index].name;
            found.cycle.manual = true;
            saveCycleAndRefresh(found);
            return;
        }
    }
    alert("No hay otra máquina libre en ese mismo horario.");
}
function finishCycleNow(orderId, cycleId) {
    var found = findOrderCycle(orderId, cycleId);
    if (!found)
        return;
    found.cycle.end = new Date().toISOString();
    found.cycle.minutes = Math.max(1, Math.round((new Date(found.cycle.end) - new Date(found.cycle.start)) / 60000));
    found.cycle.manual = true;
    saveCycleAndRefresh(found);
}
function firstPendingOrderWithoutCycle() {
    var orders = operationalOrders().filter(function (order) { return order.status === "Pendiente" && !(order.cycles || []).length; });
    if (!orders.length)
        orders = operationalOrders().filter(function (order) { return order.status === "Pendiente"; });
    orders.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    return orders[0] || null;
}
function openAssignAtSuggestedSlot(type) {
    var order = firstPendingOrderWithoutCycle();
    var duration = type === "Secado" ? state.settings.dryingMinutes : state.settings.washingMinutes;
    var slot = nextFreeMachineSlot(type, duration, schedulePlanningStart());
    if (!slot) {
        alert("No encontré una máquina libre cercana.");
        return;
    }
    openSuggestedAssignModal(type, slot, order);
}
function assignNextOrder() {
    var order = firstPendingOrderWithoutCycle();
    if (!order) {
        alert("No hay pedidos pendientes para asignar.");
        return;
    }
    var type = getService(order.serviceId) && getService(order.serviceId).dry && !getService(order.serviceId).wash ? "Secado" : "Lavado";
    var duration = type === "Secado" ? state.settings.dryingMinutes : state.settings.washingMinutes;
    var slot = nextFreeMachineSlot(type, duration, schedulePlanningStart());
    if (!slot) {
        alert("No encontré un hueco libre cercano.");
        return;
    }
    openSuggestedAssignModal(type, slot, order);
}
function openSuggestedAssignModal(type, slot, selectedOrder) {
    var orders = operationalOrders().filter(function (order) { return order.status === "Pendiente"; });
    var options = orders.map(function (order) { return '<option value="'.concat(order.id, '" ').concat(selectedOrder && selectedOrder.id === order.id ? 'selected' : '', '>').concat(escapeHtml(orderDisplayCode(order)), ' · ').concat(escapeHtml(orderClient(order)), '</option>'); }).join('');
    var html = '<form class="form-grid"><p class="full"><strong>'.concat(escapeHtml(slot.machine), '</strong> · ').concat(formatShortDateTime(slot.start), ' a ').concat(formatShortDateTime(slot.end).slice(-5), '</p><label class="full">Pedido<select name="orderId" required>').concat(options, '</select></label><button class="primary full" type="button" data-action="confirmSuggestedSlot" data-type="').concat(escapeHtml(type), '" data-machine="').concat(escapeHtml(slot.machine), '" data-start="').concat(slot.start.toISOString(), '" data-minutes="').concat(Math.round((slot.end - slot.start) / 60000), '">Asignar</button></form>');
    openModal("Asignar próximo pedido", html);
}
function confirmSuggestedSlot(button) {
    var form = button.closest("form");
    var data = formDataToObject(form);
    var order = getOrder(data.orderId);
    if (!order)
        return;
    var start = new Date(button.getAttribute("data-start"));
    var minutes = Number(button.getAttribute("data-minutes") || 30);
    addCycleToOrder(order, { type: button.getAttribute("data-type"), machine: button.getAttribute("data-machine"), start: start.toISOString(), end: new Date(start.getTime() + minutes * 60000).toISOString(), minutes: minutes, manual: true });
    saveState();
    closeModal();
    render();
}
function openMachineBlockModal() {
    var html = '<form class="form-grid"><label>Máquina<select name="machine" data-preview-field>'.concat(machineOptionsHtml(""), '</select></label><label>Inicio<input name="start" type="datetime-local" required data-preview-field /></label><label>Minutos<input name="minutes" type="number" min="1" value="60" required data-preview-field /></label><p class="full schedule-preview-note">Vista previa: completá inicio y duración.</p><label class="full">Motivo<input name="description" value="Mantenimiento" /></label><button class="primary full" type="button" data-action="saveMachineBlock">Guardar bloqueo</button></form>');
    openModal("Bloqueo / mantenimiento", html);
}
function saveMachineBlock(button) {
    var data = formDataToObject(button.closest("form"));
    var start = new Date(data.start);
    var minutes = Number(data.minutes || 0);
    if (isNaN(start.getTime()) || !minutes) {
        alert("Revisá inicio y duración.");
        return;
    }
    var blockOrder = { id: nextId(state.orders), number: "", clientId: 0, serviceId: 0, createdAt: new Date().toISOString(), estimate: start.toISOString(), cycles: [], status: "Pendiente", items: [{ name: data.description || "Bloqueo", quantity: 1, price: 0 }], total: 0, location: "", notes: "Bloqueo de máquina", paymentStatus: "Pendiente", paymentMethod: "Efectivo", block: true };
    blockOrder.number = "B#" + fourDigitId(blockOrder.id);
    addCycleToOrder(blockOrder, { type: "Bloqueo", machine: data.machine, start: start.toISOString(), end: new Date(start.getTime() + minutes * 60000).toISOString(), minutes: minutes, manual: true, description: data.description || "Bloqueo" });
    state.orders.push(blockOrder);
    saveState();
    closeModal();
    render();
}
function rescheduleActiveOrders() {
    calculateScheduleFromSelectedTime();
}

function openFreeSlotFinder() {
    var wash = nextFreeMachineSlot("Lavado", state.settings.washingMinutes, schedulePlanningStart());
    var dry = nextFreeMachineSlot("Secado", state.settings.dryingMinutes, schedulePlanningStart());
    openModal("Huecos libres", '<div class="schedule-free-slots"><article><h3>Lavado</h3><p>'.concat(wash ? escapeHtml(wash.machine) + ' · ' + formatDateTime(wash.start) : 'Sin hueco cercano', '</p></article><article><h3>Secado</h3><p>').concat(dry ? escapeHtml(dry.machine) + ' · ' + formatDateTime(dry.start) : 'Sin hueco cercano', '</p></article></div>'));
}
function openUnscheduledOrdersModal() {
    var orders = operationalOrders().filter(function (order) { return order.status !== "Retirado" && !(order.cycles || []).length; });
    openModal("Pedidos sin turno", '<div class="history-list">'.concat(orders.map(function (order) { return '<article class="history-item"><strong>'.concat(escapeHtml(orderDisplayCode(order)), '</strong><span>').concat(escapeHtml(orderClient(order)), '</span><button class="secondary" data-action="viewOrder" data-id="').concat(order.id, '">Ver</button></article>'); }).join('') || '<p>No hay pedidos sin turno.</p>', '</div>'));
}

function renderStorage() {
    var occupied = {};
    operationalOrders().filter(function (order) { return order.location && order.status !== "Retirado"; }).forEach(function (order) {
        occupied[order.location] = order;
    });
    document.getElementById("storage").innerHTML = "\n    <div class=\"card hero-card\"><div><p class=\"eyebrow-dark\">Dep\u00F3sito</p><h2>Ubicaciones y aviso de guarda</h2><p>Hac\u00E9 clic en una ubicaci\u00F3n ocupada para abrir el pedido correspondiente.</p></div><button class=\"secondary\" data-action=\"storageNotice\">Ver aviso general</button></div>\n    <div class=\"storage-grid\">".concat(state.locations.map(function (location) {
        var order = occupied[location.code];
        return order
            ? "<button class=\"location busy location-button\" data-action=\"openStorageOrder\" data-id=\"".concat(order.id, "\"><h3>").concat(escapeHtml(location.code), "</h3><strong>").concat(escapeHtml(orderDisplayCode(order)), "</strong><span>").concat(escapeHtml(orderClient(order)), "</span><small>").concat(escapeHtml(order.status), "</small></button>")
            : "<article class=\"location free\"><h3>".concat(escapeHtml(location.code), "</h3>Libre</article>");
    }).join(""), "</div>");
}
function openStorageOrder(id) {
    setView("orders");
    var input = document.getElementById("orderSearch");
    var order = getOrder(id);
    if (input && order) {
        input.value = orderDisplayCode(order);
        filterOrders(orderDisplayCode(order));
    }
    openOrderViewModal(id);
}
function cashReportHtml() {
    var rows = monthlyCashSummary();
    var latest = rows[rows.length - 1] || { month: "Sin datos", income: 0, expense: 0, balance: 0, margin: 0, orders: 0, topClients: [], hourlyCounts: emptyHourlyCounts() };
    if (!selectedMetricsMonth && rows.length)
        selectedMetricsMonth = latest.month;
    var selected = rows.find(function (row) { return row.month === selectedMetricsMonth; }) || latest;
    var bestBalance = rows.reduce(function (best, row) { return !best || row.balance > best.balance ? row : best; }, null);
    var topClientHtml = (selected.topClients || []).map(function (client, index) {
        return '<button class="top-client-link" class="success" data-action="clientHistory" data-id="'.concat(client.id, '"><span>#').concat(index + 1, '</span><strong>').concat(escapeHtml(client.name), '</strong><small>').concat(client.count, ' pedidos</small></button>');
    }).join('') || '<p>Sin clientes en este mes.</p>';
    return '\n    <div class="card report-panel metrics-panel"><div class="toolbar"><div><p class="eyebrow-dark">Métricas</p><h2>Resumen mensual</h2><p>Elegí un mes para ver ingresos, egresos, margen, clientes fuertes y horas pico.</p></div>'.concat(rows.length ? monthSelectorHtml(rows, selected.month) : '', '</div>\n      <div class="grid four report-metrics metric-hero-grid">\n        <article class="mini-metric metric-glow"><span>Ingresos mes elegido</span><strong>').concat(money(selected.income), '</strong><small>Egresos: ').concat(money(selected.expense), '</small></article>\n        <article class="mini-metric metric-glow"><span>Margen del mes</span><strong>').concat(selected.margin, '%</strong><small>Saldo: ').concat(money(selected.balance), '</small></article>\n        <article class="mini-metric metric-glow"><span>Total pedidos por mes</span><strong>').concat(selected.orders, '</strong><small>').concat(escapeHtml(selected.month), '</small></article>\n        <article class="mini-metric metric-glow"><span>Mejor mes histórico</span><strong>').concat(bestBalance ? escapeHtml(bestBalance.month) : 'Sin datos', '</strong><small>').concat(bestBalance ? money(bestBalance.balance) : 'Cerrá caja para comparar', '</small></article>\n      </div>\n      <div class="metrics-focus-grid"><article class="metric-month-card"><h3>Top 3 clientes del mes</h3><div class="top-client-list">').concat(topClientHtml, '</div></article><article class="metric-month-card"><h3>Pedidos por hora</h3>').concat(orderHourLineChart(selected), '</article></div>\n      ').concat(monthlyCashHtml(selected.month), '\n    </div>');
}
function renderCash() {
    if (!cashUnlocked) {
        document.getElementById("cash").innerHTML = '<div class="card"><h2>Caja protegida</h2><p>Ingresá la clave del dueño para ver ingresos, egresos y saldos.</p><div class="form-grid"><label>Clave<input id="cashPinUnlock" type="password" placeholder="Clave" /></label></div><br><button class="primary" data-action="unlockCash">Entrar</button><p><small>La clave inicial es 1234 y puede cambiarse desde Configuración.</small></p></div>';
        return;
    }
    var income = state.cash.filter(function (entry) { return entry.type === "Ingreso"; }).reduce(function (sum, entry) { return sum + Number(entry.amount); }, 0);
    var expense = state.cash.filter(function (entry) { return entry.type === "Egreso"; }).reduce(function (sum, entry) { return sum + Number(entry.amount); }, 0);
    var cash = state.cash.filter(function (entry) { return entry.method === "Efectivo"; }).reduce(function (sum, entry) { return sum + (entry.type === "Ingreso" ? Number(entry.amount) : -Number(entry.amount)); }, 0);
    var transfer = state.cash.filter(function (entry) { return entry.method === "Transferencia"; }).reduce(function (sum, entry) { return sum + (entry.type === "Ingreso" ? Number(entry.amount) : -Number(entry.amount)); }, 0);
    document.getElementById("cash").innerHTML = '\n    <div class="grid four"><article class="card metric"><span>Ingresos</span><strong>'.concat(money(income), '</strong></article><article class="card metric"><span>Egresos</span><strong>').concat(money(expense), '</strong></article><article class="card metric"><span>Efectivo</span><strong>').concat(money(cash), '</strong></article><article class="card metric"><span>Transferencia</span><strong>').concat(money(transfer), '</strong></article></div>\n    <div class="card cash-day-hero"><div><p class="eyebrow-dark">Cierre diario</p><h2>Empezar nuevo día</h2><p>Guarda todos los movimientos actuales en la caja histórica y deja la caja diaria en cero.</p></div><button class="danger big-action new-day-button" data-action="closeCashDay">Empezar nuevo día</button></div>\n    <div class="card cash-section"><div class="toolbar"><h2>Caja del día / movimientos</h2><div class="actions"><button class="success" data-action="cashIncome">+ Ingreso</button><button class="danger" data-action="cashExpense">+ Egreso</button><button class="secondary" data-action="openDeleteCashModal">Borrar movimiento</button><button class="secondary" data-action="exportHistoricalCash">Exportar caja histórica CSV</button></div></div>').concat(cashTable(), '</div>');
}
function cashTable() {
    var entries = __spreadArray([], state.cash, true).sort(function (a, b) {
        if (a.type !== b.type)
            return a.type === "Ingreso" ? -1 : 1;
        return new Date(b.date) - new Date(a.date);
    });
    var income = state.cash.filter(function (entry) { return entry.type === "Ingreso"; }).reduce(function (sum, entry) { return sum + Number(entry.amount || 0); }, 0);
    var expense = state.cash.filter(function (entry) { return entry.type === "Egreso"; }).reduce(function (sum, entry) { return sum + Number(entry.amount || 0); }, 0);
    var balance = income - expense;
    return '<div class="table-wrap"><table class="cash-movements-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Medio</th><th>Importe</th></tr></thead><tbody>'.concat(entries.map(function (entry) { return '<tr class="'.concat(entry.type === "Ingreso" ? "cash-income-row" : "cash-expense-row", '"><td>').concat(formatDateTime(entry.date), '</td><td><span class="cash-type-badge ').concat(entry.type === "Ingreso" ? "income" : "expense", '">').concat(escapeHtml(entry.type), '</span></td><td>').concat(escapeHtml(entry.category), '</td><td>').concat(escapeHtml(entry.description), '</td><td>').concat(paymentMethodLabel(entry.method), '</td><td>').concat(money(entry.amount), '</td></tr>'); }).join('') || '<tr><td colspan="6">Sin movimientos.</td></tr>', '</tbody><tfoot><tr><th colspan="5">Total ingresos</th><th>').concat(money(income), '</th></tr><tr><th colspan="5">Total egresos</th><th>').concat(money(expense), '</th></tr><tr><th colspan="5">Saldo final</th><th>').concat(money(balance), '</th></tr></tfoot></table></div>');
}
function renderCashReports() {
    if (!cashUnlocked) {
        document.getElementById("cashReports").innerHTML = "<div class=\"card\"><h2>Métricas protegidas</h2><p>Ingresá la clave de métricas para ver gráficos, insights y comparaciones de caja.</p><div class=\"form-grid\"><label>Clave<input id=\"metricsPinUnlock\" type=\"password\" placeholder=\"Clave\" /></label></div><br><button class=\"primary\" data-action=\"unlockCash\">Entrar</button></div>";
        return;
    }
    document.getElementById("cashReports").innerHTML = cashReportHtml();
}
function renderSettings() {
    document.getElementById("settings").innerHTML = "\n    <div class=\"card\"><h2>Configuración</h2><div class=\"form-grid\">\n      <label>Apertura<input id=\"openHour\" type=\"time\" value=\"".concat(escapeHtml(state.settings.openHour), "\" /></label>\n      <label>Cierre<input id=\"closeHour\" type=\"time\" value=\"").concat(escapeHtml(state.settings.closeHour), "\" /></label>\n      <label>Lavarropas chicos<input id=\"smallWashers\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.smallWashers), "\" /></label>\n      <label>Secadoras<input id=\"dryers\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.dryers), "\" /></label>\n      <label>Minutos lavado<input id=\"washingMinutes\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.washingMinutes), "\" /></label>\n      <label>Minutos secado<input id=\"dryingMinutes\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.dryingMinutes), "\" /></label>\n      <label>Clave de caja<input id=\"cashPin\" type=\"password\" value=\"").concat(escapeHtml(state.settings.cashPin), "\" /></label>\n      <label>Clave de métricas<input id=\"metricsPin\" type=\"password\" value=\"").concat(escapeHtml(state.settings.metricsPin), "\" /></label>\n      <label class=\"full\">WhatsApp pedido recibido<textarea id=\"whatsappReceivedMessage\">").concat(escapeHtml(state.settings.whatsappReceivedMessage), "</textarea></label>\n      <label class=\"full\">WhatsApp pedido listo<textarea id=\"whatsappMessage\">").concat(escapeHtml(state.settings.whatsappMessage), "</textarea></label>\n      <label class=\"full\">WhatsApp retirado<textarea id=\"whatsappRetiredMessage\">").concat(escapeHtml(state.settings.whatsappRetiredMessage), "</textarea></label>\n      <label>Días para aviso depósito<input id=\"storageNoticeDays\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.storageNoticeDays), "\" /></label>\n      <label class=\"full\">Cartel de depósito<textarea id=\"storageNoticeText\">").concat(escapeHtml(state.settings.storageNoticeText), "</textarea></label>\n    </div><br><div class=\"actions\"><button class=\"primary\" data-action=\"saveSettings\">Guardar</button><button class=\"danger\" data-action=\"resetDemo\">Reiniciar demo</button></div></div>\n    <div class=\"card\"><h2>Importar CSV</h2><p>Importá clientes o pedidos desde un archivo CSV separado por coma o punto y coma. No borra los datos actuales.</p><div class=\"form-grid\"><label>Tipo de datos<select id=\"csvImportType\"><option value=\"clients\">Clientes</option><option value=\"orders\">Pedidos</option></select></label><label>Archivo CSV<input id=\"csvImportFile\" type=\"file\" accept=\".csv,text/csv\" /></label><p class=\"full\"><strong>Columnas clientes:</strong> nombre, telefono, direccion, notas, autorizados. <strong>Columnas pedidos:</strong> cliente, telefono, prenda, cantidad, precio, estado, pago, medio, deposito, notas.</p></div><br><button class=\"secondary\" data-action=\"importCsvData\">Importar CSV seleccionado</button></div>");
}
function openModal(title, html, onSubmit) {
    var template = document.getElementById("modalTemplate").content.cloneNode(true);
    template.querySelector("h2").textContent = title;
    template.querySelector(".modal-body").innerHTML = html;
    document.body.appendChild(template);
    var modal = document.querySelector(".modal-backdrop");
    var form = modal.querySelector("form");
    if (form)
        form.addEventListener("submit", function (event) { event.preventDefault(); if (onSubmit)
            onSubmit(form); });
    return modal;
}
function closeModal() {
    var modal = document.querySelector(".modal-backdrop");
    if (modal)
        modal.remove();
}
function openClientModal(id) {
    var client = id ? getClient(id) : { name: "", phone: "", address: "", notes: "", authorizedPickups: "" };
    openModal(id ? "Editar cliente" : "Nuevo cliente", "<form class=\"form-grid\"><label>Nombre<input name=\"name\" required value=\"".concat(escapeHtml(client.name), "\" /></label><label>Tel\u00E9fono WhatsApp<input name=\"phone\" required value=\"").concat(escapeHtml(client.phone), "\" /></label><label>Direcci\u00F3n<input name=\"address\" value=\"").concat(escapeHtml(client.address || ""), "\" /></label><label>Autorizados a retirar<input name=\"authorizedPickups\" placeholder=\"Ej: hijo Juan DNI...\" value=\"").concat(escapeHtml(client.authorizedPickups || ""), "\" /></label><label class=\"full\">Notas<input name=\"notes\" value=\"").concat(escapeHtml(client.notes || ""), "\" /></label><button class=\"primary full\">Guardar cliente</button></form>"), function (form) {
        var data = formDataToObject(form);
        if (id)
            for (var key in data) { if (Object.prototype.hasOwnProperty.call(data, key)) client[key] = data[key]; }
        else
            state.clients.push(__assign({ id: nextId(state.clients) }, data));
        saveState();
        closeModal();
        render();
    });
}
function clientIdFromInput(form) {
    var input = form.querySelector("[data-client-autocomplete]");
    var value = input ? input.value : "";
    var normalized = value.toLowerCase();
    var matchedClientId = 0;
    var matchCount = 0;
    for (var index = 0; index < state.clients.length; index += 1) {
        var client = state.clients[index];
        var label = client.name + " · " + client.phone;
        if (value === label)
            return client.id;
        if (normalized && label.toLowerCase().indexOf(normalized) !== -1) {
            matchedClientId = client.id;
            matchCount += 1;
        }
    }
    return matchCount === 1 ? matchedClientId : 0;
}
function attachClientAutocomplete(modal) {
    var input = modal.querySelector("[data-client-autocomplete]");
    var hidden = modal.querySelector('[name="clientId"]');
    if (!input || !hidden)
        return;
    input.addEventListener("input", function () {
        hidden.value = "";
        var value = input.value;
        for (var index = 0; index < state.clients.length; index += 1) {
            var client = state.clients[index];
            if (value === client.name + " · " + client.phone) {
                hidden.value = client.id;
                return;
            }
        }
    });
}
function openOrderModal() {
    var defaultLocation = nextFreeLocation();
    var firstService = state.services[0];
    var modal = openModal("Nuevo pedido", '<form class="form-grid">\n    <label class="full">Cliente<input name="clientSearch" data-client-autocomplete list="clientOptions" placeholder="Escribí nombre o teléfono" required /><input name="clientId" type="hidden" /><datalist id="clientOptions">'.concat(state.clients.map(function (client) { return '<option value="'.concat(escapeHtml(client.name), ' · ').concat(escapeHtml(client.phone), '" data-id="').concat(client.id, '"></option>'); }).join(''), '</datalist></label>\n    <label>Depósito<select name="location" required>').concat(availableLocations().map(function (location) { return '<option '.concat(location.code === defaultLocation ? 'selected' : '', '>').concat(escapeHtml(location.code), '</option>'); }).join(''), '</select></label>\n    <label>Pago<select name="paymentStatus"><option>Pendiente</option><option>Abonado</option></select></label>\n    <label>Medio de pago<select name="paymentMethod"><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option></select></label>\n    <div class="full items-builder"><h3>Prendas / trabajos</h3><div data-items-list>\n      ').concat(orderItemRow((firstService && firstService.id) || 1, (firstService && firstService.price) || 0, "", 1), '\n    </div><button class="secondary" type="button" data-add-item>+ Agregar prenda</button></div>\n    <label>Precio total<input name="total" data-items-total type="number" min="0" readonly value="').concat((firstService && firstService.price) || 0, '" /></label>\n    <label class="full">Observaciones<textarea name="notes" placeholder="Ej: Frasada polar roja, manchas, preferencias..."></textarea></label>\n    <button class="primary full">Crear pedido</button>\n  </form>'), function (form) {
        var data = formDataToObject(form);
        var selectedClientId = clientIdFromInput(form);
        if (!selectedClientId) {
            alert("Elegí un cliente válido de la lista.");
            return;
        }
        var createdAt = new Date().toISOString();
        var items = collectItems(form);
        var primaryService = getService((items[0] && items[0].serviceId) || (firstService && firstService.id));
        var schedule = createOrderSchedule(primaryService, createdAt);
        var orderId = nextId(state.orders);
        var location = data.location || nextFreeLocation();
        var total = orderItemsTotal(items);
        var order = { id: orderId, number: "", clientId: Number(selectedClientId), serviceId: Number(primaryService.id), createdAt: createdAt, estimate: schedule.estimate, cycles: schedule.cycles, status: "Pendiente", items: items, total: total, location: location, notes: data.notes, paymentStatus: data.paymentStatus, paymentMethod: data.paymentMethod };
        ensureOrderCycleIds(order);
        order.number = orderDisplayCode(order);
        state.orders.push(order);
        if (order.paymentStatus === "Abonado")
            syncOrderPayment(order);
        saveState();
        closeModal();
        render();
    });
    attachClientAutocomplete(modal);
    attachItemBuilder(modal);
}
function orderItemRow(serviceId, price, name, quantity) {
    if (name === void 0) { name = ""; }
    if (quantity === void 0) { quantity = 1; }
    return "<div class=\"item-row\"><input name=\"itemQuantity\" type=\"number\" min=\"1\" value=\"".concat(Number(quantity || 1), "\" aria-label=\"Cantidad\" /><input name=\"itemName\" placeholder=\"Ej: Frasada polar roja\" value=\"").concat(escapeHtml(name), "\" /><select name=\"itemService\">").concat(state.services.map(function (service) { return "<option value=\"".concat(service.id, "\" data-price=\"").concat(service.price, "\" ").concat(Number(service.id) === Number(serviceId) ? "selected" : "", ">").concat(escapeHtml(service.name), "</option>"); }).join(""), "</select><input name=\"itemPrice\" type=\"number\" min=\"0\" value=\"").concat(Number(price || 0), "\" /><button class=\"danger\" type=\"button\" data-remove-item>×</button></div>");
}
function attachItemBuilder(modal) {
    var list = modal.querySelector("[data-items-list]");
    var recalc = function () {
        var total = collectItems(modal).reduce(function (sum, item) { return sum + itemLineTotal(item); }, 0);
        modal.querySelector("[data-items-total]").value = total;
    };
    modal.addEventListener("click", function (event) {
        if (event.target.matches("[data-add-item]")) {
            list.insertAdjacentHTML("beforeend", orderItemRow(state.services[0].id, state.services[0].price, "", 1));
            recalc();
        }
        if (event.target.matches("[data-remove-item]")) {
            var row = event.target.closest(".item-row");
            if (row)
                row.remove();
            recalc();
        }
    });
    modal.addEventListener("change", function (event) {
        if (event.target.matches('[name="itemService"]')) {
            var selectedOption = event.target.options[event.target.selectedIndex];
            var price = (selectedOption && selectedOption.getAttribute("data-price")) || 0;
            event.target.closest(".item-row").querySelector('[name="itemPrice"]').value = price;
            recalc();
        }
    });
    modal.addEventListener("input", function (event) { if (event.target.matches('[name="itemPrice"], [name="itemQuantity"]'))
        recalc(); });
}
function collectItems(form) {
    var rows = listFrom(form.querySelectorAll(".item-row"));
    return rows.map(function (row) {
        var serviceId = Number(row.querySelector('[name="itemService"]').value);
        var service = getService(serviceId);
        return { name: row.querySelector('[name="itemName"]').value || service.name, quantity: Number(row.querySelector('[name="itemQuantity"]').value || 1), serviceId: serviceId, serviceName: service.name, price: Number(row.querySelector('[name="itemPrice"]').value || 0) };
    }).filter(function (item) { return item.name || item.price; });
}
function syncOrderPayment(order) {
    var existing = state.cash.find(function (entry) { return entry.orderId === order.id && entry.category === "Pedido"; });
    if (order.paymentStatus !== "Abonado") {
        state.cash = state.cash.filter(function (entry) { return !(entry.orderId === order.id && entry.category === "Pedido"); });
        order.paymentSynced = false;
        return;
    }
    var payment = { type: "Ingreso", category: "Pedido", description: "".concat(orderClient(order), " ").concat(orderDisplayCode(order)), method: order.paymentMethod || "Efectivo", amount: order.total, orderId: order.id };
    if (existing)
        for (var paymentKey in payment) { if (Object.prototype.hasOwnProperty.call(payment, paymentKey)) existing[paymentKey] = payment[paymentKey]; }
    else
        state.cash.push(__assign({ id: nextId(state.cash), date: new Date().toISOString() }, payment));
    order.paymentSynced = true;
}
function orderHistoryRows(orders) {
    return "<div class=\"history-list\">".concat(orders.map(function (order) { return "<article class=\"history-item\"><div><strong>".concat(escapeHtml(orderDisplayCode(order)), "</strong><small>").concat(formatDateTime(order.createdAt), " · ").concat(escapeHtml(order.status), "</small></div><div>").concat(escapeHtml(itemSummary(order)), "</div><div><strong>").concat(money(order.total), "</strong> · ").concat(escapeHtml(order.paymentStatus || "Pendiente"), " · ").concat(escapeHtml(paymentMethodLabel(order.paymentMethod)), "</div><button class=\"secondary\" data-action=\"viewOrder\" data-id=\"").concat(order.id, "\">Ver</button></article>"); }).join("") || "<p>Este cliente todavía no tiene pedidos.</p>", "</div>");
}
function openClientHistoryModal(id) {
    var client = getClient(id);
    if (!client)
        return;
    var orders = operationalOrders().filter(function (order) { return order.clientId === Number(id); }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    openModal("Historial de ".concat(escapeHtml(client.name)), orderHistoryRows(orders));
}
function orderDetailHtml(order) {
    return "<div class=\"order-detail\"><p><strong>Cliente:</strong> ".concat(escapeHtml(orderClient(order)), "</p><p><strong>Depósito:</strong> ").concat(escapeHtml(order.location || "Sin asignar"), "</p><p><strong>Estado:</strong> ").concat(escapeHtml(order.status), "</p><p><strong>Pago:</strong> ").concat(escapeHtml(order.paymentStatus || "Pendiente"), " · ").concat(escapeHtml(paymentMethodLabel(order.paymentMethod)), "</p><p><strong>Total:</strong> ").concat(money(order.total), "</p><p><strong>Estimado:</strong> ").concat(formatDateTime(order.estimate), "</p><h3>Prendas / trabajos</h3><ul>").concat((order.items || []).map(function (item) { return "<li>".concat(Number(item.quantity || 1), " x ").concat(escapeHtml(item.name), " · ").concat(escapeHtml(item.serviceName || ""), " · ").concat(money(itemLineTotal(item)), "</li>"); }).join(""), "</ul><p><strong>Observaciones:</strong> ").concat(escapeHtml(order.notes || "Sin observaciones"), "</p><div class=\"actions\"><button class=\"secondary\" data-action=\"editOrderStatus\" data-id=\"").concat(order.id, "\">Editar</button><button class=\"success\" data-action=\"whatsapp\" data-id=\"").concat(order.id, "\">WhatsApp</button></div></div>");
}
function openOrderViewModal(id) {
    var order = getOrder(id);
    if (!order)
        return;
    openModal("Pedido ".concat(escapeHtml(orderDisplayCode(order))), orderDetailHtml(order));
}
function openOrderEditModal(id) {
    var order = getOrder(id);
    if (!order)
        return;
    var locations = availableLocations(order.id);
    if (order.location && !locations.some(function (location) { return location.code === order.location; }))
        locations.unshift({ id: 0, code: order.location });
    var modal = openModal("Editar pedido ".concat(escapeHtml(orderDisplayCode(order))), '<form class="form-grid">\n    <label>Depósito / número<select name="location"><option value="">Sin asignar</option>'.concat(locations.map(function (location) { return '<option '.concat(location.code === order.location ? 'selected' : '', '>').concat(escapeHtml(location.code), '</option>'); }).join(''), '</select></label>\n    <label>Pago<select name="paymentStatus"><option ').concat(order.paymentStatus !== "Abonado" ? 'selected' : '', '>Pendiente</option><option ').concat(order.paymentStatus === "Abonado" ? 'selected' : '', '>Abonado</option></select></label>\n    <label>Medio de pago<select name="paymentMethod"><option value="Efectivo" ').concat(order.paymentMethod !== "Transferencia" ? 'selected' : '', '>Efectivo</option><option value="Transferencia" ').concat(order.paymentMethod === "Transferencia" ? 'selected' : '', '>Transferencia</option></select></label>\n    <div class="full items-builder"><h3>Prendas / trabajos</h3><div data-items-list>').concat((order.items || []).map(function (item) { return orderItemRow(item.serviceId, item.price, item.name, item.quantity); }).join('') || orderItemRow(state.services[0].id, state.services[0].price, '', 1), '</div><button class="secondary" type="button" data-add-item>+ Agregar prenda</button></div>\n    <label>Precio total<input name="total" data-items-total type="number" min="0" readonly value="').concat(Number(order.total || 0), '" /></label>\n    <label class="full">Observaciones<textarea name="notes">').concat(escapeHtml(order.notes || ""), '</textarea></label>\n    <button class="primary full">Guardar cambios</button>\n  </form>'), function (form) {
        var data = formDataToObject(form);
        var items = collectItems(form);
        var primaryService = getService((items[0] && items[0].serviceId) || order.serviceId);
        order.location = data.location;
        order.number = orderDisplayCode(order);
        order.paymentStatus = data.paymentStatus;
        order.paymentMethod = data.paymentMethod;
        order.items = items;
        order.serviceId = Number(primaryService.id);
        order.total = orderItemsTotal(items);
        order.notes = data.notes;
        syncOrderPayment(order);
        saveState();
        closeModal();
        render();
    });
    attachItemBuilder(modal);
}
function openOrderStateModal(id) {
    var order = getOrder(id);
    if (!order)
        return;
    openModal("Cambiar estado ".concat(escapeHtml(orderDisplayCode(order))), "<form class=\"state-grid\">\n    ".concat(STATES.map(function (status) { return "<label class=\"state-option ".concat(status === order.status ? "selected" : "", "\"><input type=\"radio\" name=\"status\" value=\"").concat(status, "\" ").concat(status === order.status ? "checked" : "", " /> <span>").concat(status, "</span></label>"); }).join(""), "\n    <button class=\"primary full\">Guardar estado</button>\n  </form>"), function (form) {
        var data = formDataToObject(form);
        var previousStatus = order.status;
        order.status = data.status;
        if (order.status === "Retirado") {
            order.wasPaidBeforeRetired = order.paymentStatus === "Abonado";
            order.paymentStatus = "Abonado";
            order.location = "";
            order.number = orderDisplayCode(order);
            syncOrderPayment(order);
        }
        else if (previousStatus === "Retirado") {
            order.location = "";
            order.number = orderDisplayCode(order);
            if (!order.wasPaidBeforeRetired)
                order.paymentStatus = "Pendiente";
            syncOrderPayment(order);
        }
        saveState();
        closeModal();
        render();
    });
}
function storageNoticeText(order) {
    if (order === void 0) { order = null; }
    var base = safeReplaceAll(state.settings.storageNoticeText, "{dias}", state.settings.storageNoticeDays);
    if (!order)
        return base;
    return "".concat(base, "\n\nPedido #").concat(orderDisplayCode(order), " - Cliente: ").concat(orderClient(order), " - Ubicaci\u00F3n: ").concat(order.location || "sin asignar", ".");
}
function sendWhatsapp(id, type) {
    var order = getOrder(id);
    var phone = ((getClient(order.clientId) && getClient(order.clientId).phone) || "").replace(/\D/g, "");
    window.open("https://wa.me/".concat(phone, "?text=").concat(encodeURIComponent(messageForOrder(order, type))), "_blank");
}
function openWhatsappMenu(id) {
    var order = getOrder(id);
    if (!order)
        return;
    var html = "<div class=\"message-list\">" +
        "<button class=\"secondary\" data-action=\"sendWhatsapp\" data-message-type=\"received\" data-id=\"" + order.id + "\">Recibimos tu pedido</button>" +
        "<button class=\"success\" data-action=\"sendWhatsapp\" data-message-type=\"ready\" data-id=\"" + order.id + "\">Tu pedido está listo</button>" +
        "<button class=\"secondary\" data-action=\"sendWhatsapp\" data-message-type=\"retired\" data-id=\"" + order.id + "\">Retiró su pedido</button>" +
        "<div class=\"copy-row\"><button class=\"secondary\" data-action=\"copyWhatsapp\" data-message-type=\"received\" data-id=\"" + order.id + "\">Copiar recibido</button><button class=\"secondary\" data-action=\"copyWhatsapp\" data-message-type=\"ready\" data-id=\"" + order.id + "\">Copiar listo</button><button class=\"secondary\" data-action=\"copyWhatsapp\" data-message-type=\"retired\" data-id=\"" + order.id + "\">Copiar retirado</button></div>" +
        "<p class=\"copy-status\" aria-live=\"polite\"></p>" +
        "<textarea readonly>" + escapeHtml(messageForOrder(order, "ready")) + "</textarea></div>";
    openModal("Mensajes WhatsApp #".concat(escapeHtml(orderDisplayCode(order))), html);
}
function copyWhatsapp(id, type) {
    if (type === void 0) { type = "ready"; }
    var order = getOrder(id);
    if (!order)
        return;
    var text = messageForOrder(order, type);
    var status = document.querySelector(".copy-status");
    function notify() {
        if (status)
            status.textContent = "Mensaje copiado: " + (type === "received" ? "recibido" : type === "retired" ? "retirado" : "listo");
    }
    if (window.navigator && navigator.clipboard && navigator.clipboard.writeText) {
        var result = navigator.clipboard.writeText(text);
        if (result && result.then)
            result.then(notify, function () { prompt("Copiá el mensaje para WhatsApp", text); notify(); });
        else
            notify();
    }
    else {
        prompt("Copiá el mensaje para WhatsApp", text);
        notify();
    }
}
function openStorageNoticeModal(id) {
    var order = id ? getOrder(id) : null;
    var text = storageNoticeText(order);
    openModal(order ? "Cartel dep\u00F3sito #".concat(escapeHtml(orderDisplayCode(order))) : "Cartel general de depósito", "\n    <textarea class=\"notice-text\" readonly>".concat(escapeHtml(text), "</textarea>\n    <div class=\"actions\"><button class=\"primary\" data-action=\"copyNotice\">Copiar cartel</button>").concat(order ? "<button class=\"success\" data-action=\"sendStorageNotice\" data-id=\"".concat(order.id, "\">Enviar al cliente</button>") : "", "</div>"));
}
function copyVisibleNotice() {
    var text = (document.querySelector(".notice-text") && document.querySelector(".notice-text").value) || "";
    if (navigator.clipboard)
        navigator.clipboard.writeText(text);
    else
        prompt("Copiá el cartel", text);
    alert("Cartel copiado/preparado.");
}
function sendStorageNotice(id) {
    var order = getOrder(id);
    var phone = ((getClient(order.clientId) && getClient(order.clientId).phone) || "").replace(/\D/g, "");
    window.open("https://wa.me/".concat(phone, "?text=").concat(encodeURIComponent(storageNoticeText(order))), "_blank");
}
function unlockCash() {
    var pinInput = document.getElementById(currentView === "cashReports" ? "metricsPinUnlock" : "cashPinUnlock");
    cashUnlocked = pinInput && pinInput.value === (currentView === "cashReports" ? state.settings.metricsPin : state.settings.cashPin);
    if (!cashUnlocked)
        alert("Clave incorrecta");
    render();
}
function openCashModal(type) {
    var categories = type === "Ingreso" ? ["Pedido", "Seña", "Otro"] : ["Agua", "Luz", "Gas", "Insumos", "Alquiler", "Otros servicios"];
    openModal("".concat(type, " de caja"), "<form class=\"form-grid\"><label>Categor\u00EDa<select name=\"category\">".concat(categories.map(function (category) { return "<option>".concat(escapeHtml(category), "</option>"); }).join(""), "</select></label><label>Medio<select name=\"method\"><option value=\"Efectivo\">Efectivo</option><option value=\"Transferencia\">Transferencia</option></select></label><label>Importe<input name=\"amount\" type=\"number\" min=\"0\" required /></label><label>Descripci\u00F3n<input name=\"description\" required /></label><button class=\"primary full\">Guardar ").concat(type.toLowerCase(), "</button></form>"), function (form) {
        state.cash.push(__assign({ id: nextId(state.cash), type: type, date: new Date().toISOString() }, formDataToObject(form)));
        saveState();
        closeModal();
        render();
    });
}
function openDeleteCashModal() {
    var entries = __spreadArray([], state.cash, true).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    openModal("Borrar movimiento", '<div class="cash-delete-list">'.concat(entries.map(function (entry) { return '<button class="cash-delete-option" data-action="deleteCashEntry" data-id="'.concat(entry.id, '"><span>').concat(formatDateTime(entry.date), ' · ').concat(escapeHtml(entry.type), ' · ').concat(escapeHtml(entry.category), '</span><strong>').concat(moneySigned(signedCashAmount(entry)), '</strong><small>').concat(escapeHtml(entry.description || "Sin descripción"), '</small></button>'); }).join('') || '<p>No hay movimientos para borrar.</p>', '</div>'));
}
function deleteCashEntry(id) {
    var entry = state.cash.find(function (movement) { return movement.id === Number(id); });
    if (!entry)
        return;
    if (!confirm("¿Borrar este movimiento de caja?"))
        return;
    state.cash = state.cash.filter(function (movement) { return movement.id !== Number(id); });
    if (entry.orderId) {
        var order = getOrder(entry.orderId);
        if (order) {
            order.paymentStatus = "Pendiente";
            order.paymentSynced = false;
        }
    }
    saveState();
    closeModal();
    render();
}
function closeCashDay() {
    if (!state.cash.length) {
        alert("La caja diaria ya está vacía.");
        return;
    }
    if (!confirm("¿Empezar nuevo día? Se guardará la caja actual en el histórico y la caja diaria quedará en cero."))
        return;
    var income = state.cash.filter(function (entry) { return entry.type === "Ingreso"; }).reduce(function (sum, entry) { return sum + Number(entry.amount || 0); }, 0);
    var expense = state.cash.filter(function (entry) { return entry.type === "Egreso"; }).reduce(function (sum, entry) { return sum + Number(entry.amount || 0); }, 0);
    state.cashHistory = state.cashHistory || [];
    state.cashHistory.push({ id: nextId(state.cashHistory), closedAt: new Date().toISOString(), entries: cloneData(state.cash), income: income, expense: expense, balance: income - expense });
    state.cash = [];
    saveState();
    render();
}
function csvEscape(value) {
    return '"' + safeReplaceAll(String(value == null ? "" : value), '"', '""') + '"';
}
function cashExportRows(entries) {
    var rows = [["Cierre", "Fecha movimiento", "Tipo", "Categoría", "Descripción", "Medio", "Importe"]];
    entries.forEach(function (entry) { rows.push([formatDateTime(entry.closedAt), formatDateTime(entry.date), entry.type, entry.category, entry.description, paymentMethodLabel(entry.method), signedCashAmount(entry)]); });
    return rows;
}
function downloadCsv(rows, fileName, label) {
    var csv = rows.map(function (row) { return row.map(csvEscape).join(";"); }).join("\n");
    if (window.Blob && window.URL && document.createElement) {
        var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert(label + " exportada como " + fileName + ". Se guarda en Descargas o en la ubicación configurada por tu navegador.");
    }
    else {
        prompt("Copiá este CSV y guardalo como " + fileName, csv);
    }
}
function exportHistoricalCash() {
    downloadCsv(cashExportRows(historicalCashRows()), "caja-historica-" + localDateInput() + ".csv", "Caja histórica");
}
function exportMonthlyCash(month) {
    var selectedMonth = month || selectedMetricsMonth || localDateInput().slice(0, 7);
    var rows = historicalCashRows().filter(function (entry) { return monthKey(entry.date) === selectedMonth; });
    downloadCsv(cashExportRows(rows), "caja-mensual-" + selectedMonth + ".csv", "Caja mensual " + selectedMonth);
}
function csvRows(text) {
    var rows = [];
    var row = [];
    var value = "";
    var quoted = false;
    for (var index = 0; index < text.length; index += 1) {
        var character = text.charAt(index);
        var next = text.charAt(index + 1);
        if (quoted) {
            if (character === '"' && next === '"') {
                value += '"';
                index += 1;
            }
            else if (character === '"')
                quoted = false;
            else
                value += character;
        }
        else if (character === '"')
            quoted = true;
        else if (character === ";" || character === ",") {
            row.push(value);
            value = "";
        }
        else if (character === "\n") {
            row.push(value);
            rows.push(row);
            row = [];
            value = "";
        }
        else if (character !== "\r")
            value += character;
    }
    row.push(value);
    rows.push(row);
    return rows.filter(function (csvRow) { return csvRow.join("").trim(); });
}
function headerIndex(headers, names) {
    for (var index = 0; index < headers.length; index += 1) {
        var header = headers[index].toLowerCase().trim();
        for (var nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
            if (header === names[nameIndex])
                return index;
        }
    }
    return -1;
}
function csvValue(row, headers, names) {
    var index = headerIndex(headers, names);
    return index >= 0 ? row[index] || "" : "";
}
function importClientsCsv(rows) {
    var headers = rows[0] || [];
    var added = 0;
    for (var rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        var row = rows[rowIndex];
        var name = csvValue(row, headers, ["nombre", "name", "cliente", "client"]);
        var phone = csvValue(row, headers, ["telefono", "teléfono", "phone", "whatsapp", "celular"]);
        if (!name || !phone)
            continue;
        var exists = state.clients.some(function (client) { return client.phone === phone; });
        if (exists)
            continue;
        state.clients.push({ id: nextId(state.clients), name: name, phone: phone, address: csvValue(row, headers, ["direccion", "dirección", "address"]), notes: csvValue(row, headers, ["notas", "notes"]), authorizedPickups: csvValue(row, headers, ["autorizados", "authorizedpickups", "retira"]) });
        added += 1;
    }
    return added;
}
function findOrCreateClient(name, phone) {
    var cleanPhone = phone || "Sin teléfono";
    for (var index = 0; index < state.clients.length; index += 1) {
        if (state.clients[index].phone === cleanPhone || state.clients[index].name === name)
            return state.clients[index];
    }
    var client = { id: nextId(state.clients), name: name || "Cliente CSV", phone: cleanPhone, address: "", notes: "Importado por CSV", authorizedPickups: "" };
    state.clients.push(client);
    return client;
}
function importOrdersCsv(rows) {
    var headers = rows[0] || [];
    var added = 0;
    for (var rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        var row = rows[rowIndex];
        var client = findOrCreateClient(csvValue(row, headers, ["cliente", "client", "nombre", "name"]), csvValue(row, headers, ["telefono", "teléfono", "phone", "whatsapp"]));
        var service = state.services[0];
        var quantity = Number(csvValue(row, headers, ["cantidad", "quantity", "qty"]) || 1);
        var price = Number(csvValue(row, headers, ["precio", "price", "importe", "amount"]) || service.price || 0);
        var itemName = csvValue(row, headers, ["prenda", "item", "itemname", "trabajo"]) || service.name;
        var createdAt = new Date().toISOString();
        var schedule = createOrderSchedule(service, createdAt);
        var orderId = nextId(state.orders);
        var location = csvValue(row, headers, ["deposito", "depósito", "location"]) || nextFreeLocation();
        var items = [{ name: itemName, quantity: quantity, serviceId: service.id, serviceName: service.name, price: price }];
        var order = { id: orderId, number: "", clientId: client.id, serviceId: service.id, createdAt: createdAt, estimate: schedule.estimate, cycles: schedule.cycles, status: csvValue(row, headers, ["estado", "status"]) || "Pendiente", items: items, total: orderItemsTotal(items), location: location, notes: csvValue(row, headers, ["notas", "notes", "observaciones"]), paymentStatus: csvValue(row, headers, ["pago", "paymentstatus"]) || "Pendiente", paymentMethod: csvValue(row, headers, ["medio", "paymentmethod"]) || "Efectivo" };
        ensureOrderCycleIds(order);
        order.number = orderDisplayCode(order);
        state.orders.push(order);
        if (order.paymentStatus === "Abonado")
            syncOrderPayment(order);
        added += 1;
    }
    return added;
}
function importCsvData() {
    var fileInput = document.getElementById("csvImportFile");
    var typeInput = document.getElementById("csvImportType");
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (!file || !window.FileReader) {
        alert("Elegí un archivo CSV para importar.");
        return;
    }
    var reader = new FileReader();
    reader.onload = function () {
        var rows = csvRows(String(reader.result || ""));
        if (!rows.length) {
            alert("El CSV está vacío o no se pudo leer.");
            return;
        }
        var imported = typeInput && typeInput.value === "orders" ? importOrdersCsv(rows) : importClientsCsv(rows);
        saveState();
        render();
        alert("Importación CSV completa: " + imported + " registros agregados.");
    };
    reader.readAsText(file);
}
function saveSettings() {
    ["openHour", "closeHour", "whatsappReceivedMessage", "whatsappMessage", "whatsappRetiredMessage", "storageNoticeText", "cashPin", "metricsPin"].forEach(function (key) { return state.settings[key] = document.getElementById(key).value; });
    ["smallWashers", "dryers", "washingMinutes", "dryingMinutes", "storageNoticeDays"].forEach(function (key) { return state.settings[key] = Number(document.getElementById(key).value); });
    saveState();
    render();
}
function resetDemo() {
    if (!confirm("¿Reiniciar datos de demostración?"))
        return;
    state = cloneData(defaultData);
    cashUnlocked = false;
    saveState();
    render();
}
render();
appStarted = true;
