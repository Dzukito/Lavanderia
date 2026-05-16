const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('app.js', 'utf8');
const styles = readFileSync('styles.css', 'utf8');
const scheduler = readFileSync('scheduler.js', 'utf8');
const polyfills = readFileSync('polyfills.js', 'utf8');

for (const section of ['Pedidos', 'Clientes', 'Turnos', 'Depósito', 'Caja', 'Métricas', 'Config.']) {
  assert.match(html, new RegExp(section), `missing navigation section ${section}`);
}
assert.doesNotMatch(html, /data-view="reports"/, 'reports should live inside Caja instead of a separate nav item');
assert.match(html, /La Vieja Esquina/, 'header should show laundry name');

for (const feature of [
  'escapeHtml',
  'availableLocations',
  'createOrderSchedule',
  'openOrderEditModal',
  'openOrderStateModal',
  'orderCards',
  'syncOrderPayment',
  'openWhatsappMenu',
  'copyWhatsapp',
  'sendWhatsapp',
  'storageNoticeText',
  'monthlyCashSummary',
  'cashReportHtml',
  'renderCashReports',
  'orderDisplayCode',
  'fourDigitId',
  'customerOrderCode',
  'openMachineModal',
  'collectItems',
  'paymentBadge',
  'paymentMethodLabel',
  'cloneData',
  'safeReplaceAll',
  'leftPad',
  'currentWeekDays',
  'setScheduleWeek',
    'openStorageOrder',
  'openClientHistoryModal',
  'openOrderViewModal',
  'saveMachineSlot',
  'saveQuickMachineSlot',
  'closeCashDay',
  'exportHistoricalCash',
  'itemLineTotal',
  'orderItemsTotal',
  'orderItemsHtml',
  'topMetrics',
  'monthlyPerformanceLineChart',
  'metricsControlsHtml',
  'cycleHistoryHtml',
  'assignOrderSequenceWithoutMachine',
  'monthlyCashHtml',
  'signedCashAmount',
  'filterClients',
  'clientCards',
  'authorizedPickups',
  'openUnscheduledOrdersModal',
  'openFreeSlotFinder',
  'rescheduleActiveOrders',
  'saveMachineBlock',
  'openMachineBlockModal',
  'deleteCycle',
  'saveCycleEdit',
  'openCycleEditModal',
  'nextFreeMachineSlot',
  'machineConflicts',
  'cycleOverlapsRange',
  'scheduleTimeSlots',
  'scheduleVisibleDays',
  'schedulePredictions',
  'activeScheduleCycles',
  'calendarScheduleCycles',
  'scheduleMachines',
  'pendingScheduleTicketsHtml',
  'pendingScheduleOrders',
  'compactOrderTicketHtml',
  'compactCycleHtml',
  'dailyScheduleSlots',
  'assignOrderToMachineFromDrop',
  'moveCycleToTime',
  'moveCycleToMachineName',
  'schedulePlanningStart',
  'calculateScheduleFromSelectedTime',
  'assignOrderToCalendarTime',
  'updateSchedulePreview',
  'currentCycleForMachine',
  'nextCycleForMachine',
  'machineStatusLabel',
  'scheduleDayAgendaHtml',
  'scheduleAgendaGroup',
  'assignNextOrder',
  'openAssignAtSuggestedSlot',
  'confirmSuggestedSlot',
  'shiftCycleMinutes',
  'moveCycleToNextFreeSlot',
  'moveCycleToFreeMachine',
  'finishCycleNow',
  'importCsvData',
  'importClientsCsv',
  'importOrdersCsv',
]) {
  assert.match(app, new RegExp(feature), `missing app feature ${feature}`);
}

