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
  'openMachineModal',
  'collectItems',
  'paymentBadge',
  'paymentMethodLabel',
  'cloneData',
  'safeReplaceAll',
  'currentWeekDays',
  'setScheduleWeek',
    'openStorageOrder',
  'openClientHistoryModal',
  'openOrderViewModal',
  'saveMachineSlot',
  'deleteCashEntry',
  'closeCashDay',
  'exportHistoricalCash',
  'itemLineTotal',
  'orderItemsTotal',
  'orderItemsHtml',
  'topMetrics',
  'orderHourLineChart',
  'monthlyCashHtml',
  'signedCashAmount',
  'filterClients',
  'clientCards',
  'authorizedPickups',
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
assert.match(app, /orderDisplayCode[\s\S]*Retirado[\s\S]*R#[\s\S]*Sin dep/, 'only retired orders should use R# while active no-deposit orders show Sin depósito');
assert.match(app, /previousStatus === \"Retirado\"[\s\S]*order\.location = \"\"[\s\S]*order\.number = orderDisplayCode\(order\)/, 'orders returned from Retirado should keep id but show Sin depósito');
assert.doesNotMatch(app, /if \(hidden && hidden\.value\)[\s\S]{0,80}return Number\(hidden\.value\)/, 'client autocomplete should not reuse a stale hidden client after text changes');
assert.match(app, /class=\\"success\\" data-action=\\"clientHistory\\"/, 'client history should use green button styling');
assert.match(app, /class=\\"primary\\" data-action=\\"editClient\\"/, 'client edit should use blue button styling');
assert.match(app, /data-search-clients|filterClients/, 'clients should include search');
assert.match(app, /openStorageOrder[\s\S]*openOrderViewModal/, 'storage clicks should open read-only order view');
assert.match(app, /saveMachineSlot/, 'machines should allow manual order assignment');
assert.match(app, /wasPaidBeforeRetired/, 'retired state should remember previous payment status');
assert.match(app, /orderItemsHtml/, 'orders should render itemized garments with prices');
assert.doesNotMatch(app, /escapeHtml\(itemSummary\(order\)\).*formatDateTime/, 'order header should not duplicate item summary above item list');
assert.match(app, /data-metrics-month/, 'metrics should allow selecting any month');
assert.match(app, /top-client-link[\s\S]*clientHistory|clientHistory[\s\S]*Top 3 clientes del mes/, 'metrics should link top clients to histories');
assert.match(app, /orderHourLineChart[\s\S]*yTicks[\s\S]*polyline/, 'metrics should include a line chart of orders by hour with Y-axis counts');
assert.match(app, /Mejor mes histórico[\s\S]*monthlyCashHtml/, 'metrics should include best historical month and monthly cash');
assert.match(app, /counts\.map[\s\S]*hour-axis-labels/, 'hour chart should render all hours on the x axis');
assert.doesNotMatch(app, /Idea:|Objetivo:|pie-chart|pieStyle/, 'metrics should not include idea/objective labels or pie charts');
assert.match(app, /Métricas protegidas|cashReports[\s\S]*cashUnlocked/, 'metrics should require PIN');
assert.doesNotMatch(app, /💵|🏦/, 'payment method labels should not include emoji icons');
assert.match(app, /copyWhatsapp[\s\S]*copy-status/, 'WhatsApp copy buttons should show copied feedback');
assert.match(app, /cash-income-row|cash-expense-row|Saldo final/, 'cash table should group income and expense with totals');
assert.doesNotMatch(app, /<th>Acciones<\/th>|cash-delete-link/, 'cash table should not show a delete column or inline x action');
assert.match(app, /openDeleteCashModal[\s\S]*cash-delete-option[\s\S]*deleteCashEntry/, 'cash deletion should happen from a separate selector button');
assert.match(app, /closeCashDay[\s\S]*cashHistory|Empezar nuevo día/, 'cash should close the day into historical storage');
assert.match(app, /exportHistoricalCash[\s\S]*signedCashAmount[\s\S]*caja-historica[\s\S]*\.csv/, 'cash should export historical cash as CSV with negative expenses');
assert.match(app, /metricsPin: "1111"/, 'metrics PIN should default to 1111');
assert.match(app, /metricsPin[\s\S]*Clave de métricas/, 'settings should allow editing metrics PIN');
assert.match(app, /cashReports[\s\S]*metricsPinUnlock|metricsPinUnlock[\s\S]*cashReports/, 'metrics should read its own unlock field instead of the hidden cash PIN field');
assert.doesNotMatch(app, /data-action="exportData"|data-action="importData"/, 'settings should not expose generic import/export data actions');
assert.match(app, /description: .*orderClient\(order\).*orderDisplayCode\(order\)/, 'cash payment description should include client and order code');
assert.match(app, /var STATES = \["Pendiente", "Listo", "Retirado"\]/, 'orders should use simplified states');
assert.match(app, /whatsappReceivedMessage/, 'WhatsApp should include received notification');
assert.match(app, /if \(view === "cash" \|\| view === "cashReports"\)[\s\S]{0,80}cashUnlocked = false/, 'cash and metrics views should request PIN every time');
assert.doesNotMatch(app, /whatsappWorkingMessage/, 'WhatsApp should only expose three customer notifications');
assert.doesNotMatch(app, /whatsappRetiredPaidMessage/, 'WhatsApp should only expose three customer notifications');

for (const visualClass of ['nav-button', 'badge', 'storage-grid', 'machine-board', 'timeline-grid', 'hero-card', 'report-panel', 'location-button', 'client-avatar', 'tab-button', 'state-option', 'schedule-controls', 'machine-click', 'blocked', 'item-row', 'payment-badge', 'free-machine-badge', 'machine-assign-form', 'history-item', 'history-list', 'metric-insights', 'metric-bars', 'metric-month-card', 'metrics-month-grid', 'cash-day-hero', 'new-day-button', 'interactive-card', 'metric-glow', 'metrics-focus-grid', 'top-client-link', 'hour-line-chart', 'y-axis-title', 'hour-points', 'monthly-cash-panel', 'cash-delete-list', 'cash-delete-option', 'hour-axis-labels', 'negative-amount', 'order-item-line', 'order-items-list', 'cash-movements-table', 'cash-type-badge', 'cash-expense-row', 'cash-income-row', 'copy-status']) {
  assert.match(styles, new RegExp(visualClass), `missing visual class ${visualClass}`);
}

console.log('Static tests passed');
