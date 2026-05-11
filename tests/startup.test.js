const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

class ElementStub {
  constructor(id = '') {
    this.id = id;
    this.innerHTML = '';
    this.value = '';
    this.attributes = [];
    this.classList = { toggle() {} };
  }

  getAttribute(name) {
    if (name === 'data-view') return this.dataView || '';
    return this[name] || '';
  }

  addEventListener() {}
  appendChild() {}
  querySelector() { return new ElementStub(); }
  querySelectorAll() { return []; }
}

const elements = {};
for (const id of ['dashboard', 'orders', 'clients', 'schedule', 'storage', 'cash', 'cashReports', 'settings', 'todayStatus']) {
  elements[id] = new ElementStub(id);
}

const navButtons = ['dashboard', 'orders', 'clients', 'schedule', 'storage', 'cash', 'cashReports', 'settings'].map((view) => {
  const button = new ElementStub();
  button.dataView = view;
  return button;
});

const context = {
  console,
  Intl,
  Date,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  JSON,
  RegExp,
  TypeError,
  encodeURIComponent,
  isNaN,
  localStorage: { getItem: () => null, setItem: () => {} },
};
context.window = context;
context.document = {
  body: new ElementStub('body'),
  addEventListener() {},
  createElement() { return new ElementStub(); },
  getElementById(id) { return elements[id] || null; },
  querySelector(selector) { return selector === '.content' ? new ElementStub('content') : null; },
  querySelectorAll(selector) {
    if (selector === '.view') return Object.values(elements).filter((element) => element.id && element.id !== 'todayStatus');
    if (selector === '.nav-button') return navButtons;
    return [];
  },
};
context.addEventListener = () => {};

vm.createContext(context);
for (const file of ['polyfills.js', 'scheduler.js', 'app.js']) {
  vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
}

assert.match(elements.dashboard.innerHTML, /Nuevo pedido|Pedidos pendientes/, 'dashboard should render during startup');
assert.match(elements.cash.innerHTML, /Caja protegida/, 'cash view should render locked during startup');
assert.match(elements.settings.innerHTML, /Configuración/, 'settings should render during startup');

console.log('Startup smoke test passed');
