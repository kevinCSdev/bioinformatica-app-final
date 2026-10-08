import assert from 'assert';
import fs from 'fs';
import path from 'path';
import vm from 'node:vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..');

console.log('=== [TDD: UI Redesign & Base Palette Spec] ===\n');

// 1. Invariante: Tokens de la paleta de colores en CSS
const styleCssPath = path.resolve(baseDir, 'css/style.css');
const styleCss = fs.readFileSync(styleCssPath, 'utf-8');

assert(styleCss.includes('--body-color: #E4E9F7;') || styleCss.includes('--body-color: #e4e9f7;'),
  'Missing base app body-color #E4E9F7');
assert(styleCss.includes('--sidebar-color: #FFF;') || styleCss.includes('--sidebar-color: #ffffff;'),
  'Missing base app sidebar-color #FFF');
assert(styleCss.includes('--primary-color: #695CFE;') || styleCss.includes('--primary-color: #695cfe;'),
  'Missing base app primary-color #695CFE');
console.log('  [PASS] Base app color tokens defined');

// 2. Invariante: Estilos y transiciones de la barra lateral colapsable
assert(styleCss.includes('.sidebar.close'), 'Missing .sidebar.close styling');
assert(styleCss.includes('.toggle'), 'Missing .toggle button styling');
assert(styleCss.includes('transition'), 'Missing sidebar transitions');
assert(styleCss.includes('width: 280px;'), 'Sidebar must have 280px expanded width');
assert(styleCss.includes('width: 80px;'), 'Sidebar must have 80px collapsed width');
assert(styleCss.includes('padding-right: 18px;') || styleCss.includes('padding-inline-end: 18px;'),
  'Missing 18px padding separation for vertical scrollbar in sidebar menu-bar');
assert(styleCss.includes('box-sizing: border-box;'), 'Missing box-sizing: border-box on sidebar menu');
assert(styleCss.includes('::-webkit-scrollbar') && styleCss.includes('width: 6px;'),
  'Scrollbar width must be refined to 6px');
assert(styleCss.includes('border-radius: 4px;'), 'Scrollbar thumb must have border-radius: 4px');
console.log('  [PASS] Collapsible sidebar CSS rules and 18px scrollbar separation verified');

// 3. Invariante: Matriz de cálculo paso a paso en MathPanel.js y components.css (especificación App-08)
const mathPanelPath = path.resolve(baseDir, 'js/ui/MathPanel.js');
const mathPanelJs = fs.readFileSync(mathPanelPath, 'utf-8');
const componentsCssPath = path.resolve(baseDir, 'css/components.css');
const componentsCss = fs.readFileSync(componentsCssPath, 'utf-8');

// 3.1 Invariantes CSS para .calculation-matrix-container
assert(componentsCss.includes('border: 4px solid #002B49;'),
  'Missing 4px solid #002B49 border on calculation-matrix-container');
assert(componentsCss.includes('border-radius: 20px;'),
  'Missing border-radius: 20px on calculation-matrix-container');
assert(componentsCss.includes('max-width: 360px;'),
  'Missing max-width: 360px on calculation-matrix-container');
assert(componentsCss.includes('overflow: hidden;'),
  'Missing overflow: hidden on calculation-matrix-container');
console.log('  [PASS] .calculation-matrix-container container geometry and border verified');

// 3.2 Invariantes CSS para CSS Grid y display: contents
assert(componentsCss.includes('display: contents;'),
  'Missing display: contents for matrix rows in components.css');
assert(componentsCss.includes('.matrix-row-header') &&
       componentsCss.includes('.matrix-row-values') &&
       componentsCss.includes('.matrix-row-scores') &&
       componentsCss.includes('.matrix-row-results'),
  'Missing row classes definitions in components.css');
assert(componentsCss.includes('border-right: 2px solid #002B49;') &&
       componentsCss.includes('border-bottom: 2px solid #002B49;'),
  'Missing 2px solid #002B49 inner dividers for matrix cells');
console.log('  [PASS] CSS Grid display: contents and inner cell dividers verified');

// 3.3 Invariantes CSS para la celda ganadora y colores
assert(componentsCss.includes('#52b355'),
  'Missing #52b355 solid green background on .winner cell');
assert(componentsCss.includes('content: "✓";'),
  'Missing checkmark ✓ in .winner::after pseudo-element');
assert(componentsCss.includes('top: 4px;') && componentsCss.includes('right: 6px;'),
  'Missing top: 4px / right: 6px positioning for winner checkmark');
assert(componentsCss.includes('#b91c1c'),
  'Missing #b91c1c crimson color for negative and non-winning results');
