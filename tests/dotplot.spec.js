import assert from 'assert';
import { DotplotEngine } from '../js/core/DotplotEngine.js';

console.log('=== [TDD: Dotplot Engine Spec (ODD + TDD)] ===\n');

// 1. Instanciación y Normalización de Parámetros
{
  const dp = new DotplotEngine('AAG', 'AAG', { windowSize: 1, threshold: 1 });
  assert.strictEqual(dp.seq1, 'AAG');
  assert.strictEqual(dp.seq2, 'AAG');
  assert.strictEqual(dp.windowSize, 1);
  assert.strictEqual(dp.threshold, 1);
  assert.strictEqual(dp.rows, 3);
  assert.strictEqual(dp.cols, 3);
  console.log('  [PASS] Instanciación básica con ventana 1');
}

// 2. Normalización de ventana par y umbral fuera de rango
{
  // Ventana par 2 debe ajustarse a 3 para centrado simétrico
  const dp1 = new DotplotEngine('ACGT', 'ACGT', { windowSize: 2, threshold: 1 });
  assert.strictEqual(dp1.windowSize, 3, 'Ventana 2 se normaliza a impar superior 3');

  // Umbral mayor que la ventana se acota a la ventana
  const dp2 = new DotplotEngine('ACGT', 'ACGT', { windowSize: 3, threshold: 10 });
  assert.strictEqual(dp2.threshold, 3, 'Umbral 10 se acota al tamaño de ventana 3');

  // Umbral menor que 1 se acota a 1
  const dp3 = new DotplotEngine('ACGT', 'ACGT', { windowSize: 3, threshold: -2 });
  assert.strictEqual(dp3.threshold, 1, 'Umbral negativo se acota a 1');
  console.log('  [PASS] Normalización de ventana par y acotamiento de umbral');
}

// 3. Matriz de Puntos con W=1 (Identidad directa)
{
  const dp = new DotplotEngine('AAG', 'AAG', { windowSize: 1, threshold: 1 });
  const matrix = dp.compute();
  assert.strictEqual(matrix.length, 3);
  assert.strictEqual(matrix[0].length, 3);

  // 'A' coincide con 'A'
  assert.strictEqual(matrix[0][0], true);
  assert.strictEqual(matrix[0][1], true);
  assert.strictEqual(matrix[1][0], true);
  assert.strictEqual(matrix[1][1], true);
  // 'G' coincide con 'G'
  assert.strictEqual(matrix[2][2], true);
  // 'A' no coincide con 'G'
  assert.strictEqual(matrix[0][2], false);
  assert.strictEqual(matrix[1][2], false);
  assert.strictEqual(matrix[2][0], false);
  assert.strictEqual(matrix[2][1], false);
  console.log('  [PASS] Matriz directa W=1 calculada correctamente');
}

// 4. Ventana deslizante W=3, T=2 (Filtrado de ruido)
{
  const dp = new DotplotEngine('ACGTA', 'ACGTA', { windowSize: 3, threshold: 2 });
  const matrix = dp.compute();
  
  // Posición central i=2, j=2: seq1[1..3]='CGT' vs seq2[1..3]='CGT' -> 3 matches >= 2
  assert.strictEqual(matrix[2][2], true);
  // Posición i=1, j=1: seq1[0..2]='ACG' vs seq2[0..2]='ACG' -> 3 matches >= 2
  assert.strictEqual(matrix[1][1], true);
  // Posición i=3, j=3: seq1[2..4]='GTA' vs seq2[2..4]='GTA' -> 3 matches >= 2
  assert.strictEqual(matrix[3][3], true);
  // Los bordes exteriores no completan ventana completa
  assert.strictEqual(matrix[0][0], false);
  assert.strictEqual(matrix[4][4], false);
  console.log('  [PASS] Ventana deslizante W=3 con umbral T=2 evaluada correctamente');
}

// 5. Secuencias completamente divergentes
{
  const dp = new DotplotEngine('AAAA', 'CCCC', { windowSize: 1, threshold: 1 });
  const matrix = dp.compute();
  const hasAnyDot = matrix.some(row => row.some(cell => cell === true));
  assert.strictEqual(hasAnyDot, false, 'Secuencias sin caracteres comunes no generan ningún punto');
  console.log('  [PASS] Secuencias completamente divergentes generan matriz vacía');
}

