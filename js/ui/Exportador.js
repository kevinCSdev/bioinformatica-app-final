/**
 * Exportación de resultados (aporte del grupo Cata-Anto, adaptado a la
 * arquitectura modular):
 * - CSV con parámetros, matriz de programación dinámica y todos los
 *   alineamientos óptimos con sus métricas.
 * - PNG de la matriz tal como se ve, incluido el camino de traceback.
 */

const NOMBRES_ALGORITMO = {
  NW: 'Needleman-Wunsch (global)',
  SW: 'Smith-Waterman (local)',
  ED: 'Wagner-Fischer (distancia de edición)',
  LCS: 'Subsecuencia común más larga (LCS)'
};

// Propiedades que el SVG toma de las hojas de estilo y que deben quedar
// en línea para que la imagen exportada se vea igual que en pantalla
const PROPIEDADES_SVG = [
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'font-family', 'font-size', 'font-weight', 'opacity'
];

function escaparCSV(valor) {
  const texto = String(valor ?? '');
  return /[",;\n]/.test(texto) ? '"' + texto.replace(/"/g, '""') + '"' : texto;
}

function nombreArchivo(state, extension) {
  const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `alineamiento_${state.algorithm}_${state.seq1}_${state.seq2}_${marca}.${extension}`;
}

function descargar(nombre, blob) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function metricas(camino) {
  const a = camino.alignment_s1 || '';
  const b = camino.alignment_s2 || '';
  let coincidencias = 0, discrepancias = 0, gaps = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '-' || b[k] === '-') gaps++;
    else if (a[k] === b[k]) coincidencias++;
    else discrepancias++;
  }
  const identidad = a.length ? ((coincidencias / a.length) * 100).toFixed(1) + '%' : '0.0%';
  return { coincidencias, discrepancias, gaps, identidad };
}

/**
 * Construye el CSV (separador ';' para que Excel en español lo abra en columnas)
 * @param {AppState} state
 * @param {string} descripcionPuntaje - texto con el tipo de puntuación usado
 */
export function construirCSV(state, descripcionPuntaje) {
  const { seq1, seq2, scoring } = state;
  const matriz = state.engine.getMatrix();
  const filas = [];

  filas.push(['Algoritmo', NOMBRES_ALGORITMO[state.algorithm] || state.algorithm]);
  filas.push(['Puntuación', descripcionPuntaje]);
  filas.push(['Secuencia 1 (filas)', seq1]);
  filas.push(['Secuencia 2 (columnas)', seq2]);
  for (const [clave, valor] of Object.entries(scoring)) {
    // El tipo de sustitución ya aparece en la fila "Puntuación"
    if (clave !== 'substitution') filas.push([`Parámetro ${clave}`, valor]);
  }
  filas.push([]);

  filas.push(['Matriz de programación dinámica']);
  filas.push(['', '-', ...seq2.split('')]);
  for (let i = 0; i <= seq1.length; i++) {
    const etiqueta = i === 0 ? '-' : seq1[i - 1];
    filas.push([etiqueta, ...matriz[i].map(v => (v === null ? '' : v))]);
  }

  if (state.optimalPaths.length > 0) {
    filas.push([]);
    filas.push(['Alineamientos óptimos']);
    filas.push(['#', 'Secuencia 1', 'Secuencia 2', 'Puntaje', 'Identidad', 'Coincidencias', 'Discrepancias', 'Gaps']);
    state.optimalPaths.forEach((camino, k) => {
      const m = metricas(camino);
      filas.push([k + 1, camino.alignment_s1, camino.alignment_s2, camino.score,
        m.identidad, m.coincidencias, m.discrepancias, m.gaps]);
    });
  } else {
    filas.push([]);
    filas.push(['Matriz incompleta: complete el cálculo para incluir el alineamiento.']);
  }

  return filas.map(f => f.map(escaparCSV).join(';')).join('\r\n');
}

export function exportarCSV(state, descripcionPuntaje) {
  // BOM para que Excel interprete correctamente los acentos
  const contenido = '﻿' + construirCSV(state, descripcionPuntaje);
  descargar(nombreArchivo(state, 'csv'), new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
}

/**
 * Rasteriza el SVG de la matriz a PNG al doble de resolución, sin librerías externas
 * @param {SVGSVGElement} svg
 * @param {AppState} state
 * @param {string} titulo - texto que se dibuja sobre la matriz
 */
export function exportarPNG(svg, state, titulo) {
  if (!svg) return;
  // El camino de traceback se dibuja con una transición de 300 ms; se espera a
  // que termine para no capturar la matriz a medio animar
  setTimeout(() => rasterizar(svg, state, titulo), 350);
}

function rasterizar(svg, state, titulo) {
  const [, , anchoMatriz, alto] = (svg.getAttribute('viewBox') || '0 0 800 600').split(/\s+/).map(Number);
  const escala = 2;
  // En matrices pequeñas se ensancha la imagen para que el título no se corte
  const ancho = Math.max(anchoMatriz, Math.ceil(titulo.length * 8.5) + 24);

  const clon = svg.cloneNode(true);
  clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clon.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  clon.setAttribute('width', ancho);
  clon.setAttribute('height', alto);

  // Copiar estilos calculados de cada elemento del original a su clon
  const originales = svg.querySelectorAll('*');
  const copias = clon.querySelectorAll('*');
  originales.forEach((el, k) => {
    const estilo = getComputedStyle(el);
    const enLinea = PROPIEDADES_SVG.map(p => `${p}:${estilo.getPropertyValue(p)}`).join(';');
    copias[k].setAttribute('style', enLinea);
  });

  // Quitar zoom y desplazamiento para exportar la matriz completa
  const capaZoom = clon.querySelector('g.zoom-layer');
  if (capaZoom) capaZoom.removeAttribute('transform');

  const texto = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  texto.setAttribute('x', 12);
  texto.setAttribute('y', 24);
  texto.setAttribute('style', 'fill:#1e293b;font-family:sans-serif;font-size:14px;font-weight:700');
  texto.textContent = titulo;
  clon.appendChild(texto);

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clon)],
    { type: 'image/svg+xml;charset=utf-8' }));
  const imagen = new Image();
  imagen.onload = () => {
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho * escala;
    lienzo.height = alto * escala;
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    URL.revokeObjectURL(url);
    lienzo.toBlob(blob => {
      if (blob) descargar(nombreArchivo(state, 'png'), blob);
    }, 'image/png');
  };
  imagen.onerror = () => URL.revokeObjectURL(url);
  imagen.src = url;
}