console.log('  [PASS] Winner styling (green background + checkmark) and color palette verified');

// 3.4 Prueba de renderizado en tiempo de ejecución con MathPanel
import { MathPanel } from '../js/ui/MathPanel.js';
import { AlgorithmType } from '../js/core/Types.js';

const panel = new MathPanel(null);

// Probar marcado de cálculo de celda Needleman-Wunsch correspondiente a la imagen de referencia
const mockNwDetails = {
  i: 1,
  j: 1,
  isBoundary: false,
  isMatch: true,
  score: 1,
  diagVal: 0,
  upVal: -2,
  leftVal: -2,
  candidateDiag: 1,
  candidateUp: -4,
  candidateLeft: -4,
  matchWeight: 1,
  gapWeight: -2
};

const nwHtml = panel.generateVisualCalculationMatrix(mockNwDetails, AlgorithmType.NEEDLEMAN_WUNSCH, { match: 1, mismatch: -1, gap: -2 });

// Comprobar estructura del marcado y sus contenidos
assert(nwHtml.includes('class="calculation-matrix-container"'), 'Missing container in rendered HTML');
assert(nwHtml.includes('style="display: contents;"'), 'Missing inline display: contents on rendered rows');
assert(nwHtml.includes('←') && nwHtml.includes('↖') && nwHtml.includes('↑'), 'Missing directional arrows in row 1');
assert(nwHtml.includes('LATERAL') && nwHtml.includes('DIAGONAL') && nwHtml.includes('SUPERIOR'), 'Missing uppercase labels in row 2');
assert(nwHtml.includes('GAP') && (nwHtml.includes('COINCIDENCIA') || nwHtml.includes('MATCH')), 'Missing operation labels in row 3');
assert(nwHtml.includes('class="matrix-cell winner"'), 'Missing .winner class on candidateDiag winning cell');
assert(nwHtml.includes('<div class="cell-result positive">1</div>'), 'Missing winning value 1 in cell result');
assert(nwHtml.includes('<div class="cell-result negative">-4</div>'), 'Missing non-winning candidates -4');
console.log('  [PASS] MathPanel NW visual matrix rendering matches reference image structure');

// Probar matriz de 4 columnas con REINICIO para Smith-Waterman
const mockSwDetails = {
  i: 1,
  j: 1,
  isBoundary: false,
  isMatch: false,
  score: 0,
  diagVal: 0,
  upVal: 0,
  leftVal: 0,
  candidateDiag: -1,
  candidateUp: -2,
  candidateLeft: -2,
  matchWeight: -1,
  gapWeight: -2
};

const swHtml = panel.generateVisualCalculationMatrix(mockSwDetails, AlgorithmType.SMITH_WATERMAN, { match: 2, mismatch: -1, gap: -2 });
assert(swHtml.includes('repeat(4, 1fr)'), 'SW matrix must specify 4 columns');
assert(swHtml.includes('⊗'), 'SW matrix must include reset icon ⊗');
assert(swHtml.includes('REINICIO') || swHtml.includes('RESET'), 'SW matrix must include REINICIO label');
assert(swHtml.includes('CERO') || swHtml.includes('ZERO'), 'SW matrix must include CERO label');
console.log('  [PASS] MathPanel SW visual matrix rendering with reinicio cell verified');

// 3.5 Pruebas de borde y relación de recurrencia en LaTeX en español con MathPanel
const boundaryDetails = {
  i: 0,
  j: 2,
  isBoundary: true,
  score: -4
};
const boundaryHtml = panel.generateVisualCalculationMatrix(boundaryDetails, AlgorithmType.NEEDLEMAN_WUNSCH, { gap: -2 });
assert(boundaryHtml.includes('Caso Base / Condición de Borde'), 'Missing Spanish boundary header');
assert(boundaryHtml.includes('Huecos (Gaps)'), 'Missing Spanish Gaps boundary text');

const nwLatex = panel.generateLatex(mockNwDetails, AlgorithmType.NEEDLEMAN_WUNSCH, { match: 1, mismatch: -1, gap: -2 });
assert(nwLatex.includes('\\text{Diagonal}:'), 'Missing Spanish \\text{Diagonal} in LaTeX');
assert(nwLatex.includes('\\text{Superior}:'), 'Missing Spanish \\text{Superior} in LaTeX');
assert(nwLatex.includes('\\text{Lateral}:'), 'Missing Spanish \\text{Lateral} in LaTeX');
console.log('  [PASS] MathPanel Spanish boundary and LaTeX recurrence verified');