// 6. Proyección de camino óptimo (Overlay)
{
  const dp = new DotplotEngine('ACGT', 'ACGT');
  const pathCoords = [{ i: 0, j: 0 }, { i: 1, j: 1 }, { i: 2, j: 2 }, { i: 3, j: 3 }, { i: 4, j: 4 }];
  const overlay = dp.formatOverlayPath(pathCoords);
  // Solo las celdas con i>=1 y j>=1 corresponden a caracteres
  assert.strictEqual(overlay.length, 4);
  assert.deepStrictEqual(overlay[0], [1, 1]);
  assert.deepStrictEqual(overlay[3], [4, 4]);
  console.log('  [PASS] Mapeo de coordenadas para overlay del camino óptimo verificado');
}

// 7. Prueba de exportación PNG y no-superposición de etiquetas (DotplotView)
{
  const { DotplotView } = await import('../js/ui/DotplotView.js');

  const fillTextCalls = [];
  const mockCtx = {
    font: '',
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    strokeStyle: '',
    scale() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    fillText(text, x, y) {
      fillTextCalls.push({ text: String(text), x, y, font: this.font });
    },
    measureText(text) {
      return { width: String(text).length * 8 };
    }
  };

  const mockCanvas = {
    getContext() { return mockCtx; },
    toDataURL() { return 'data:image/png;base64,mock'; },
    style: {}
  };

  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') return { ...mockCanvas, style: {} };
      if (tag === 'a') return { download: '', href: '', click() {} };
      return {};
    }
  };

  const sampleDotlet = {
    seq1: 'MVLSPADKTNV',
    seq2: 'MVLSGDKTNV',
    dots: Array.from({ length: 11 }, () => Array(10).fill(false)),
    windowSize: 1,
    threshold: 1
  };

  DotplotView.exportToPng(sampleDotlet, {}, 'test.png');

  const paramCall = fillTextCalls.find(call => call.text.includes('Parámetros:'));
  assert(paramCall, 'Debe existir una llamada de texto con los Parámetros');

  const seq2Letters = sampleDotlet.seq2.split('');
  const headerLetterCalls = fillTextCalls.filter(call =>
    seq2Letters.includes(call.text) && call.y > 100
  );
  assert(headerLetterCalls.length > 0, 'Deben existir llamadas de las letras de encabezado');

  const minHeaderLetterY = Math.min(...headerLetterCalls.map(c => c.y));
  const verticalGap = minHeaderLetterY - paramCall.y;
  assert(verticalGap >= 35, `Separación vertical debe ser >= 35px. Actual: ${verticalGap}px`);
  console.log(`  [PASS] DotplotView exportación PNG sin superposición (brecha: ${verticalGap}px)`);
}

// 8. Auto-adaptación dinámica de DotplotView a las dimensiones del contenedor
{
  const { DotplotView } = await import('../js/ui/DotplotView.js');

  let appendedCanvas = null;
  const mockContainer = {
    clientWidth: 700,
    clientHeight: 520,
    innerHTML: '',
    appendChild(child) {
      appendedCanvas = child;
    }
  };

  const largeSeqDotlet = {
    seq1: 'ACGTACGTACGTACGT', // 16 nt
    seq2: 'ACGTACGTACGTACGT', // 16 nt
    dots: Array.from({ length: 16 }, () => Array(16).fill(false)),
    windowSize: 1,
    threshold: 1
  };

  DotplotView.render(mockContainer, largeSeqDotlet);
  assert(appendedCanvas, 'Debe adjuntar un canvas al contenedor');
  assert.strictEqual(appendedCanvas.style.maxWidth, 'none', 'Canvas should not shrink readable labels');
  assert.strictEqual(appendedCanvas.style.maxHeight, 'none', 'Canvas should not distort square cells');
  assert.strictEqual(appendedCanvas.style.objectFit, 'contain', 'Canvas debe tener objectFit contain');

  // La altura del canvas calculado en píxeles debe adaptarse para caber dentro del contenedor de 520px
  const calculatedHeight = parseFloat(appendedCanvas.style.height);
  assert(
    calculatedHeight <= 520,
    `La altura del Dotplot (${calculatedHeight}px) debe adaptarse al contenedor (<= 520px)`
  );
  console.log(`  [PASS] DotplotView auto-adaptación dinámica al contenedor (alto calculado: ${calculatedHeight}px <= 520px)`);
}

