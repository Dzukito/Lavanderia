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
    return "".concat(String(value.getDate()).padStart(2, "0"), "/").concat(String(value.getMonth() + 1).padStart(2, "0"), "/").concat(String(value.getFullYear()).slice(-2), " ").concat(String(value.getHours()).padStart(2, "0"), ":").concat(String(value.getMinutes()).padStart(2, "0"));
}
function flatten(list) {
    return Array.prototype.concat.apply([], list);
}
var state = loadState();
var currentView = "dashboard";
var cashUnlocked = false;
var selectedMachine = null;
var scheduleWeekStart = currentWeekStart(new Date()).toISOString().slice(0, 10);
var schedulePreview = null;
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
    var merged = __assign(__assign(__assign({}, defaults), parsed), { settings: __assign(__assign({}, defaults.settings), (parsed.settings || {})), services: parsed.services && parsed.services.length ? parsed.services : defaults.services, clients: parsed.clients && parsed.clients.length ? parsed.clients : defaults.clients, orders: parsed.orders || defaults.orders, cash: parsed.cash || defaults.cash, locations: mergeLocations(defaults.locations, parsed.locations) });
    merged.clients = merged.clients.map(function (client) { return (__assign({ authorizedPickups: "" }, client)); });
    merged.orders = merged.orders.map(function (order) {
        var paymentStatus = order.paymentStatus || (order.status === "Abonado" ? "Abonado" : "Pendiente");
        var status = ["Retirado", "Abonado"].includes(order.status) ? "Retirado" : order.status === "Listo para retirar" ? "Listo" : ["Pendiente", "Listo", "Retirado"].includes(order.status) ? order.status : "Pendiente";
        var items = order.items && order.items.length ? order.items : [{ name: serviceSummary(order), serviceId: order.serviceId, price: Number(order.total || 0), quantity: 1 }];
        items = items.map(function (item) { return __assign({ quantity: 1 }, item); });
        return __assign(__assign({}, order), { status: status, paymentStatus: paymentStatus, paymentMethod: order.paymentMethod || "Efectivo", cycles: order.cycles || [], items: items });
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
    return String(1000 + nextId(state.orders)).padStart(4, "0");
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
    return LaundryScheduler.scheduleOrder(state.orders, service, state.settings, createdAt);
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
    return "".concat(String(hour).padStart(2, "0"), ":00");
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
function monthlyCashSummary() {
    var summary = {};
    state.cash.forEach(function (entry) {
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
        var monthOrders = state.orders.filter(function (order) { return monthKey(order.createdAt) === month; });
        var orderTotal = monthOrders.reduce(function (sum, order) { return sum + Number(order.total || 0); }, 0);
        var averageTicket = monthOrders.length ? Math.round(orderTotal / monthOrders.length) : 0;
        var topMethod = Math.abs(values.transfer) > Math.abs(values.cash) ? "Transferencia" : "Efectivo";
        var services = {};
        var clients = {};
        var hours = {};
        monthOrders.forEach(function (order) {
            var clientName = orderClient(order);
            clients[clientName] = (clients[clientName] || 0) + 1;
            var hour = new Date(order.createdAt).getHours();
            var hourText = String(hour).padStart(2, "0") + ":00";
            hours[hourText] = (hours[hourText] || 0) + 1;
            (order.items || []).forEach(function (item) {
                var serviceName = item.serviceName || serviceSummary(order);
                services[serviceName] = (services[serviceName] || 0) + Number(item.quantity || 1);
            });
        });
        return __assign(__assign({ month: month }, values), { balance: balance, diff: diff, orders: monthOrders.length, orderTotal: orderTotal, averageTicket: averageTicket, topMethod: topMethod, topClient: topMetric(clients), topService: topMetric(services), topHour: topMetric(hours) });
    });
}
function metricInsight(row) {
    if (!row.income && !row.expense)
        return "Sin movimientos todavía.";
    if (row.diff === null)
        return "Primer mes con datos para comparar.";
    if (row.diff > 0)
        return "El saldo mejoró " + row.diff + "% contra el mes anterior.";
    if (row.diff < 0)
        return "El saldo bajó " + Math.abs(row.diff) + "%: revisar egresos y tickets.";
    return "Saldo estable frente al mes anterior.";
}
function topMetric(values) {
    var best = { name: "Sin datos", count: 0 };
    for (var key in values) {
        if (Object.prototype.hasOwnProperty.call(values, key) && values[key] > best.count)
            best = { name: key, count: values[key] };
    }
    return best;
}
function pieStyle(primary, secondary) {
    var total = Math.abs(primary) + Math.abs(secondary);
    var percent = total ? Math.round((Math.abs(primary) / total) * 100) : 50;
    return "background: conic-gradient(#2f6bff 0 " + percent + "%, #ff6b6b " + percent + "% 100%)";
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
    return safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(safeReplaceAll(templates[type], "{cliente}", orderClient(order)), "{pedido}", order.number || order.location || ""), "{fecha}", formatDateTime(new Date().toISOString())), "{estimado}", formatDateTime(order.estimate)), "{pago}", paymentText), "{total}", money(order.total));
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
    if (view === "cash")
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
        todayWeek: function () { return setScheduleWeek(currentWeekStart(new Date()).toISOString().slice(0, 10)); },
        sendWhatsapp: function () { return sendWhatsapp(id, target.getAttribute("data-message-type")); },
        copyWhatsapp: function () { return copyWhatsapp(id, target.getAttribute("data-message-type")); },
        copyNotice: copyVisibleNotice,
        sendStorageNotice: function () { return sendStorageNotice(id); },
        machineEdit: function () { return openMachineModal(target.getAttribute("data-machine")); },
        saveMachineSlot: function () { return saveMachineSlot(target); },
        cashIncome: function () { return openCashModal("Ingreso"); },
        cashExpense: function () { return openCashModal("Egreso"); },
        unlockCash: unlockCash,
        saveSettings: saveSettings,
        resetDemo: resetDemo,
        exportData: exportData,
        importData: importData,
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
});
document.addEventListener("change", function (event) {
    if (event.target.matches("[data-schedule-week]")) {
        setScheduleWeek(event.target.value);
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
function orderDisplayCode(order) {
    return order.location ? "".concat(order.location, "-#").concat(String(order.id).padStart(4, "0")) : "Sin dep\u00F3sito-#".concat(String(order.id).padStart(4, "0"));
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
function orderGroup(order) {
    if (order.status === "Retirado")
        return "Retirado";
    if (order.status === "Listo")
        return "Listo";
    return "Pendiente";
}
function ordersByGroup(group) {
    return state.orders.filter(function (order) { return orderGroup(order) === group; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
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
    document.getElementById("orders").innerHTML = "\n    <div class=\"card section-card\">\n      <div class=\"toolbar\"><div><p class=\"eyebrow-dark\">Operaci\u00F3n</p><h2>Pedidos</h2></div><button class=\"primary\" data-action=\"newOrder\">+ Nuevo pedido</button></div>\n      <div class=\"filters-row\"><input id=\"orderSearch\" data-search-orders placeholder=\"Buscar por dep\u00F3sito, cliente, tel\u00E9fono, estado u observaciones\" /><label>Fecha<input id=\"orderDateFilter\" data-order-date type=\"date\" value=\"".concat(today, "\" /></label><button class=\"secondary\" data-action=\"clearOrderDate\">Ver todos</button></div>\n    </div>\n    <div id=\"ordersTable\">").concat(orderCards(state.orders.filter(function (order) { return dateKey(order.createdAt) === today; }).reverse(), "Pedidos del día", false), "</div>\n  ");
}
window.filterOrders = function (query, date) {
    if (date === void 0) { date = ""; }
    var q = query.toLowerCase();
    var filtered = state.orders.filter(function (order) {
        var matchesQuery = "".concat(order.number, " ").concat(order.location || "", " ").concat(orderClient(order), " ").concat((getClient(order.clientId) && getClient(order.clientId).phone) || "", " ").concat(order.status, " ").concat(order.notes || "").toLowerCase().includes(q);
        var matchesDate = !date || dateKey(order.createdAt) === date;
        return matchesQuery && matchesDate;
    });
    document.getElementById("ordersTable").innerHTML = orderCards(filtered.reverse(), date ? "Pedidos filtrados" : "Todos los pedidos", false);
};
function orderCards(orders, title, compact) {
    if (compact === void 0) { compact = false; }
    return "\n    <div class=\"card orders-panel\">\n      <h2>".concat(escapeHtml(title), "</h2>\n      <div class=\"order-card-list\">").concat(orders.map(function (order) { return "\n        <article class=\"order-card ".concat(normalizeClass(orderGroup(order)), "\">\n          <div class=\"order-main\"><strong class=\"order-code\">").concat(escapeHtml(orderDisplayCode(order)), "</strong><span class=\"badge ").concat(normalizeClass(orderGroup(order)), "\">").concat(escapeHtml(orderGroup(order)), "</span></div>\n          <div><strong>").concat(escapeHtml(orderClient(order)), "</strong><br><small>").concat(escapeHtml(itemSummary(order)), " · ").concat(formatDateTime(order.estimate), "</small></div>\n          <p class=\"order-notes\">").concat(escapeHtml(order.notes || "Sin observaciones"), "</p>\n          ").concat(orderItemsHtml(order), "\n          <div class=\"order-meta\"><span>Pago: ").concat(paymentBadge(order), " ").concat(paymentMethodLabel(order.paymentMethod), "</span><span>Total: ").concat(money(order.total), "</span></div>\n          <div class=\"actions\"><button class=\"secondary\" data-action=\"orderState\" data-id=\"").concat(order.id, "\">Estado</button><button class=\"secondary\" data-action=\"editOrderStatus\" data-id=\"").concat(order.id, "\">Editar</button><button class=\"success\" data-action=\"whatsapp\" data-id=\"").concat(order.id, "\">WhatsApp</button></div>\n        </article>"); }).join("") || "<p>No hay pedidos para mostrar.</p>", "</div>\n    </div>");
}
function ordersTable(orders, title) {
    return orderCards(orders, title, false);
}
function clientCards(clients) {
    return clients.map(function (client) { return "<article class=\"client-card\"><div class=\"client-avatar\">👤</div><h3>".concat(escapeHtml(client.name), "</h3><p><strong>Tel:</strong> ").concat(escapeHtml(client.phone), "</p><p><strong>Retira:</strong> ").concat(escapeHtml(client.authorizedPickups || "Solo titular"), "</p><p><strong>Notas:</strong> ").concat(escapeHtml(client.notes || "-"), "</p><div class=\"actions\"><button class=\"secondary\" data-action=\"clientHistory\" data-id=\"").concat(client.id, "\">Historial</button><button class=\"secondary\" data-action=\"editClient\" data-id=\"").concat(client.id, "\">Editar cliente</button></div></article>"); }).join("") || "<p>No hay clientes para mostrar.</p>";
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
function renderSchedule() {
    var machines = __spreadArray(__spreadArray([], LaundryScheduler.machineNames("Lavado", state.settings.smallWashers).map(function (name) { return ({ type: "Lavado", name: name }); }), true), LaundryScheduler.machineNames("Secado", state.settings.dryers).map(function (name) { return ({ type: "Secado", name: name }); }), true);
    var activeCycles = state.orders
        .filter(function (order) { return order.status !== "Retirado"; })
        .reduce(function (list, order) { return list.concat((order.cycles || []).map(function (cycle) { return (__assign(__assign({}, cycle), { order: order })); })); }, [])
        .filter(function (cycle) { return cycle.type !== "Preparación"; })
        .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    var weekDays = currentWeekDays(new Date("".concat(scheduleWeekStart, "T00:00:00")));
    var openHour = Number(state.settings.openHour.split(":")[0]);
    var closeHour = Number(state.settings.closeHour.split(":")[0]);
    var hours = [];
    for (var hourIndex = 0; hourIndex < Math.max(1, closeHour - openHour); hourIndex += 1)
        hours.push(openHour + hourIndex);
    var washDryMinutes = Number(state.settings.washingMinutes) + Number(state.settings.dryingMinutes);
    var preview = "";
    document.getElementById("schedule").innerHTML = "\n    <div class=\"card hero-card\"><div><p class=\"eyebrow-dark\">Turnero</p><h2>Agenda grande por hora</h2><p>Mostrando semana desde <strong>".concat(weekDays[0].toLocaleDateString("es-AR"), "</strong>. Un valet lavado + secado ocupa aprox. <strong>").concat(washDryMinutes, " minutos</strong>, pero la estimaci\u00F3n real depende de m\u00E1quinas libres.</p></div><div class=\"status-pill light\">").concat(state.settings.smallWashers, " lavarropas \u00B7 ").concat(state.settings.dryers, " secadoras</div></div>\n    <div class=\"card schedule-controls\"><button class=\"secondary\" data-action=\"prevWeek\">\u2190</button><label>Semana<input class=\"week-input\" type=\"date\" data-schedule-week value=\"").concat(scheduleWeekStart, "\" /></label><button class=\"secondary\" data-action=\"todayWeek\">Hoy</button><button class=\"secondary\" data-action=\"nextWeek\">\u2192</button>").concat(preview, "</div>\n    <div class=\"card schedule-card\"><h3>Semana seleccionada</h3><div class=\"timeline-grid\" style=\"--days:").concat(weekDays.length, "\">\n      <div class=\"timeline-head\">Hora</div>").concat(weekDays.map(function (day) { return "<div class=\"timeline-head\">".concat(day.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" }), "</div>"); }).join(""), "\n      ").concat(hours.map(function (hour) { return "<div class=\"timeline-hour\">".concat(hourLabel(hour), "</div>").concat(weekDays.map(function (day) {
        var cycles = activeCycles.filter(function (cycle) { return cycleOverlapsHour(cycle, day, hour); });
        return "<div class=\"timeline-cell\">".concat(cycles.map(function (cycle) { return "<div class=\"timeline-event ".concat(cycle.type === "Lavado" ? "wash" : "dry", "\"><strong>").concat(escapeHtml(orderClient(cycle.order)), "</strong><span>").concat(escapeHtml(cycle.type), " \u00B7 ").concat(escapeHtml(cycle.machine), "</span><small>").concat(formatDateTime(cycle.start), " \u2192 ").concat(formatDateTime(cycle.end), "</small></div>"); }).join("") || "<span class=\"free-text\">Libre</span>", "</div>");
    }).join("")); }).join(""), "\n    </div></div>\n    <div class=\"card\"><h3 class=\"machine-section-title\">Lavarropas</h3>").concat(machineBoard(machines.filter(function (machine) { return machine.type === "Lavado"; }), activeCycles), "<h3 class=\"machine-section-title\">Secadoras</h3>").concat(machineBoard(machines.filter(function (machine) { return machine.type === "Secado"; }), activeCycles), "</div>");
}
function setScheduleWeek(value) {
    scheduleWeekStart = currentWeekStart(new Date("".concat(value, "T00:00:00"))).toISOString().slice(0, 10);
    renderSchedule();
}
function moveScheduleWeek(days) {
    var next = new Date("".concat(scheduleWeekStart, "T00:00:00"));
    next.setDate(next.getDate() + days);
    setScheduleWeek(next.toISOString().slice(0, 10));
}
function machineBoard(machines, activeCycles) {
    return "<div class=\"machine-board\">".concat(machines.map(function (machine) {
        var assigned = activeCycles.filter(function (cycle) { return cycle.machine === machine.name; }).slice(0, 8);
        return "<button class=\"machine machine-click type-".concat(normalizeClass(machine.type), " ").concat(assigned.length ? "occupied" : "free-machine", "\" data-action=\"machineEdit\" data-machine=\"").concat(escapeHtml(machine.name), "\"><h4>").concat(escapeHtml(machine.name), "</h4><span class=\"badge ").concat(assigned.length ? "blocked" : "free-machine-badge", "\">").concat(assigned.length ? "Ocupada" : "Libre", "</span>").concat(assigned.map(function (cycle) { return "<div class=\"slot\"><strong>".concat(escapeHtml(orderDisplayCode(cycle.order)), "</strong><br><span>").concat(escapeHtml(orderClient(cycle.order)), "</span></div>"); }).join("") || "<div class=\"slot\">Disponible</div>", "</button>");
    }).join(""), "</div>");
}
function openMachineModal(machineName) {
    selectedMachine = machineName;
    var assigned = state.orders
        .filter(function (order) { return order.status !== "Retirado"; })
        .reduce(function (list, order) { return list.concat((order.cycles || []).map(function (cycle, index) { return (__assign(__assign({}, cycle), { order: order, cycleIndex: index })); })); }, [])
        .filter(function (cycle) { return cycle.machine === machineName; })
        .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    var orderOptions = state.orders.filter(function (order) { return order.status !== "Retirado"; }).map(function (order) { return "<option value=\"".concat(order.id, "\">").concat(escapeHtml(orderDisplayCode(order)), " · ").concat(escapeHtml(orderClient(order)), "</option>"); }).join("");
    var assignedHtml = assigned.map(function (cycle) { return "<button class=\"slot machine-slot\" data-action=\"viewOrder\" data-id=\"".concat(cycle.order.id, "\"><strong>").concat(escapeHtml(orderDisplayCode(cycle.order)), "</strong>").concat(escapeHtml(orderClient(cycle.order)), "<small>").concat(formatDateTime(cycle.start), " → ").concat(formatDateTime(cycle.end), "</small></button>"); }).join("") || "<p>Máquina libre. No hay pedidos asignados.</p>";
    var html = "<div class=\"machine-modal-list\">" + assignedHtml + "</div>" +
        "<form class=\"form-grid machine-assign-form\">" +
        "<label class=\"full\">Pedido<select name=\"orderId\" required>" + (orderOptions || "<option value=\"\">No hay pedidos activos</option>") + "</select></label>" +
        "<label>Tipo<select name=\"type\"><option>Lavado</option><option>Secado</option><option>Preparación</option></select></label>" +
        "<label>Inicio<input name=\"start\" type=\"datetime-local\" required /></label>" +
        "<label>Minutos<input name=\"minutes\" type=\"number\" min=\"1\" value=\"30\" required /></label>" +
        "<button class=\"primary full\" type=\"button\" data-action=\"saveMachineSlot\" data-machine=\"" + escapeHtml(machineName) + "\">Asignar a esta máquina</button>" +
        "</form>";
    openModal("Máquina ".concat(escapeHtml(machineName)), html);
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
    order.cycles = order.cycles || [];
    order.cycles.push({ type: data.type || "Preparación", machine: button.getAttribute("data-machine"), start: start.toISOString(), end: end.toISOString(), minutes: minutes, manual: true });
    order.estimate = order.cycles.reduce(function (latest, cycle) { return new Date(cycle.end) > new Date(latest) ? cycle.end : latest; }, order.estimate || end.toISOString());
    saveState();
    closeModal();
    render();
}
function renderStorage() {
    var occupied = {};
    state.orders.filter(function (order) { return order.location && order.status !== "Retirado"; }).forEach(function (order) {
        occupied[order.location] = order;
    });
    document.getElementById("storage").innerHTML = "\n    <div class=\"card hero-card\"><div><p class=\"eyebrow-dark\">Dep\u00F3sito</p><h2>Ubicaciones y aviso de guarda</h2><p>Hac\u00E9 clic en una ubicaci\u00F3n ocupada para abrir el pedido correspondiente.</p></div><button class=\"secondary\" data-action=\"storageNotice\">Ver aviso general</button></div>\n    <div class=\"storage-grid\">".concat(state.locations.map(function (location) {
        var order = occupied[location.code];
        return order
            ? "<button class=\"location busy location-button\" data-action=\"openStorageOrder\" data-id=\"".concat(order.id, "\"><h3>").concat(escapeHtml(location.code), "</h3><strong>#").concat(escapeHtml(order.number), "</strong><span>").concat(escapeHtml(orderClient(order)), "</span><small>").concat(escapeHtml(order.status), "</small></button>")
            : "<article class=\"location free\"><h3>".concat(escapeHtml(location.code), "</h3>Libre</article>");
    }).join(""), "</div>");
}
function openStorageOrder(id) {
    setView("orders");
    var input = document.getElementById("orderSearch");
    var order = getOrder(id);
    if (input && order) {
        input.value = order.number;
        filterOrders(order.number);
    }
    openOrderViewModal(id);
}
function cashReportHtml() {
    var rows = monthlyCashSummary();
    var latest = rows[rows.length - 1] || { income: 0, expense: 0, balance: 0, diff: null, cash: 0, transfer: 0, orders: 0, averageTicket: 0, topMethod: "Efectivo", topClient: { name: "Sin datos", count: 0 }, topService: { name: "Sin datos", count: 0 }, topHour: { name: "Sin datos", count: 0 } };
    return "\n    <div class=\"card report-panel metrics-panel\"><div class=\"toolbar\"><div><p class=\"eyebrow-dark\">Caja mes por mes</p><h2>Métricas</h2><p>Comparación de varios meses con clientes, servicios y horas fuertes.</p></div></div>\n      <div class=\"grid four report-metrics\">\n        <article class=\"mini-metric\"><span>Ingresos último mes</span><strong>".concat(money(latest.income), "</strong></article>\n        <article class=\"mini-metric\"><span>Saldo último mes</span><strong>").concat(money(latest.balance), "</strong></article>\n        <article class=\"mini-metric\"><span>Cliente frecuente</span><strong>").concat(escapeHtml(latest.topClient.name), "</strong></article>\n        <article class=\"mini-metric\"><span>Hora fuerte</span><strong>").concat(escapeHtml(latest.topHour.name), "</strong></article>\n      </div>\n      <div class=\"metrics-month-grid\">").concat(rows.map(function (row) {
        var max = Math.max(row.income, row.expense, Math.abs(row.cash), Math.abs(row.transfer), 1);
        var incomeWidth = Math.max(4, (row.income / max) * 100);
        var expenseWidth = Math.max(4, (row.expense / max) * 100);
        var cashWidth = Math.max(4, (Math.abs(row.cash) / max) * 100);
        var transferWidth = Math.max(4, (Math.abs(row.transfer) / max) * 100);
        return "<article class=\"metric-month-card\"><div class=\"metric-month-head\"><h3>".concat(row.month, "</h3><span>").concat(row.diff === null ? "Sin comparativo" : row.diff + "% vs anterior", "</span></div><div class=\"pie-row\"><div class=\"pie-chart\" style=\"").concat(pieStyle(row.income, row.expense), "\"><span>Ing/Egr</span></div><div class=\"pie-chart payment-pie\" style=\"").concat(pieStyle(row.cash, row.transfer), "\"><span>Medios</span></div></div><div class=\"metric-bars\"><label>Ingresos <strong>").concat(money(row.income), "</strong></label><div><span class=\"bar income\" style=\"width:").concat(incomeWidth, "%\"></span></div><label>Egresos <strong>").concat(money(row.expense), "</strong></label><div><span class=\"bar expense\" style=\"width:").concat(expenseWidth, "%\"></span></div><label>Efectivo <strong>").concat(money(row.cash), "</strong></label><div><span class=\"bar cash\" style=\"width:").concat(cashWidth, "%\"></span></div><label>Transferencia <strong>").concat(money(row.transfer), "</strong></label><div><span class=\"bar transfer\" style=\"width:").concat(transferWidth, "%\"></span></div></div><div class=\"metric-insights\"><p><strong>Cliente:</strong> ").concat(escapeHtml(row.topClient.name), " (").concat(row.topClient.count, ")</p><p><strong>Servicio:</strong> ").concat(escapeHtml(row.topService.name), " (").concat(row.topService.count, ")</p><p><strong>Hora con más turnos:</strong> ").concat(escapeHtml(row.topHour.name), "</p><p><strong>Ticket prom.:</strong> ").concat(money(row.averageTicket), " · <strong>Saldo:</strong> ").concat(money(row.balance), "</p><p>").concat(escapeHtml(metricInsight(row)), "</p></div></article>");
    }).join("") || "<p>Cargá movimientos para ver métricas mensuales.</p>", "</div>\n      <div class=\"table-wrap\"><table><thead><tr><th>Mes</th><th>Ingresos</th><th>Egresos</th><th>Saldo</th><th>Vs anterior</th><th>Cliente</th><th>Servicio</th><th>Hora fuerte</th></tr></thead><tbody>").concat(rows.map(function (row) { return "<tr><td>".concat(row.month, "</td><td>").concat(money(row.income), "</td><td>").concat(money(row.expense), "</td><td>").concat(money(row.balance), "</td><td>").concat(row.diff === null ? "-" : "".concat(row.diff, "%"), "</td><td>").concat(escapeHtml(row.topClient.name), "</td><td>").concat(escapeHtml(row.topService.name), "</td><td>").concat(escapeHtml(row.topHour.name), "</td></tr>"); }).join("") || "<tr><td colspan=\"8\">Sin movimientos de caja.</td></tr>", "</tbody></table></div>\n    </div>");
}
function renderCash() {
    if (!cashUnlocked) {
        document.getElementById("cash").innerHTML = "<div class=\"card\"><h2>Caja protegida</h2><p>Ingres\u00E1 la clave del due\u00F1o para ver ingresos, egresos y saldos.</p><div class=\"form-grid\"><label>Clave<input id=\"cashPin\" type=\"password\" placeholder=\"Clave\" /></label></div><br><button class=\"primary\" data-action=\"unlockCash\">Entrar</button><p><small>La clave inicial es 1234 y puede cambiarse desde Configuraci\u00F3n.</small></p></div>";
        return;
    }
    var income = state.cash.filter(function (entry) { return entry.type === "Ingreso"; }).reduce(function (sum, entry) { return sum + Number(entry.amount); }, 0);
    var expense = state.cash.filter(function (entry) { return entry.type === "Egreso"; }).reduce(function (sum, entry) { return sum + Number(entry.amount); }, 0);
    var cash = state.cash.filter(function (entry) { return entry.method === "Efectivo"; }).reduce(function (sum, entry) { return sum + (entry.type === "Ingreso" ? Number(entry.amount) : -Number(entry.amount)); }, 0);
    var transfer = state.cash.filter(function (entry) { return entry.method === "Transferencia"; }).reduce(function (sum, entry) { return sum + (entry.type === "Ingreso" ? Number(entry.amount) : -Number(entry.amount)); }, 0);
    document.getElementById("cash").innerHTML = "\n    <div class=\"grid four\"><article class=\"card metric\"><span>Ingresos</span><strong>".concat(money(income), "</strong></article><article class=\"card metric\"><span>Egresos</span><strong>").concat(money(expense), "</strong></article><article class=\"card metric\"><span>Efectivo</span><strong>").concat(money(cash), "</strong></article><article class=\"card metric\"><span>Transferencia</span><strong>").concat(money(transfer), "</strong></article></div>\n    <div class=\"card cash-section\"><div class=\"toolbar\"><h2>Caja del d\u00EDa / movimientos</h2><div class=\"actions\"><button class=\"success\" data-action=\"cashIncome\">+ Ingreso</button><button class=\"danger\" data-action=\"cashExpense\">+ Egreso</button></div></div>").concat(cashTable(), "</div>");
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
    return "<div class=\"table-wrap\"><table class=\"cash-movements-table\"><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Medio</th><th>Importe</th></tr></thead><tbody>".concat(entries.map(function (entry) { return "<tr class=\"".concat(entry.type === "Ingreso" ? "cash-income-row" : "cash-expense-row", "\"><td>").concat(formatDateTime(entry.date), "</td><td><span class=\"cash-type-badge ").concat(entry.type === "Ingreso" ? "income" : "expense", "\">").concat(escapeHtml(entry.type), "</span></td><td>").concat(escapeHtml(entry.category), "</td><td>").concat(escapeHtml(entry.description), "</td><td>").concat(paymentMethodLabel(entry.method), "</td><td>").concat(money(entry.amount), "</td></tr>"); }).join("") || "<tr><td colspan=\"6\">Sin movimientos.</td></tr>", "</tbody><tfoot><tr><th colspan=\"5\">Total ingresos</th><th>").concat(money(income), "</th></tr><tr><th colspan=\"5\">Total egresos</th><th>").concat(money(expense), "</th></tr><tr><th colspan=\"5\">Saldo final</th><th>").concat(money(balance), "</th></tr></tfoot></table></div>");
}
function renderCashReports() {
    document.getElementById("cashReports").innerHTML = cashReportHtml();
}
function renderSettings() {
    document.getElementById("settings").innerHTML = "\n    <div class=\"card\"><h2>Configuraci\u00F3n</h2><div class=\"form-grid\">\n      <label>Apertura<input id=\"openHour\" type=\"time\" value=\"".concat(escapeHtml(state.settings.openHour), "\" /></label>\n      <label>Cierre<input id=\"closeHour\" type=\"time\" value=\"").concat(escapeHtml(state.settings.closeHour), "\" /></label>\n      <label>Lavarropas chicos<input id=\"smallWashers\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.smallWashers), "\" /></label>\n      <label>Secadoras<input id=\"dryers\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.dryers), "\" /></label>\n      <label>Minutos lavado<input id=\"washingMinutes\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.washingMinutes), "\" /></label>\n      <label>Minutos secado<input id=\"dryingMinutes\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.dryingMinutes), "\" /></label>\n      <label>Clave de caja<input id=\"cashPin\" type=\"password\" value=\"").concat(escapeHtml(state.settings.cashPin), "\" /></label>\n      <label class=\"full\">WhatsApp pedido recibido<textarea id=\"whatsappReceivedMessage\">").concat(escapeHtml(state.settings.whatsappReceivedMessage), "</textarea></label>\n      <label class=\"full\">WhatsApp pedido listo<textarea id=\"whatsappMessage\">").concat(escapeHtml(state.settings.whatsappMessage), "</textarea></label>\n      <label class=\"full\">WhatsApp retirado<textarea id=\"whatsappRetiredMessage\">").concat(escapeHtml(state.settings.whatsappRetiredMessage), "</textarea></label>\n      <label>D\u00EDas para aviso dep\u00F3sito<input id=\"storageNoticeDays\" type=\"number\" min=\"1\" value=\"").concat(Number(state.settings.storageNoticeDays), "\" /></label>\n      <label class=\"full\">Cartel de dep\u00F3sito<textarea id=\"storageNoticeText\">").concat(escapeHtml(state.settings.storageNoticeText), "</textarea></label>\n    </div><br><div class=\"actions\"><button class=\"primary\" data-action=\"saveSettings\">Guardar</button><button class=\"secondary\" data-action=\"exportData\">Exportar datos</button><button class=\"secondary\" data-action=\"importData\">Importar datos</button><button class=\"danger\" data-action=\"resetDemo\">Reiniciar demo</button></div></div>");
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
function openOrderModal() {
    var defaultLocation = nextFreeLocation();
    var firstService = state.services[0];
    var modal = openModal("Nuevo pedido", "<form class=\"form-grid\">\n    <label>Cliente<select name=\"clientId\" required>".concat(state.clients.map(function (client) { return "<option value=\"".concat(client.id, "\">").concat(escapeHtml(client.name), " · ").concat(escapeHtml(client.phone), "</option>"); }).join(""), "</select></label>\n    <label>Depósito<select name=\"location\" required>").concat(availableLocations().map(function (location) { return "<option ".concat(location.code === defaultLocation ? "selected" : "", ">").concat(escapeHtml(location.code), "</option>"); }).join(""), "</select></label>\n    <label>Pago<select name=\"paymentStatus\"><option>Pendiente</option><option>Abonado</option></select></label>\n    <label>Medio de pago<select name=\"paymentMethod\"><option value=\"Efectivo\">Efectivo</option><option value=\"Transferencia\">Transferencia</option></select></label>\n    <div class=\"full items-builder\"><h3>Prendas / trabajos</h3><div data-items-list>\n      ").concat(orderItemRow((firstService && firstService.id) || 1, (firstService && firstService.price) || 0, "", 1), "\n    </div><button class=\"secondary\" type=\"button\" data-add-item>+ Agregar prenda</button></div>\n    <label>Precio total<input name=\"total\" data-items-total type=\"number\" min=\"0\" readonly value=\"").concat((firstService && firstService.price) || 0, "\" /></label>\n    <label class=\"full\">Observaciones<textarea name=\"notes\" placeholder=\"Ej: Frasada polar roja, manchas, preferencias...\"></textarea></label>\n    <button class=\"primary full\">Crear pedido</button>\n  </form>"), function (form) {
        var data = formDataToObject(form);
        var createdAt = new Date().toISOString();
        var items = collectItems(form);
        var primaryService = getService((items[0] && items[0].serviceId) || (firstService && firstService.id));
        var schedule = createOrderSchedule(primaryService, createdAt);
        var orderId = nextId(state.orders);
        var location = data.location || nextFreeLocation();
        var total = orderItemsTotal(items);
        var order = { id: orderId, number: "".concat(location, "-#").concat(String(orderId).padStart(4, "0")), clientId: Number(data.clientId), serviceId: Number(primaryService.id), createdAt: createdAt, estimate: schedule.estimate, cycles: schedule.cycles, status: "Pendiente", items: items, total: total, location: location, notes: data.notes, paymentStatus: data.paymentStatus, paymentMethod: data.paymentMethod };
        state.orders.push(order);
        if (order.paymentStatus === "Abonado")
            syncOrderPayment(order);
        saveState();
        closeModal();
        render();
    });
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
    var orders = state.orders.filter(function (order) { return order.clientId === Number(id); }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
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
    openModal("Editar pedido ".concat(escapeHtml(order.number)), "<form class=\"form-grid\">\n    <label>Dep\u00F3sito / n\u00FAmero<select name=\"location\"><option value=\"\">Sin asignar</option>".concat(locations.map(function (location) { return "<option ".concat(location.code === order.location ? "selected" : "", ">").concat(escapeHtml(location.code), "</option>"); }).join(""), "</select></label>\n    <label>Pago<select name=\"paymentStatus\"><option ").concat(order.paymentStatus !== "Abonado" ? "selected" : "", ">Pendiente</option><option ").concat(order.paymentStatus === "Abonado" ? "selected" : "", ">Abonado</option></select></label>\n    <label>Medio de pago<select name=\"paymentMethod\"><option value=\"Efectivo\" ").concat(order.paymentMethod !== "Transferencia" ? "selected" : "", ">Efectivo</option><option value=\"Transferencia\" ").concat(order.paymentMethod === "Transferencia" ? "selected" : "", ">Transferencia</option></select></label>\n    <label>Precio total<input name=\"total\" type=\"number\" min=\"0\" value=\"").concat(Number(order.total || 0), "\" /></label>\n    <label class=\"full\">Observaciones<textarea name=\"notes\">").concat(escapeHtml(order.notes || ""), "</textarea></label>\n    <button class=\"primary full\">Guardar cambios</button>\n  </form>"), function (form) {
        var data = formDataToObject(form);
        order.location = data.location;
        order.number = orderDisplayCode(order);
        order.paymentStatus = data.paymentStatus;
        order.paymentMethod = data.paymentMethod;
        order.total = Number(data.total);
        order.notes = data.notes;
        if (order.paymentStatus === "Abonado")
            order.paymentStatus = "Abonado";
        syncOrderPayment(order);
        saveState();
        closeModal();
        render();
    });
}
function openOrderStateModal(id) {
    var order = getOrder(id);
    if (!order)
        return;
    openModal("Cambiar estado ".concat(escapeHtml(order.number)), "<form class=\"state-grid\">\n    ".concat(STATES.map(function (status) { return "<label class=\"state-option ".concat(status === order.status ? "selected" : "", "\"><input type=\"radio\" name=\"status\" value=\"").concat(status, "\" ").concat(status === order.status ? "checked" : "", " /> <span>").concat(status, "</span></label>"); }).join(""), "\n    <button class=\"primary full\">Guardar estado</button>\n  </form>"), function (form) {
        var data = formDataToObject(form);
        var previousStatus = order.status;
        order.status = data.status;
        if (order.status === "Retirado") {
            order.wasPaidBeforeRetired = order.paymentStatus === "Abonado";
            order.paymentStatus = "Abonado";
            order.location = "";
            syncOrderPayment(order);
        }
        else if (previousStatus === "Retirado" && !order.wasPaidBeforeRetired) {
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
    return "".concat(base, "\n\nPedido #").concat(order.number, " - Cliente: ").concat(orderClient(order), " - Ubicaci\u00F3n: ").concat(order.location || "sin asignar", ".");
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
    openModal("Mensajes WhatsApp #".concat(escapeHtml(order.number)), html);
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
    openModal(order ? "Cartel dep\u00F3sito #".concat(escapeHtml(order.number)) : "Cartel general de depósito", "\n    <textarea class=\"notice-text\" readonly>".concat(escapeHtml(text), "</textarea>\n    <div class=\"actions\"><button class=\"primary\" data-action=\"copyNotice\">Copiar cartel</button>").concat(order ? "<button class=\"success\" data-action=\"sendStorageNotice\" data-id=\"".concat(order.id, "\">Enviar al cliente</button>") : "", "</div>"));
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
    cashUnlocked = document.getElementById("cashPin").value === state.settings.cashPin;
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
function exportData() {
    var text = JSON.stringify(state, null, 2);
    if (window.navigator && navigator.clipboard)
        navigator.clipboard.writeText(text);
    else
        prompt("Copiá este backup para llevarlo a otro navegador", text);
    alert("Backup preparado. Recordá: Chrome, Firefox y Edge no comparten datos locales entre sí.");
}
function importData() {
    var text = prompt("Pegá acá el backup exportado");
    if (!text)
        return;
    try {
        storageSet(STORAGE_KEY, text);
        state = loadState();
        render();
        alert("Datos importados correctamente.");
    }
    catch (error) {
        alert("No se pudo importar el backup. Revisá que el texto esté completo.");
    }
}
function saveSettings() {
    ["openHour", "closeHour", "whatsappReceivedMessage", "whatsappMessage", "whatsappRetiredMessage", "storageNoticeText", "cashPin"].forEach(function (key) { return state.settings[key] = document.getElementById(key).value; });
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