assert.doesNotMatch(app, /oninput=/, 'orders search should use delegated events instead of inline handlers');
assert.doesNotMatch(app, /onclick=/, 'modals should use delegated actions instead of inline handlers');
assert.match(app, /paymentStatus/, 'orders should track payment status');
assert.doesNotMatch(app, /structuredClone/, 'app should avoid structuredClone to support older browsers');
assert.doesNotMatch(app, /replaceAll/, 'app should avoid String.replaceAll to support older browsers');
assert.doesNotMatch(app, /\?\./, 'app should avoid optional chaining to support older browsers');
assert.doesNotMatch(app, /\|\|=/, 'app should avoid logical assignment to support older browsers');
assert.doesNotMatch(app, /Object\.fromEntries/, 'app should avoid Object.fromEntries to support older browsers');
assert.doesNotMatch(app, /dateStyle|timeStyle/, 'app should avoid newer Intl dateStyle/timeStyle options');
assert.doesNotMatch(app, /Number\.isNaN/, 'app should avoid Number.isNaN to support older browsers');
assert.doesNotMatch(app, /padStart/, 'app should avoid String.padStart to support older browsers');
assert.doesNotMatch(app, /Array\.from|Object\.entries|new Map|new Set|selectedOptions|\.dataset/, 'startup path should avoid fragile modern DOM/runtime helpers');
assert.doesNotMatch(app + scheduler + polyfills, /=>|`|\bconst\b|\blet\b|\?\./, 'runtime scripts should avoid syntax that breaks old browsers at parse time');
assert.match(html, /polyfills\.js[\s\S]*scheduler\.js[\s\S]*app\.js/, 'polyfills should load before runtime scripts');
assert.match(polyfills, /Array\.from/, 'polyfills should still cover Array.from if future code needs it');
assert.match(polyfills, /window\.Map/, 'polyfills should cover Map used by compiled scripts');
assert.match(polyfills, /elementPrototype\.closest/, 'polyfills should cover delegated click helpers');
assert.doesNotMatch(app, /Cantidad de valets/, 'new order should use manual items instead of valet quantity');
assert.match(app, /data-items-list/, 'new order should include manual item rows');
assert.match(app, /itemQuantity/, 'new order should allow item quantities');
assert.match(app, /data-items-total[^\n]+readonly/, 'new order total should be calculated read-only');
assert.match(app, /data-client-autocomplete[\s\S]*datalist[\s\S]*clientIdFromInput/, 'new orders should use client autocomplete instead of a huge select');
assert.match(app, /orderDisplayCode[\s\S]*Retirado[\s\S]*R#[\s\S]*Sin depósito#[\s\S]*fourDigitId/, 'only retired orders should use R# while active no-deposit orders show Sin depósito plus id');
assert.match(app, /previousStatus === \"Retirado\"[\s\S]*order\.location = \"\"[\s\S]*order\.number = orderDisplayCode\(order\)/, 'orders returned from Retirado should keep id but show Sin depósito plus id');
assert.doesNotMatch(app, /if \(hidden && hidden\.value\)[\s\S]{0,80}return Number\(hidden\.value\)/, 'client autocomplete should not reuse a stale hidden client after text changes');
assert.match(app, /class=\\"success\\" data-action=\\"clientHistory\\"/, 'client history should use green button styling');
assert.match(app, /class=\\"primary\\" data-action=\\"editClient\\"/, 'client edit should use blue button styling');
assert.match(app, /data-search-clients|filterClients/, 'clients should include search');
assert.match(app, /openStorageOrder[\s\S]*openOrderViewModal/, 'storage clicks should open read-only order view');
assert.match(app, /saveMachineSlot/, 'machines should allow manual order assignment');
assert.match(app, /schedule-workspace/, 'schedule should use a workspace layout');
assert.match(app, /pendingScheduleTicketsHtml/, 'schedule should include right pending ticket column');
assert.match(app, /data-drop-time[\s\S]*assignOrderToCalendarTime/, 'schedule should support dropping tickets on daily time slots');
assert.match(app, /assignOrderSequenceWithoutMachine[\s\S]*machine: ""[\s\S]*pendingMachine: true/, 'dropping on agenda should create unassigned turns that do not occupy machines until edited');
assert.match(app, /cycleHistoryHtml[\s\S]*Historial de turnos[\s\S]*Sin máquina asignada/, 'order details should show turn history for machine traceability');
assert.doesNotMatch(app, /data-drop-machine/, 'machines should be view-only, not drop targets');
assert.match(app, /data-drop-time[\s\S]*moveCycleToTime/, 'schedule should support moving cycles to daily time slots');
assert.doesNotMatch(app, /schedule-calendar-panel|<h3>Calendario<\/h3>|simple-calendar-panel/, 'schedule should not render a separate calendar panel');
assert.doesNotMatch(app, /data-plan-date|data-plan-time|Calcular turnos/, 'schedule should not show top date/time calculate controls');
assert.match(app, /createOrderSchedule[\s\S]*cycles: \[\]/, 'new orders should not auto-fill schedule before being dragged');
assert.match(app, /openCycleEditModal[\s\S]*cycle-quick-actions[\s\S]*saveCycleEdit[\s\S]*deleteCycle/, 'schedule cycles should remain editable when opened from agenda');
assert.match(app, /openMachineBlockModal[\s\S]*saveMachineBlock[\s\S]*Bloqueo/, 'schedule should support machine blocks');
assert.match(app, /schedulePredictions[\s\S]*nextFreeMachineSlot[\s\S]*openAssignAtSuggestedSlot/, 'schedule should include actionable predictive availability');
assert.match(app, /updateSchedulePreview[\s\S]*schedule-preview-note[\s\S]*data-preview-field/, 'schedule edit modals should include live schedule preview feedback');

assert.match(app, /wasPaidBeforeRetired/, 'retired state should remember previous payment status');
assert.match(app, /orderItemsHtml/, 'orders should render itemized garments with prices');
assert.doesNotMatch(app, /escapeHtml\(itemSummary\(order\)\).*formatDateTime/, 'order header should not duplicate item summary above item list');
assert.match(app, /data-metrics-month/, 'metrics should allow selecting any month');
assert.match(app, /top-client-link[\s\S]*clientHistory|clientHistory[\s\S]*Top 3 clientes del mes/, 'metrics should link top clients to histories');
assert.doesNotMatch(app, /Pedidos por hora|orderHourLineChart/, 'metrics should remove the orders-by-hour chart');
assert.match(app, /monthlyPerformanceLineChart[\s\S]*Saldo neto[\s\S]*polyline[\s\S]*Meses del año/, 'metrics should include a large monthly performance line chart with X/Y axis detail');
assert.match(app, /data-metrics-year[\s\S]*data-metrics-month[\s\S]*data-metrics-compare/, 'metrics should filter by year and month and support month comparison');
assert.match(app, /Mejor mes histórico[\s\S]*monthlyCashHtml/, 'metrics should include best historical month and monthly cash');
assert.doesNotMatch(app, /Idea:|Objetivo:|pie-chart|pieStyle/, 'metrics should not include idea/objective labels or pie charts');
assert.match(app, /Métricas protegidas|cashReports[\s\S]*cashUnlocked/, 'metrics should require PIN');
assert.doesNotMatch(app, /💵|🏦/, 'payment method labels should not include emoji icons');
assert.match(app, /copyWhatsapp[\s\S]*copy-status/, 'WhatsApp copy buttons should show copied feedback');
assert.match(app, /cash-income-row|cash-expense-row|Saldo final/, 'cash table should group income and expense with totals');
assert.doesNotMatch(app, /<th>Acciones<\/th>|cash-delete-link|openDeleteCashModal|deleteCashEntry|Borrar movimiento/, 'cash should not offer deletion for cash entries');
assert.match(app, /closeCashDay[\s\S]*cashHistory|Empezar nuevo día/, 'cash should close the day into historical storage');
assert.match(app, /exportHistoricalCash[\s\S]*signedCashAmount[\s\S]*caja-historica[\s\S]*\.csv/, 'cash should export historical cash as CSV with negative expenses');
assert.match(app, /Exportar caja histórica CSV/, 'cash export button should clearly name the historical cash export');
assert.match(app, /exportMonthlyCash[\s\S]*caja-mensual[\s\S]*\.csv/, 'metrics should export only the selected monthly cash as CSV');
assert.match(app, /Exportar caja mensual CSV/, 'metrics export button should clearly name the monthly cash export');
assert.match(app, /metricsPin: "1111"/, 'metrics PIN should default to 1111');
assert.match(app, /metricsPin[\s\S]*Clave de métricas/, 'settings should allow editing metrics PIN');
assert.match(app, /cashReports[\s\S]*metricsPinUnlock|metricsPinUnlock[\s\S]*cashReports/, 'metrics should read its own unlock field instead of the hidden cash PIN field');
assert.doesNotMatch(app, /data-action="exportData"|data-action="importData"/, 'settings should not expose generic import/export data actions');
assert.match(app, /Importar CSV[\s\S]*csvImportType[\s\S]*Clientes[\s\S]*Pedidos[\s\S]*csvImportFile[\s\S]*importCsvData/, 'settings should import clients or orders from CSV');
assert.match(app, /description: .*orderClient\(order\).*orderDisplayCode\(order\)/, 'cash payment description should include client and order code');
assert.match(app, /var STATES = \["Pendiente", "Listo", "Retirado"\]/, 'orders should use simplified states');
assert.match(app, /whatsappReceivedMessage/, 'WhatsApp should include received notification');
assert.match(app, /Total: \{total\}/, 'WhatsApp templates should include order total for customers');
assert.match(app, /messageForOrder[\s\S]*customerOrderCode\(order\)/, 'WhatsApp messages should send the simple customer order id instead of the storage code');
assert.match(app, /if \(view === "cash" \|\| view === "cashReports"\)[\s\S]{0,80}cashUnlocked = false/, 'cash and metrics views should request PIN every time');
assert.match(app, /activeScheduleCycles[\s\S]*order\.block \|\| order\.status === "Pendiente"/, 'machines should only show pending orders as active machine work');
assert.match(app, /calendarScheduleCycles[\s\S]*order\.block \|\| \(order\.cycles \|\| \[\]\)\.length/, 'calendar should keep scheduled cycles even after status changes');
assert.doesNotMatch(app, /whatsappWorkingMessage/, 'WhatsApp should only expose three customer notifications');
assert.doesNotMatch(app, /whatsappRetiredPaidMessage/, 'WhatsApp should only expose three customer notifications');

for (const visualClass of ['nav-button', 'badge', 'storage-grid', 'machine-board', 'timeline-grid', 'hero-card', 'report-panel', 'location-button', 'client-avatar', 'tab-button', 'state-option', 'schedule-controls', 'machine-click', 'blocked', 'item-row', 'payment-badge', 'free-machine-badge', 'machine-assign-form', 'history-item', 'history-list', 'metric-insights', 'metric-bars', 'metric-month-card', 'metrics-month-grid', 'cash-day-hero', 'new-day-button', 'interactive-card', 'metric-glow', 'metrics-focus-grid', 'top-client-link', 'performance-line-card', 'metrics-controls', 'y-axis-title', 'performance-points', 'performance-axis-labels', 'monthly-cash-panel', 'comparison-chip', 'turn-history', 'unassigned-cycle', 'negative-amount', 'order-item-line', 'order-items-list', 'cash-movements-table', 'cash-type-badge', 'cash-expense-row', 'cash-income-row', 'copy-status', 'schedule-free-slots', 'blocked-slot', 'schedule-slot', 'flexible-calendar', 'schedule-quick-actions', 'schedule-prediction-strip', 'schedule-calendar-panel', 'machine-status-card', 'dynamic-machine-board', 'schedule-machine-overview', 'schedule-preview-note', 'friendly-schedule-hero', 'schedule-main-action', 'schedule-simple-summary', 'day-agenda', 'agenda-group', 'agenda-item', 'agenda-time', 'agenda-machine', 'schedule-advanced-actions', 'cycle-quick-actions', 'cycle-quick-button', 'machine-now', 'machine-next', 'machine-finish-time', 'machine-free-state', 'machine-working-state', 'empty-schedule-state', 'schedule-help', 'schedule-simple-hero', 'simple-schedule-summary', 'simple-machine-panel', 'simple-machine-grid', 'simple-machine-card', 'simple-day-agenda', 'simple-agenda-row', 'simple-advanced', 'simple-machine-modal', 'simple-modal-job', 'machine-simple-status', 'machine-simple-actions', 'simple-assign-details', 'simple-date-picker', 'schedule-workspace', 'pending-ticket-column', 'pending-ticket', 'pending-ticket-code', 'pending-ticket-client', 'pending-ticket-meta', 'compact-ticket', 'compact-cycle', 'detail-dot', 'daily-slot-list', 'daily-slot', 'slot-empty', 'selected-ticket']) {
  assert.match(styles, new RegExp(visualClass), `missing visual class ${visualClass}`);
}

console.log('Static tests passed');