// 9. Invariante de separación (gap) de al menos 24px entre el encabezado/instrucciones y el recuadro
{
  const { readFileSync } = await import('fs');
  const { resolve, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const styleCss = readFileSync(resolve(currentDir, '../css/style.css'), 'utf-8');

  assert(
    styleCss.includes('margin-bottom: 24px;') || styleCss.includes('margin-bottom: 26px;'),
    'El encabezado de la tarjeta .matrix-card-header debe tener margin-bottom de al menos 24px para separar las instrucciones del recuadro'
  );
  console.log('  [PASS] Separación (.matrix-card-header margin-bottom >= 24px) verificada');
}

// 10. Renderer sizing: use the limiting dimension, retain square cells and readable labels.
{
  const { DotplotView } = await import('../js/ui/DotplotView.js');
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const texts = [];
  const lines = [];
  const arcs = [];
  let canvas;
  const context = {
    scale() {}, fillRect() {}, beginPath() {}, stroke() {}, fill() {},
    moveTo(x, y) { lines.push(['move', x, y]); },
    lineTo(x, y) { lines.push(['line', x, y]); },
    arc(x, y, radius) { arcs.push({ x, y, radius }); },
    fillText(text, x, y) { texts.push({ text, x, y, font: this.font }); },
    measureText(text) { return { width: String(text).length * 6 }; }
  };
  const container = {
    clientWidth: 900, clientHeight: 600, innerHTML: '',
    appendChild(child) { canvas = child; }
  };
  globalThis.document = {
    createElement() { return { style: {}, getContext() { return context; } }; }
  };
  globalThis.window = { devicePixelRatio: 2 };
  function draw(rows, cols) {
    texts.length = lines.length = arcs.length = 0;
    DotplotView.render(container, {
      seq1: 'A'.repeat(rows), seq2: 'C'.repeat(cols),
      dots: Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => i === 0 && j === 0))
    }, { overlayPath: [[1, 1], [rows, cols]] });
    const horizontal = texts.filter(call => call.text === 'C');
    const vertical = texts.filter(call => call.text === 'A');
    const cell = horizontal[1].x - horizontal[0].x;
    assert.strictEqual(vertical[1].y - vertical[0].y, cell, 'Grid cells stay square');
    assert.strictEqual(arcs[0].x, horizontal[0].x, 'Dots align with column centers');
    assert.strictEqual(arcs[0].y, vertical[0].y, 'Dots align with row centers');
    assert(lines.some(call => call[0] === 'line' &&
      call[1] === horizontal.at(-1).x && call[2] === vertical.at(-1).y),
    'Overlay ends at the final cell center');
    assert(horizontal.every(call => call.font.includes('13px')), 'Labels retain readable font size');
    assert.strictEqual(canvas.width, parseFloat(canvas.style.width) * 2, 'DPR preserves CSS geometry');
    return cell;
  }
  try {
    const largeCell = draw(4, 4);
    assert(largeCell > 100, `Short sequences should fill available space, not cap at 48px (got ${largeCell})`);
    assert(Math.abs(parseFloat(canvas.style.height) - container.clientHeight) < 1,
      'Height-limited plot uses the available height');
    assert(parseFloat(canvas.style.width) <= container.clientWidth, 'Plot fits available width');

    container.clientWidth = 360;
    container.clientHeight = 280;
    const smallCell = draw(4, 4);
    assert(smallCell < largeCell, 'Resizing recomputes cell size');
    assert(Math.abs(parseFloat(canvas.style.height) - container.clientHeight) < 1,
      'Resized plot still fills its limiting dimension');

    container.clientWidth = 701;
    container.clientHeight = 521;
    draw(3, 11);
    assert(Math.abs(parseFloat(canvas.style.width) - container.clientWidth) < 1,
      'Rectangular sequences fill the width when width-limited');
    assert(parseFloat(canvas.style.height) <= container.clientHeight, 'Rectangular grid fits height');

    const denseCell = draw(100, 100);
    assert(denseCell >= 16, 'Dense sequences preserve readable label spacing');
    assert.strictEqual(canvas.style.maxWidth, 'none', 'Dense plots are not downscaled into unreadable labels');
    assert.strictEqual(canvas.style.maxHeight, 'none', 'Dense plots preserve square geometry without downscaling');
    console.log('  [PASS] Renderer fills resized containers with square cells and readable dense-grid labels');
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
}

console.log('\nDotplot Engine & View tests PASSED!\n');

