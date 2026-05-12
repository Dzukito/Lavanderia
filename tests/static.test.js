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
  'exportData',
  'importData',
  'itemLineTotal',
  'orderItemsTotal',
  'orderItemsHtml',
  'metricInsight',
  'pieStyle',
  'topMetric',
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
assert.match(app, /clientHistory/, 'clients should expose history action');
assert.match(app, /data-search-clients|filterClients/, 'clients should include search');
assert.match(app, /openStorageOrder[\s\S]*openOrderViewModal/, 'storage clicks should open read-only order view');
assert.match(app, /saveMachineSlot/, 'machines should allow manual order assignment');
assert.match(app, /wasPaidBeforeRetired/, 'retired state should remember previous payment status');
assert.match(app, /orderItemsHtml/, 'orders should render itemized garments with prices');
assert.match(app, /metricInsight/, 'metrics should expose monthly insights');
assert.match(app, /pie-chart|pieStyle|topClient|topService|topHour/, 'metrics should include pie charts and client/service/hour insights');
assert.doesNotMatch(app, /Insights para el dueño/, 'metrics should not show the owner insights banner');
assert.match(app, /Ticket promedio|Medio fuerte|metrics-month-grid/, 'metrics should include monthly comparison insights');
assert.doesNotMatch(app, /💵|🏦/, 'payment method labels should not include emoji icons');
assert.match(app, /copyWhatsapp[\s\S]*copy-status/, 'WhatsApp copy buttons should show copied feedback');
assert.match(app, /cash-income-row|cash-expense-row|Saldo final/, 'cash table should group income and expense with totals');
assert.match(app, /description: .*orderClient\(order\).*orderDisplayCode\(order\)/, 'cash payment description should include client and order code');
assert.match(app, /var STATES = \["Pendiente", "Listo", "Retirado"\]/, 'orders should use simplified states');
assert.match(app, /whatsappReceivedMessage/, 'WhatsApp should include received notification');
assert.match(app, /if \(view === "cash"\)[\s\S]{0,40}cashUnlocked = false/, 'cash view should request PIN every time');
assert.doesNotMatch(app, /whatsappWorkingMessage/, 'WhatsApp should only expose three customer notifications');
assert.doesNotMatch(app, /whatsappRetiredPaidMessage/, 'WhatsApp should only expose three customer notifications');

for (const visualClass of ['nav-button', 'badge', 'storage-grid', 'machine-board', 'timeline-grid', 'hero-card', 'report-panel', 'location-button', 'client-avatar', 'tab-button', 'state-option', 'schedule-controls', 'machine-click', 'blocked', 'item-row', 'payment-badge', 'free-machine-badge', 'machine-assign-form', 'history-item', 'history-list', 'metric-insights', 'metric-bars', 'metric-month-card', 'metrics-month-grid', 'order-item-line', 'order-items-list', 'cash-movements-table', 'cash-type-badge', 'cash-expense-row', 'cash-income-row', 'pie-row', 'pie-chart', 'copy-status']) {
  assert.match(styles, new RegExp(visualClass), `missing visual class ${visualClass}`);
}

console.log('Static tests passed');