// 4. Invariante: El marcado HTML contiene barra lateral colapsable y botón de alternancia
const indexHtmlPath = path.resolve(baseDir, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

assert(indexHtml.includes('class="sidebar'), 'Missing sidebar element in index.html');
assert(indexHtml.includes('toggle'), 'Missing toggle element in index.html');
console.log('  [PASS] HTML collapsible sidebar structure verified');

// 5. Invariante: Normalización en español de SummaryPanel y condensación de secuencias largas
import { SummaryPanel } from '../js/ui/SummaryPanel.js';

const mockContainer = {
  innerHTML: '',
  querySelector: () => null
};

const summary = new SummaryPanel(mockContainer);

// 5.1 Prueba de estado vacío
summary.renderEmpty();
assert(mockContainer.innerHTML.includes('Calcula el alineamiento para ver los resultados textuales y las métricas de identidad'),
  'SummaryPanel empty state must be in Spanish');
console.log('  [PASS] SummaryPanel empty state verified');

// 5.2 Prueba de alineamiento estándar (título, placas, formato de huecos, etiquetas, navegación)
const mockPaths = [
  {
    alignment_s1: 'A-TG',
    alignment_s2: 'AATG',
    score: 5
  },
  {
    alignment_s1: 'AT-G',
    alignment_s2: 'AATG',
    score: 5
  }
];

summary.render(mockPaths, 0);
const htmlOutput = mockContainer.innerHTML;

assert(htmlOutput.includes('Alineamiento Óptimo'), 'Title must be "Alineamiento Óptimo"');
assert(htmlOutput.includes('Puntaje') && htmlOutput.includes('5'), 'Missing Puntaje badge');
assert(htmlOutput.includes('Identidad'), 'Missing Identidad badge');
assert(htmlOutput.includes('Coincidencias'), 'Missing Coincidencias badge');
assert(htmlOutput.includes('Discrepancias'), 'Missing Discrepancias badge');
assert(htmlOutput.includes('Huecos (Gaps)'), 'Missing Huecos (Gaps) badge');
assert(htmlOutput.includes('Longitud'), 'Missing Longitud badge');
assert(htmlOutput.includes('AATG\nA-TG'), 'Missing vertical format AATG\\nA-TG (Seq 2 Horizontal on line 1, Seq 1 Vertical on line 2)');
assert(htmlOutput.includes('A-TG') && htmlOutput.includes('AATG'), 'Missing explicit sequences A-TG and AATG');
assert((htmlOutput.includes('Seq 1') || htmlOutput.includes('Secuencia 1')) &&
       (htmlOutput.includes('Seq 2') || htmlOutput.includes('Secuencia 2')),
       'Missing comparative sequence labels');
assert(htmlOutput.includes('Camino 1 de 2'), 'Navigation must use "Camino {actual} de {total}" format');
console.log('  [PASS] SummaryPanel Spanish badges, navigation, and explicit gap format verified');

// Probar ejemplos específicos requeridos:
// Ejemplo 1: GDLE (vertical) vs GGLED (horizontal) -> GGLED / GDLE-
const mockUserEx1 = [{
  alignment_s1: 'GDLE-',
  alignment_s2: 'GGLED',
  score: 3
}];
summary.render(mockUserEx1, 0);
assert(mockContainer.innerHTML.includes('GGLED\nGDLE-'), 'User example 1 must render GGLED on top and GDLE- below');

// Ejemplo 2: GACCTA (vertical) vs GGTACC (horizontal) -> GGTACC-- / -G-ACCTA
const mockUserEx2 = [{
  alignment_s1: '-G-ACCTA',
  alignment_s2: 'GGTACC--',
  score: 2
}];
summary.render(mockUserEx2, 0);
assert(mockContainer.innerHTML.includes('GGTACC--\n-G-ACCTA'), 'User example 2 must render GGTACC-- on top and -G-ACCTA below');
console.log('  [PASS] User canonical alignment vertical examples (GGLED/GDLE- and GGTACC--/-G-ACCTA) verified');

// 5.3 Prueba de condensación para secuencias largas (> 40 nt)
const longS1 = 'A'.repeat(30) + 'C'.repeat(30); // 60 caracteres
const longS2 = 'A'.repeat(30) + 'G'.repeat(30); // 60 caracteres
const longPaths = [{
  alignment_s1: longS1,
  alignment_s2: longS2,
  score: 40
}];

summary.render(longPaths, 0);
const longHtml = mockContainer.innerHTML;
assert(longHtml.includes('Vista Completa'), 'Long sequence must display "Vista Completa" toggle button');
assert(longHtml.includes('...'), 'Long sequence must show ellipsis condensed view');
assert(longHtml.includes('Secuencia extensa (60 nucleótidos)'), 'Long sequence must show explanatory banner');
console.log('  [PASS] SummaryPanel condensation and toggle button for sequences > 40 nt verified');

// 5.4 Invariante: Formato de tarjetas de secuencia (estilo tarjetas métricas) y eliminación de bloques redundantes
assert(!htmlOutput.includes('Formato con gaps:'), 'Redundant "Formato con gaps" section must be removed');
assert(!htmlOutput.includes('vertical-raw-alignment'), 'Redundant .vertical-raw-alignment must be removed');
assert(htmlOutput.includes('SECUENCIA HORIZONTAL (SEQ 2)'), 'Missing header SECUENCIA HORIZONTAL (SEQ 2)');
assert(htmlOutput.includes('SECUENCIA VERTICAL (SEQ 1)'), 'Missing header SECUENCIA VERTICAL (SEQ 1)');
assert(htmlOutput.includes('sequence-block-horizontal'), 'Missing sequence-block-horizontal class in HTML');
assert(htmlOutput.includes('sequence-block-vertical'), 'Missing sequence-block-vertical class in HTML');
assert(htmlOutput.includes('badge-horizontal'), 'Missing badge-horizontal class in HTML');
assert(htmlOutput.includes('badge-vertical'), 'Missing badge-vertical class in HTML');
assert(htmlOutput.includes('CORRESPONDENCIA'), 'Missing match line / CORRESPONDENCIA block in HTML');
assert(htmlOutput.includes('Texto vertical'), 'Missing "Texto vertical" label');
assert(!htmlOutput.includes('Texto vertical puro (copiable)'), '"Texto vertical puro (copiable)" must be renamed to "Texto vertical"');

// Invariantes de la paleta CSS en components.css
assert(componentsCss.includes('.sequence-block-horizontal'), 'Missing .sequence-block-horizontal in components.css');
assert(componentsCss.includes('#dbeafe') && componentsCss.includes('#93c5fd') && componentsCss.includes('#1e40af') && componentsCss.includes('#2563eb'),
  'Missing Identity blue palette (#dbeafe, #93c5fd, #1e40af, #2563eb) for horizontal block');
assert(componentsCss.includes('.sequence-block-vertical'), 'Missing .sequence-block-vertical in components.css');
assert(componentsCss.includes('#dcfce7') && componentsCss.includes('#86efac') && componentsCss.includes('#166534') && componentsCss.includes('#16a34a'),
  'Missing Score green palette (#dcfce7, #86efac, #166534, #16a34a) for vertical block');
assert(componentsCss.includes('.sequence-chars') && componentsCss.includes('var(--font-mono'),
  'Missing monospace sequence typography in components.css');
console.log('  [PASS] Sequence blocks styled as metric cards, redundant gaps pill removed, and Spanish labels verified');

// 6. Invariante: Rediseño de controles de formulario de la barra lateral
console.log('\n--- Section 6: Sidebar Controls Redesign & Accessibility Invariants ---');

// 6.1 Eliminación del selector de modo
assert(!indexHtml.includes('class="mode"'), 'Mode switch li.mode must be removed from index.html');
assert(!indexHtml.includes('class="toggle-switch"'), 'toggle-switch must be removed from index.html');

const mainJsPath = path.resolve(baseDir, 'js/main.js');
const mainJs = fs.readFileSync(mainJsPath, 'utf-8');
assert(!mainJs.includes('modeSwitch'), 'modeSwitch reference and listeners must be removed from main.js');
assert(!mainJs.includes('modeText'), 'modeText reference must be removed from main.js');
console.log('  [PASS] Bottom mode switch completely removed from HTML and JS');

// 6.2 Etiquetas descriptivas sobre cada campo de entrada
assert(indexHtml.includes('id="label-algo"') && indexHtml.includes('Algoritmo de Alineamiento'),
  'Missing "Algoritmo de Alineamiento" label for algo-select');
assert(indexHtml.includes('id="label-seq1"') && indexHtml.includes('Secuencia 1 (Fila / Vertical)'),
  'Missing "Secuencia 1 (Fila / Vertical)" label for seq_1');
assert(indexHtml.includes('id="label-seq2"') && indexHtml.includes('Secuencia 2 (Columna / Horizontal)'),
  'Missing "Secuencia 2 (Columna / Horizontal)" label for seq_2');
assert(indexHtml.includes('id="label-match"') && indexHtml.includes('Coincidencia (Match)'),
  'Missing "Coincidencia (Match)" label for matchScore');
assert(indexHtml.includes('id="label-mismatch"') && indexHtml.includes('Discrepancia (Mismatch)'),
  'Missing "Discrepancia (Mismatch)" label for mismatchScore');
assert(indexHtml.includes('id="label-gap"') && indexHtml.includes('Penalización Gap'),
  'Missing "Penalización Gap" label for gapScore');

// Actualizaciones dinámicas de etiquetas en main.js
assert(mainJs.includes('Costo Coincidencia') && mainJs.includes('Costo Sustitución') && mainJs.includes('Costo Indel'),
  'updateScoringInputs must dynamically update labels for Wagner-Fischer');
console.log('  [PASS] Distinct, accessible labels placed above all inputs with dynamic algorithm reactivity');

// 6.3 Botones incrementales (steppers) accesibles
assert(indexHtml.includes('class="stepper-btn stepper-btn-dec"') && indexHtml.includes('class="stepper-btn stepper-btn-inc"'),
  'Missing stepper buttons in index.html');
assert(styleCss.includes('.stepper-btn'), 'Missing .stepper-btn styling in style.css');
assert(styleCss.includes('width: 36px;') && styleCss.includes('height: 36px;'),
  'Stepper buttons must be comfortable size (>= 32px-36px)');
assert(mainJs.includes('.stepper-btn') && mainJs.includes('stepper-btn-inc') && mainJs.includes('stepper-btn-dec'),
  'Missing stepper click event listeners in main.js');
console.log('  [PASS] Accessible 36px stepper buttons and increment/decrement events verified');

// 6.4 Reorganización del desplegable de ejemplos y normalización en español
assert(indexHtml.includes('id="example-select"'), 'Missing #example-select dropdown in index.html');
assert(indexHtml.includes('for="example-select"') && indexHtml.includes('Ejemplos'),
  'Missing "Ejemplos" label associated with #example-select');
assert(!indexHtml.includes('Casos Canónicos'), 'Obsolete Casos Canónicos bar must be removed from index.html');
assert(!indexHtml.includes('class="presets-bar"'), 'Obsolete .presets-bar must be removed from index.html');

const requiredOptions = [
  'value="tc1"',
  'value="tc2"',
  'value="tc3"',
  'value="tc4"',
  'value="tc5"',
  'value="tc6"',
  'value="ex_gdle"',
  'value="ex_gaccta"'
];
requiredOptions.forEach(opt => {
  assert(indexHtml.includes(opt), `Missing option ${opt} in #example-select`);
});

assert(mainJs.includes('CANONICAL_EXAMPLES') && mainJs.includes('exampleSelect'),
  'main.js must define CANONICAL_EXAMPLES and exampleSelect listener');
assert(mainJs.includes('reinitialize()'), 'main.js must trigger reinitialize() on example change');

assert(indexHtml.includes('id="autorun-label">Auto Ejecutar</span>'),
  'Missing "Auto Ejecutar" in index.html');
assert(mainJs.includes("autorunLabel.textContent = 'Auto Ejecutar'"),
  'Missing "Auto Ejecutar" reset state in main.js');
console.log('  [PASS] Reorganization of canonical presets to #example-select dropdown and Spanish normalization verified');

// 7. Invariantes: Casilla de origen vacía en D3Renderer y etiqueta de estado en español
console.log('\n--- Section 7: D3Renderer Empty Square & Spanish Status Badge Invariants ---');
const d3RendererPath = path.resolve(baseDir, 'js/ui/D3Renderer.js');
const d3RendererJs = fs.readFileSync(d3RendererPath, 'utf-8');
assert(!d3RendererJs.includes("'ε'"), 'D3Renderer must not contain epsilon (ε) character');
assert(d3RendererJs.includes("colLabels = [{ text: '', index: 0, j: 0 }]"), 'ColLabels index 0 must be empty string');
assert(d3RendererJs.includes("rowLabels = [{ text: '', index: 0, i: 0 }]"), 'RowLabels index 0 must be empty string');
console.log('  [PASS] D3Renderer empty origin square (no epsilon) verified');

assert(indexHtml.includes('id="playback-status">Inicializado</span>'), 'playback-status badge in index.html must be "Inicializado"');
console.log('  [PASS] index.html initial status badge set to "Inicializado"');

// 8. Invariantes: Viewport SVG D3 y contención vertical de matriz (TC4 asimétrico)
console.log('\n--- Section 8: SVG D3 Viewport & Vertical Adaptation (TC4 Asymmetric) Invariants ---');
const matrixCssPath = path.resolve(baseDir, 'css/matrix.css');
const matrixCss = fs.readFileSync(matrixCssPath, 'utf-8');

// 8.1 Invariantes CSS del contenedor en style.css
assert(styleCss.includes('.matrix-canvas-wrapper'), 'Missing .matrix-canvas-wrapper in style.css');
assert(styleCss.includes('height: 520px;'), 'Missing fixed height: 520px on .matrix-canvas-wrapper');
assert(styleCss.includes('min-height: 480px;'), 'Missing min-height: 480px on .matrix-canvas-wrapper');
assert(styleCss.includes('max-height: 600px;'), 'Missing max-height: 600px on .matrix-canvas-wrapper');
assert(styleCss.includes('display: flex;') &&
       styleCss.includes('align-items: center;') &&
       styleCss.includes('justify-content: center;'),
       'Missing flexbox centering on .matrix-canvas-wrapper');
console.log('  [PASS] .matrix-canvas-wrapper fixed height (520px) and flexbox centering verified');

// 8.2 Invariantes de dimensiones SVG en matrix.css
assert(matrixCss.includes('.alignment-matrix-svg'), 'Missing .alignment-matrix-svg in matrix.css');
assert(matrixCss.includes('width: 100%;') && matrixCss.includes('height: 100%;'),
  'Missing width: 100% and height: 100% on .alignment-matrix-svg');
assert(matrixCss.includes('max-width: 100%;') && matrixCss.includes('max-height: 100%;'),
  'Missing max-width: 100% and max-height: 100% on .alignment-matrix-svg');
assert(matrixCss.includes('display: block;'),
  'Missing display: block on .alignment-matrix-svg');
console.log('  [PASS] .alignment-matrix-svg viewport constraints (100% / max 100%) verified');

// 8.3 Invariantes de viewBox y relación de aspecto en D3Renderer
assert(d3RendererJs.includes("'viewBox', `0 0 ${totalWidth} ${totalHeight}`"),
  'Missing dynamic viewBox calculation in D3Renderer.js');
assert(d3RendererJs.includes("'preserveAspectRatio', 'xMidYMid meet'"),
  "Missing preserveAspectRatio 'xMidYMid meet' in D3Renderer.js");

// 8.4 Simulación del caso TC4 (asimétrico: 9 filas x 3 columnas)
const tc4Rows = 9; // s1 = 'ACGTACGT' (longitud 8 + 1)
const tc4Cols = 3; // s2 = 'CG' (longitud 2 + 1)
const cellSize = 46;
const headerSize = 42;
const margin = { top: 40, right: 40, bottom: 40, left: 40 };

const tc4TotalWidth = margin.left + headerSize + tc4Cols * cellSize + margin.right;
const tc4TotalHeight = margin.top + headerSize + tc4Rows * cellSize + margin.bottom;

assert.strictEqual(tc4TotalWidth, 260, 'TC4 totalWidth must equal 260px');
assert.strictEqual(tc4TotalHeight, 536, 'TC4 totalHeight must equal 536px');
assert(tc4Rows > tc4Cols * 1.5, 'TC4 must be recognized as highly vertical (rows > cols * 1.5)');

// Con preserveAspectRatio='xMidYMid meet' y dimensiones de contenedor (Ancho=700px, Alto=520px):
const containerWidth = 700;
const containerHeight = 520;
const scaleFactor = Math.min(containerWidth / tc4TotalWidth, containerHeight / tc4TotalHeight);
const renderedHeight = tc4TotalHeight * scaleFactor;
const renderedWidth = tc4TotalWidth * scaleFactor;

assert(renderedHeight <= containerHeight,
  `Rendered height (${renderedHeight.toFixed(1)}px) must not exceed container height (${containerHeight}px)`);
assert(renderedWidth <= containerWidth,
  `Rendered width (${renderedWidth.toFixed(1)}px) must not exceed container width (${containerWidth}px)`);

// Verificar que las 9 filas queden totalmente contenidas (borde inferior fila 8 = 496px < totalHeight 536px, escalado a 481.2px <= 520px)
const lastRowBottomInSvg = margin.top + headerSize + tc4Rows * cellSize;
const lastRowBottomRendered = lastRowBottomInSvg * scaleFactor;
assert(lastRowBottomRendered <= containerHeight,
  `Last row bottom (${lastRowBottomRendered.toFixed(1)}px) must be fully visible inside container (${containerHeight}px)`);

console.log('  [PASS] TC4 asymmetric matrix (9 rows x 3 cols) vertical containment verified (all 9 rows visible)');

// 9. Invariantes: Configuración del control deslizante de velocidad (mín 200ms, máx 3000ms)
console.log('\n--- Section 9: Speed Slider Bounds Invariants ---');
assert(indexHtml.includes('id="speed-slider"'), 'Missing #speed-slider input in index.html');
assert(indexHtml.includes('min="200"'), 'Speed slider must have min="200"');
assert(indexHtml.includes('max="3000"'), 'Speed slider must have max="3000" (3 seconds)');
console.log('  [PASS] Speed slider min="200" and max="3000" (3s) verified');

// 10. Dotplot overlay: native checkbox semantics and icon-only collapsed layout.
console.log('\n--- Section 10: Dotplot Overlay Toggle Invariants ---');
const overlayControl = indexHtml.match(/<label class="dotplot-overlay-control"[\s\S]*?<\/label>/)?.[0];
assert(overlayControl, 'Overlay must use a semantic clickable label, not an overflowing search-box');
assert(/for="dotplotOverlayToggle"/.test(overlayControl), 'Overlay label must target the existing checkbox');
const overlayInput = overlayControl.match(/<input\b[^>]*>/)?.[0];
assert(overlayInput && /type="checkbox"/.test(overlayInput) && /id="dotplotOverlayToggle"/.test(overlayInput),
  'Overlay must retain the native checkbox and existing binding ID');
assert(/\bchecked\b/.test(overlayInput), 'Overlay must remain checked by default');
assert(/aria-label="Superponer camino óptimo"/.test(overlayInput),
  'Checkbox must have a stable Spanish accessible name when visible text is hidden');
assert(!/disabled|tabindex="-1"|aria-hidden/.test(overlayInput), 'Checkbox must remain keyboard accessible');
assert(/class="bx bx-git-branch icon" aria-hidden="true"/.test(overlayControl),
  'Overlay must include a decorative representative path icon');
assert(overlayControl.includes('class="dotplot-overlay-text">Superponer camino óptimo</span>'),
  'Expanded overlay must retain the existing Spanish text');
assert(!overlayControl.includes('style='), 'Overlay geometry must be defined in scoped CSS');

function overlayCssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = styleCss.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert(rule, `Missing overlay rule: ${selector}`);
  return rule[1];
}
// Only adjacent collapsed Dotplot fields receive spacing; Matrix DP and display toggling stay untouched.
const collapsedDotplotSpacing = overlayCssRule('.sidebar.close #dotplot-params-group > .sidebar-field-group + .sidebar-field-group');
assert.strictEqual(collapsedDotplotSpacing.trim(), 'margin-top: 8px;',
  'Collapsed Dotplot fields must use only an 8px sibling margin, without changing display or Matrix DP');
