const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('app.js', 'utf8');
const styles = readFileSync('styles.css', 'utf8');

for (const section of ['Pedidos', 'Clientes', 'Turnos', 'Depósito', 'Caja', 'Caja mensual', 'Config.']) {
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
  'sendWhatsapp',
  'storageNoticeText',
  'monthlyCashSummary',
  'cashReportHtml',
  'renderCashReports',
  'orderDisplayCode',
  'openMachineModal',
  'currentWeekDays',
  'setScheduleWeek',
    'openStorageOrder',
  'authorizedPickups',
]) {
  assert.match(app, new RegExp(feature), `missing app feature ${feature}`);
}

assert.doesNotMatch(app, /oninput=/, 'orders search should use delegated events instead of inline handlers');
assert.doesNotMatch(app, /onclick=/, 'modals should use delegated actions instead of inline handlers');
assert.match(app, /paymentStatus/, 'orders should track payment status');
assert.match(app, /const STATES = \["Pendiente", "Listo", "Retirado"\]/, 'orders should use simplified states');
assert.match(app, /whatsappReceivedMessage/, 'WhatsApp should include received notification');
assert.match(app, /if \(view === \"cash\"\) cashUnlocked = false/, 'cash view should request PIN every time');
assert.doesNotMatch(app, /whatsappWorkingMessage/, 'WhatsApp should only expose three customer notifications');
assert.doesNotMatch(app, /whatsappRetiredPaidMessage/, 'WhatsApp should only expose three customer notifications');

for (const visualClass of ['nav-button', 'badge', 'storage-grid', 'machine-board', 'timeline-grid', 'hero-card', 'report-panel', 'location-button', 'client-avatar', 'tab-button', 'state-option', 'schedule-controls', 'machine-click', 'blocked']) {
  assert.match(styles, new RegExp(visualClass), `missing visual class ${visualClass}`);
}

console.log('Static tests passed');
