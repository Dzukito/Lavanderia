const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('app.js', 'utf8');
const styles = readFileSync('styles.css', 'utf8');

for (const section of ['Pedidos', 'Clientes', 'Turnos', 'Depósito', 'Caja', 'Reportes', 'Config.']) {
  assert.match(html, new RegExp(section), `missing navigation section ${section}`);
}

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
  'currentWeekDays',
  'authorizedPickups',
]) {
  assert.match(app, new RegExp(feature), `missing app feature ${feature}`);
}

assert.doesNotMatch(app, /oninput=/, 'orders search should use delegated events instead of inline handlers');
assert.doesNotMatch(app, /onclick=/, 'modals should use delegated actions instead of inline handlers');
assert.match(app, /paymentStatus/, 'orders should track payment status');
assert.match(app, /whatsappRetiredPaidMessage/, 'WhatsApp should include retired and paid acknowledgement');

for (const visualClass of ['nav-button', 'badge', 'storage-grid', 'machine-board', 'timeline-grid', 'hero-card']) {
  assert.match(styles, new RegExp(visualClass), `missing visual class ${visualClass}`);
}

console.log('Static tests passed');