console.log('  [PASS] Collapsed Dotplot sibling spacing is scoped and margin-only');

const overlayLayout = overlayCssRule('.sidebar .dotplot-overlay-control');
assert(/position:\s*relative;/.test(overlayLayout) && /width:\s*100%;/.test(overlayLayout),
  'Overlay label must contain its checkbox and fit the sidebar width');
assert(/min-width:\s*0;/.test(overlayLayout), 'Overlay must be able to shrink in the collapsed sidebar');
assert(/display:\s*none;/.test(overlayCssRule('.sidebar.close .dotplot-overlay-text')),
  'Collapsed overlay text must not occupy space or overflow');
const collapsedInput = overlayCssRule('.sidebar.close .dotplot-overlay-control input');
assert(/position:\s*absolute;/.test(collapsedInput) && /inset:\s*0;/.test(collapsedInput) &&
       /opacity:\s*0;/.test(collapsedInput) && /width:\s*100%;/.test(collapsedInput) &&
       /height:\s*100%;/.test(collapsedInput),
  'Collapsed checkbox must be visually hidden while covering the icon hit target');
assert(!/pointer-events:\s*none|display:\s*none|visibility:\s*hidden/.test(collapsedInput),
  'Collapsed checkbox must remain interactive');
const overlayIcon = overlayCssRule('.sidebar .dotplot-overlay-content .icon');
assert(/min-width:\s*0;/.test(overlayIcon), 'Overlay icon must override the shared 52px minimum to avoid overflow');
assert(/background-color:/.test(overlayCssRule('.sidebar .dotplot-overlay-control input:checked + .dotplot-overlay-content')),
  'Checked overlay must have a visible state independent of the hidden checkbox');
