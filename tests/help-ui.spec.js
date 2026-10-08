import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { AppState } from '../js/state/AppState.js';
import { AlignmentEngine } from '../js/core/AlignmentEngine.js';
import { AlgorithmType, DefaultScoring, SubstitutionType } from '../js/core/Types.js';
import { validarEntrada, TipoSecuencia } from '../js/core/Validacion.js';
import { DotplotEngine } from '../js/core/DotplotEngine.js';

// Presentation-only DOM substitute: this is not browser/accessibility evidence.
class Element {
  constructor() {
    this.tagName = 'DIV'; this.value = ''; this.hidden = false; this.style = {};
    this.listeners = new Map(); this.attributes = new Map(); this.classes = new Set();
    this.classList = { add: n => this.classes.add(n), remove: n => this.classes.delete(n),
      contains: n => this.classes.has(n), toggle: (n, yes) => yes ? this.classes.add(n) : this.classes.delete(n) };
  }
  addEventListener(type, fn) { this.listeners.set(type, [...(this.listeners.get(type) || []), fn]); }
  dispatch(type, extra = {}) {
    const e = { target: this, preventDefault() {}, stopPropagation() {}, ...extra };
    for (const fn of this.listeners.get(type) || []) fn(e);
  }
  click() { this.dispatch('click'); }
  focus() { document.activeElement = this; }
  setAttribute(n, v) { this.attributes.set(n, String(v)); }
  getAttribute(n) { return this.attributes.get(n) ?? null; }
  removeAttribute(n) { this.attributes.delete(n); }
  querySelector() { return this.child ??= new Element(); }
  appendChild() {}
  replaceChildren() {}
}
const elements = new Map();
const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
const document = new Element();
document.getElementById = get; document.querySelector = get; document.querySelectorAll = () => [];
document.createElement = () => new Element();
const window = new Element();
get('seq_1').value = 'AGTC'; get('seq_2').value = 'AGAC';
get('algo-select').value = 'NW'; get('tipo-select').value = 'adn';
get('tipo-select').options = [{ textContent: 'ADN' }]; get('tipo-select').selectedIndex = 0;
get('help-view').hidden = true;
const presentation = class {
  mount() {} updateMatrixCells() {} renderEmpty() {} update() {} render() {}
  clearTraceback() {} renderTracebackArrow() {}
};
let state;
class ObservedState extends AppState { constructor() { super(); state = this; } }
const timers = new Map(); let timerId = 0;
const originalSet = globalThis.setInterval, originalClear = globalThis.clearInterval;
globalThis.setInterval = fn => { timers.set(++timerId, fn); return timerId; };
globalThis.clearInterval = id => timers.delete(id);
try {
  const bindings = { document, window, console, AppState: ObservedState,
    D3Renderer: presentation, MathPanel: presentation, SummaryPanel: presentation, ProteinCatalog: presentation,
    AlgorithmType, DefaultScoring, SubstitutionType, validarEntrada, TipoSecuencia, DotplotEngine,
    DotplotView: { render() {} }, exportarCSV() {}, exportarPNG() {} };
  // Allow the first RED to exercise the missing behavior rather than a missing import.
  if (fs.existsSync(new URL('../js/ui/HelpPanel.js', import.meta.url))) {
    bindings.HelpPanel = (await import('../js/ui/HelpPanel.js')).HelpPanel;
  }
  const source = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInNewContext(source, bindings);
  document.dispatch('DOMContentLoaded');
  get('finalButton').click(); get('tab-btn-dotplot').click();
  const engine = state.engine, paths = state.optimalPaths, matrix = JSON.stringify(engine.matrix);
  get('help-button').focus(); get('help-button').click();
  assert.equal(get('help-view').hidden, false, 'Help opens as a dedicated view');
  assert.equal(get('workspace-view').hidden, true);
  assert.equal(get('nav.sidebar').inert, true);
  assert.equal(document.activeElement, get('help-title'));
  for (const code of ['Space', 'ArrowRight', 'ArrowLeft']) window.dispatch('keydown', { code });
  get('help-return').click();
  assert.equal(document.activeElement, get('help-button'));
  assert.equal(get('help-view').hidden, true);
  assert.equal(get('workspace-view').hidden, false);
  assert.equal(get('nav.sidebar').inert, false);
  assert.equal(state.engine, engine); assert.equal(state.optimalPaths, paths);
  assert.equal(JSON.stringify(engine.matrix), matrix);
  assert.equal(get('seq_1').value, 'AGTC');
  assert.equal(get('tab-btn-dotplot').getAttribute('aria-selected'), 'true');
  get('tab-btn-matrix').click(); get('resetButton').click(); get('autoRunButton').click();
  assert.equal(timers.size, 1);
  const step = state.currentStepIndex;
  get('help-button').click();
  assert.equal(timers.size, 0, 'Opening Help stops actual autorun timer');
  for (const code of ['Space', 'ArrowRight', 'ArrowLeft']) window.dispatch('keydown', { code });
  assert.equal(state.currentStepIndex, step, 'Help shortcuts cannot mutate partial matrix');
  assert.equal(timers.size, 0);
  get('help-return').click();
  assert.equal(timers.size, 0, 'Returning never restarts autorun');
  window.dispatch('keydown', { code: 'ArrowRight' });
  assert.equal(state.currentStepIndex, step + 1, 'Workspace shortcut works on return');
  const example = new AlignmentEngine('A', 'G', { match: 1, mismatch: -1, gap: -2 }, 'NW').computeAll();
  assert.deepEqual(example.matrix, [[0, -2], [-2, -1]]);
  assert.deepEqual(example.findOptimalPaths()[0].steps, ['diagonal']);
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /0 − 1 = −1/); assert.match(html, /−2 − 2 = −4/);
  assert.match(html, /incluidas las columnas con huecos/);
  const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  // Structural guard, not browser geometry: the three-column example must use
  // compact cell padding inside the existing narrow-screen Help rules.
  const narrowHelp = css.match(/@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(narrowHelp, 'Help has narrow-screen rules');
  assert.match(narrowHelp, /\.help-sections th,\s*\.help-sections td\s*\{\s*padding:\s*8px 8px;\s*\}/,
    'Narrow Help table reduces horizontal padding without hiding instructional content');
  assert.deepEqual(DefaultScoring.ED, { matchCost: 0, subCost: 1, indelCost: 1 });
  get('algo-select').value = 'ED'; get('algo-select').dispatch('change');
  assert.deepEqual(JSON.parse(JSON.stringify(state.scoring)), { matchCost: 0, subCost: 1, indelCost: 1 });
  get('matchScore').value = '2'; get('mismatchScore').value = '3'; get('gapScore').value = '4';
  get('calculateButton').click();
  assert.deepEqual(JSON.parse(JSON.stringify(state.scoring)), { matchCost: 2, subCost: 3, indelCost: 4 }, 'ED fields map to engine costs');
  console.log('[PASS] Help open/return, preserved results/tab/input, focus, shortcuts, autorun and engine example');
} finally {
  globalThis.setInterval = originalSet; globalThis.clearInterval = originalClear;
}
