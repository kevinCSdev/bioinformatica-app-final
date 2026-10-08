import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { AppState } from '../js/state/AppState.js';
import { AlgorithmType, DefaultScoring, SubstitutionType } from '../js/core/Types.js';
import { validarEntrada, TipoSecuencia } from '../js/core/Validacion.js';
import { DotplotEngine } from '../js/core/DotplotEngine.js';

// Execute the real entry point and state machine; stub only browser presentation.
class Element {
  constructor(tagName = 'DIV') {
    this.tagName = tagName;
    this.value = '';
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.classes = new Set();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name),
      toggle: (name, force = !this.classes.has(name)) => {
        if (force) this.classes.add(name);
        else this.classes.delete(name);
      }
    };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, properties = {}) {
    const event = {
      target: this,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {},
      ...properties
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
  click() { return this.dispatch('click'); }
  querySelector() { return this.child ??= new Element(); }
  appendChild() {}
  replaceChildren() {}
}

const executionIds = ['calculateButton', 'anterior', 'siguiente', 'autoRunButton', 'finalButton', 'resetButton'];
const exportIds = ['exportCsvButton', 'exportPngButton'];
const source = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '');
const elements = new Map();
const get = id => {
  if (!elements.has(id)) elements.set(id, new Element());
  return elements.get(id);
};
for (const id of [...executionIds, ...exportIds]) {
  get(id).tagName = 'A';
  get(id).setAttribute('href', '#');
  get(id).setAttribute('role', 'button');
}
for (const id of ['seq_1', 'seq_2', 'matchScore', 'mismatchScore', 'gapScore', 'dotplotWindow', 'dotplotThreshold']) {
  get(id).tagName = 'INPUT';
}
get('seq_1').value = 'AGTC';
get('seq_2').value = 'AGTC';
get('algo-select').value = 'NW';
get('tipo-select').value = 'adn';
get('tipo-select').options = [{ textContent: 'ADN' }];
get('tipo-select').selectedIndex = 0;
get('dotplotWindow').value = '1';
get('dotplotThreshold').value = '1';
get('dotplotOverlayToggle').checked = true;
get('dotplotOverlayToggle').tagName = 'INPUT';
const document = new Element();
document.getElementById = get;
document.querySelector = get;
document.querySelectorAll = selector => selector === '.campo-invalido'
  ? [...elements.values()].filter(el => el.classes.has('campo-invalido')) : [];