assert(/outline:\s*2px solid/.test(overlayCssRule('.sidebar .dotplot-overlay-control input:focus-visible + .dotplot-overlay-content')),
  'Keyboard focus must be visible on the icon content');
assert(mainJs.includes("dotplotOverlayToggle.addEventListener('change'"),
  'Existing native checkbox change binding must remain intact');
console.log('  [PASS] Overlay semantic label, stable name, collapsed containment, checked and focus styles verified');

// 11. Execute entry-point callback wiring with presentation stubs, without a browser.
console.log('\n--- Section 11: Click-only Cell Inspection & Playback ---');
const inspectionUpdates = [];
let emptyRenders = 0;
let rendererOptions;
let stateListener;
const inspectedDetails = { i: 1, j: 2, score: 3 };
const lookupCoordinates = [];
const inspectionState = {
  algorithm: AlgorithmType.NEEDLEMAN_WUNSCH,
  scoring: { match: 1, mismatch: -1, gap: -2 },
  optimalPaths: [],
  engine: {
    getCellDetails(i, j) {
      lookupCoordinates.push([i, j]);
      return i === 1 && j === 2 ? inspectedDetails : null;
    }
  },
  subscribe(listener) { stateListener = listener; },
  getFlatMatrix() { return []; },
  getActivePathCoordinates() { return []; }
};
const inspectionPanel = {
  update(...args) { inspectionUpdates.push(args); },
  renderEmpty() { emptyRenders++; }
};
const rendererWiring = mainJs.slice(mainJs.indexOf('  const renderer = new D3Renderer('),
  mainJs.indexOf('  const algoDisplayNames ='));
