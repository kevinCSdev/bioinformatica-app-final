import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ProteinCatalog } from '../js/ui/ProteinCatalog.js';
import { AMINO_ACIDS } from '../js/core/AminoAcids.js';

// Doble mínimo de los elementos usados; no simula layout ni teclado del navegador.
class Element extends EventTarget {
  constructor(tagName = 'div') {
    super();
    this.tagName = tagName;
    this.children = [];
    this.value = '';
    this.textContent = '';
    this.open = false;
    this.ownerDocument = { createElement: tag => new Element(tag) };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  focus() { focused = this; }
  showModal() { this.open = true; modalCalls++; }
  close() { this.open = false; this.dispatchEvent(new Event('close')); }
}
let focused;
let modalCalls = 0;
const opener = new Element('button');
const dialog = new Element('dialog');
const search = new Element('input');
const closeButton = new Element('button');
const results = new Element('ul');
const status = new Element('p');
const empty = new Element('p');
new ProteinCatalog({ opener, dialog, search, closeButton, results, status, empty });
const click = element => element.dispatchEvent(new Event('click'));
const query = value => { search.value = value; search.dispatchEvent(new Event('input')); };

click(opener);
assert.equal(modalCalls, 1, 'Opening must use showModal');
assert.equal(focused, search, 'Search receives initial focus');
assert.equal(results.children.length, 20);
assert.equal(status.textContent, '20 de 20 aminoácidos');
assert.equal(empty.hidden, true);
assert.deepEqual(results.children.map(card => card.children.map(field => field.textContent)),
  AMINO_ACIDS.map(entry => [entry.letter, entry.code3, entry.name, entry.category]));
for (const [text, count] of [[' TRP ', 1], ['ACIDO', 2], ['aromático', 3], ['W', 1]]) {
  query(text);
  assert.equal(results.children.length, count, text);
  assert.equal(status.textContent, `${count} de 20 aminoácidos`);
}
query('<img src=x onerror=alert(1)>');
assert.equal(results.children.length, 0);
assert.equal(empty.hidden, false);
assert.equal(status.textContent, '0 de 20 aminoácidos');
click(closeButton);
assert.equal(dialog.open, false);
assert.equal(focused, opener, 'Explicit close restores focus');
click(opener);
assert.equal(search.value, '', 'Reopening clears the query');
assert.equal(results.children.length, 20);
// El navegador convierte Escape en cancel/close; comprobamos la restauración en close.
dialog.close();
assert.equal(focused, opener, 'Native close (including Escape) restores focus');

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
assert.match(html, /<dialog[^>]*id="protein-catalog-dialog"[^>]*aria-labelledby="protein-catalog-title"/);
assert.match(html, /<label for="protein-catalog-search">/);
assert.match(html, /id="protein-catalog-status" role="status" aria-live="polite"/);
assert.match(html, /aria-haspopup="dialog" aria-controls="protein-catalog-dialog"/);
assert.ok(!html.includes('active-algo-badge') && !main.includes('activeAlgoBadge'));
assert.ok(main.includes('algoDisplayNames[appState.algorithm]'), 'PNG keeps algorithm names');
assert.match(main, /if \(catalogDialog.open\) return;/, 'Modal blocks alignment shortcuts');
assert.ok(html.includes('id="algo-select"') && html.includes('id="playback-status"'));
console.log('Protein catalog UI: rendering, filtering, empty state, reopen and focus passed.');