document.createElement = tag => new Element(tag.toUpperCase());
const window = new Element();
const timers = new Map();
let timerId = 0;
const calls = {};
let state;
class ObservedState extends AppState {
  constructor() {
    super();
    state = this;
    for (const method of ['init', 'stepForward', 'stepBackward', 'toggleAutoRun', 'instantCompute', 'reset']) {
      const original = this[method].bind(this);
      this[method] = (...args) => {
        calls[method] = (calls[method] || 0) + 1;
        return original(...args);
      };
    }
  }
}
const presentation = class {
  mount() {}
  updateMatrixCells() {}
  renderEmpty() {}
  update() {}
  render() {}
  clearTraceback() {}
  renderTracebackArrow() {}
};
let renders = 0;
let csvExports = 0;
let pngExports = 0;
// AppState's imported methods use the host timers, so replace them for this process.
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
globalThis.setInterval = callback => { timers.set(++timerId, callback); return timerId; };
globalThis.clearInterval = id => timers.delete(id);
try {
  vm.runInNewContext(source, {
    document, window, console,
    AppState: ObservedState, D3Renderer: presentation, MathPanel: presentation, SummaryPanel: presentation,
    AlgorithmType, DefaultScoring, SubstitutionType, validarEntrada, TipoSecuencia, DotplotEngine,
    DotplotView: { render() { renders++; }, exportToPng() { pngExports++; } },
    exportarCSV() { csvExports++; }, exportarPNG() { pngExports++; }
  }, { filename: 'js/main.js' });
  document.dispatch('DOMContentLoaded');
  const snapshot = () => ({ ...calls });
  const dotplot = () => get('tab-btn-dotplot').click();
  const matrix = () => get('tab-btn-matrix').click();
  const assertDisabled = (ids, disabled) => {
    for (const id of ids) {
      assert.equal(get(id).getAttribute('aria-disabled'), String(disabled), `${id} aria-disabled`);
      assert.equal(get(id).classList.contains('control-bloqueado'), disabled, `${id} visible disabled class`);
      assert.equal(get(id).getAttribute('tabindex'), disabled ? '-1' : null, `${id} tab order`);
    }
  };

  // First assertion is behavioral: .click() must not reach any execution handler.
  dotplot();
  let before = snapshot();
  for (const id of executionIds) get(id).click();
  assert.deepEqual(snapshot(), before, 'Dotplot programmatic clicks must suppress all six execution handlers');
  assertDisabled(executionIds, true);
  assertDisabled(exportIds, false);
  for (const id of executionIds) {
    assert.equal(get(id).dispatch('click').defaultPrevented, true, `${id} cancels anchor navigation`);
  }
  assert.deepEqual(snapshot(), before, 'Dispatched pointer clicks must also suppress handlers');
  for (const code of ['Space', 'ArrowRight', 'ArrowLeft', 'Enter']) {
    window.dispatch('keydown', { code, target: get('siguiente') });
    // Native Enter activation of an anchor ultimately dispatches click.
    if (code === 'Enter') get('siguiente').click();
  }
  assert.deepEqual(snapshot(), before, 'Dotplot keyboard activation and shortcuts must not execute');
  for (const id of ['dotplotWindow', 'dotplotThreshold', 'dotplotOverlayToggle']) {
    const previousRenders = renders;
    get(id).dispatch('change');
    assert(renders > previousRenders, `${id} remains interactive`);
    assert.notEqual(get(id).getAttribute('aria-disabled'), 'true');
  }
  get('exportCsvButton').click();
  get('exportPngButton').click();
  assert.equal(csvExports, 1);
  assert.equal(pngExports, 1);
  console.log('[PASS] Dotplot handler suppression, keyboard, tab state, parameters and exports');

  matrix();
  assertDisabled(executionIds, false);
  before = snapshot();
  for (const id of executionIds) get(id).click();
  for (const method of ['init', 'stepBackward', 'stepForward', 'toggleAutoRun', 'instantCompute', 'reset']) {
    assert(calls[method] > (before[method] || 0), `Matrix restores ${method}`);
  }
  before = snapshot();
  window.dispatch('keydown', { code: 'ArrowRight' });
  assert.equal(calls.stepForward, before.stepForward + 1, 'Matrix shortcut restored');

  get('autoRunButton').click();
  assert.equal(timers.size, 1, 'Real AppState has an active scheduled interval');
  dotplot();
  assert.equal(timers.size, 0, 'Entering Dotplot clears the active timer');
  assert.equal(state.autoRunTimer, null);
  assert.equal(get('autorun-label').textContent, 'Auto Ejecutar');
  before = snapshot();
  for (const tick of timers.values()) tick();
  assert.deepEqual(snapshot(), before, 'No pending autorun ticks can advance Dotplot');
  matrix();
  assert.equal(timers.size, 0, 'Leaving Dotplot does not restart autorun');
  console.log('[PASS] Matrix execution restoration and active autorun cancellation');

  // Invalid input before entering, and validation changes while inside Dotplot.
  get('seq_1').value = '!';
  get('seq_1').dispatch('change');
  dotplot();
  assertDisabled(executionIds, true);
  assertDisabled(exportIds, true);
  get('exportCsvButton').click();
  get('exportPngButton').click();
  assert.equal(csvExports, 1, 'Invalid Dotplot does not export CSV');
  assert.equal(pngExports, 1, 'Invalid Dotplot does not export PNG');
  matrix();
  assertDisabled(executionIds.slice(1), true);
  assertDisabled(['calculateButton'], false); // Keep the existing revalidation action.
  before = snapshot();
  for (const id of executionIds.slice(1)) get(id).click();
  window.dispatch('keydown', { code: 'Space' });
  assert.deepEqual(snapshot(), before, 'Invalid Matrix handlers remain suppressed');
  dotplot();
  get('seq_1').value = 'AGTC';
  get('seq_1').dispatch('change');
  assertDisabled(executionIds, true);
  assertDisabled(exportIds, false);
  before = snapshot();
  for (const id of executionIds) get(id).click();
  assert.deepEqual(snapshot(), before, 'Validating in Dotplot cannot reopen execution handlers');
  matrix();
  assertDisabled(executionIds, false);
  dotplot();
  get('gapScore').value = 'bad';
  get('gapScore').dispatch('change');
  matrix();
  assertDisabled(executionIds.slice(1), true);
  assertDisabled(exportIds, true);
  console.log('[PASS] Invalid Matrix state preserved and current validation restored on exit');
} finally {
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
}