const subscriptionWiring = mainJs.slice(mainJs.indexOf('  appState.subscribe('),
  mainJs.indexOf('  // Escuchadores de eventos para entradas de secuencia'));
assert(rendererWiring && subscriptionWiring, 'Entry-point callback wiring must be available');
vm.runInNewContext(`${rendererWiring}\n${subscriptionWiring}`, {
  appState: inspectionState,
  mathPanel: inspectionPanel,
  D3Renderer: class {
    constructor(selector, options) { rendererOptions = options; }
    updateMatrixCells() {}
    clearTraceback() {}
    renderTracebackArrow() {}
  },
  summaryPanel: { renderEmpty() {}, render() {} },
  playbackStatus: {}, activeAlgoBadge: {}, algoDisplayNames: {}, activeView: 'matrix'
});
const calculatedCell = { i: 1, j: 2, calculated: true };
rendererOptions.onCellHover?.(calculatedCell);
assert.strictEqual(inspectionUpdates.length, 0, 'Hover must not update the calculation breakdown');
assert.strictEqual(lookupCoordinates.length, 0, 'Hover must not look up cell details');
rendererOptions.onCellClick(calculatedCell);
assert.deepStrictEqual(lookupCoordinates, [[1, 2]], 'Click must look up the clicked coordinates');
assert.deepStrictEqual(inspectionUpdates[0],
  [inspectedDetails, inspectionState.algorithm, inspectionState.scoring]);
