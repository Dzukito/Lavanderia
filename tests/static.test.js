const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('app.js', 'utf8');
const styles = readFileSync('styles.css', 'utf8');

for (const section of ['Pedidos', 'Clientes', 'Turnos', 'Depósito', 'Caja', 'Reportes', 'Config.']) {
  assert.match(html, new RegExp(section), `missing navigation section ${section}`);
}

for (const feature of ['escapeHtml', 'availableLocations', 'createOrderSchedule', 'openWhatsapp', 'copyWhatsapp']) {
  assert.match(app, new RegExp(feature), `missing app feature ${feature}`);
}

for (const visualClass of ['nav-button', 'badge', 'storage-grid', 'machine-board']) {
  assert.match(styles, new RegExp(visualClass), `missing visual class ${visualClass}`);
}

console.log('Static tests passed');
