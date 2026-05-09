const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('app.js', 'utf8');
const styles = readFileSync('styles.css', 'utf8');

for (const section of ['Pedidos', 'Clientes', 'Turnos', 'Depósito', 'Caja', 'Config.']) {
  assert.match(html, new RegExp(section), `missing navigation section ${section}`);
}
assert.doesNotMatch(html, /data-view="reports"/, 'reports should live inside Caja instead of a separate nav item');

for (const feature of [
  'escapeHtml',
  'availableLocations',
  'createOrderSchedule',
  'openOrderStatusModal',
  'syncOrderPayment',
  'openWhatsappMenu',
  'sendWhatsapp',
  'storageNoticeText',
  'monthlyCashSummary',
  'cashReportHtml',
  'currentWeekDays',
  'setScheduleWeek',
  'openScheduleSimulator',
  'openStorageOrder',
  'authorizedPickups',
]) {
  assert.match(app, new RegExp(feature), `missing app feature ${feature}`);
}

assert.doesNotMatch(app, /oninput=/, 'orders search should use delegated events instead of inline handlers');
assert.doesNotMatch(app, /onclick=/, 'modals should use delegated actions instead of inline handlers');
assert.match(app, /paymentStatus/, 'orders should track payment status');
assert.match(app, /whatsappReceivedMessage/, 'WhatsApp should include received notification');
assert.match(app, /whatsappWorkingMessage/, 'WhatsApp should include working notification');
assert.match(app, /whatsappRetiredPaidMessage/, 'WhatsApp should include retired and paid acknowledgement');

for (const visualClass of ['nav-button', 'badge', 'storage-grid', 'machine-board', 'timeline-grid', 'hero-card', 'report-panel', 'location-button']) {
  assert.match(styles, new RegExp(visualClass), `missing visual class ${visualClass}`);
}

console.log('Static tests passed');