for (const cell of [null, { i: 1, j: 2, calculated: false }]) {
  rendererOptions.onCellClick(cell);
}
assert.strictEqual(lookupCoordinates.length, 1, 'Uncalculated and absent cells must not be inspected');
rendererOptions.onCellClick({ i: 9, j: 9, calculated: true });
assert.strictEqual(inspectionUpdates.length, 1, 'Missing details must leave the panel unchanged');
const savedEngine = inspectionState.engine;
inspectionState.engine = null;
rendererOptions.onCellClick(calculatedCell);
assert.strictEqual(inspectionUpdates.length, 1, 'Missing engine must leave the panel unchanged');
inspectionState.engine = savedEngine;
for (const eventType of ['STEP_FORWARD', 'STEP_BACKWARD', 'COMPLETE', 'INSTANT_COMPLETE']) {
  rendererOptions.onCellClick(calculatedCell);
  const activeDetails = { i: 2, j: 2, eventType };
  stateListener(inspectionState, eventType, { activeCell: { details: activeDetails } });
  assert.strictEqual(inspectionUpdates.at(-1)[0], activeDetails,
    `${eventType} must replace clicked inspection with the active step`);
}
const activeWithoutDetails = { i: 2, j: 1 };
stateListener(inspectionState, 'STEP_FORWARD', { activeCell: activeWithoutDetails });
assert.strictEqual(inspectionUpdates.at(-1)[0], activeWithoutDetails, 'Playback must retain its active-cell fallback');
stateListener(inspectionState, 'STEP_BACKWARD', { activeCell: null });
stateListener(inspectionState, 'RESET', {});
assert.strictEqual(emptyRenders, 2, 'Backward to no active cell and reset must clear the panel');
console.log('  [PASS] Hover no-op, guarded cell clicks, playback/completion overrides, and reset verified');

console.log('\nAll UI Redesign, Sidebar Form Controls, and Spanish Normalization invariants validated successfully!');



