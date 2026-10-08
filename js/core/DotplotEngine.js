/**
 * @file DotplotEngine.js
 * @description Motor matemático puro e independiente para el cálculo de matrices de puntos (Dotplot).
 * Aplica comparación por ventana deslizante simétrica y umbral de identidad.
 * Adaptado e integrado orgánicamente desde el proyecto de César.
 */

export class DotplotEngine {
  /**
   * @param {string} seq1 - Secuencia 1 (Fila / Vertical, índice i)
   * @param {string} seq2 - Secuencia 2 (Columna / Horizontal, índice j)
   * @param {Object} options - Parámetros de ventana y umbral
   * @param {number} [options.windowSize=1] - Tamaño de la ventana (se ajusta a impar si es par)
   * @param {number} [options.threshold=1] - Cantidad mínima de coincidencias requeridas
   */
  constructor(seq1, seq2, options = {}) {
    this.seq1 = (seq1 || '').toUpperCase();
    this.seq2 = (seq2 || '').toUpperCase();
    this.rows = this.seq1.length;
    this.cols = this.seq2.length;

    // Normalizar windowSize: entero >= 1. Las ventanas simétricas centradas requieren tamaño impar.
    let w = Math.max(1, parseInt(options.windowSize, 10) || 1);
    if (w % 2 === 0) {
      w += 1;
    }
    this.windowSize = w;

    // El umbral debe ser al menos 1 y no puede superar el tamaño de la ventana
    let t = Math.max(1, parseInt(options.threshold, 10) || 1);
    t = Math.min(t, this.windowSize);
    this.threshold = t;

    this.matrix = null;
  }

  /**
   * Calcula la matriz booleana de puntos aplicando la ventana y el umbral configurados.
   * @returns {boolean[][]} Matriz de dimensiones rows x cols
   */
  compute() {
    const n = this.rows;
    const m = this.cols;
    const dots = Array.from({ length: n }, () => Array(m).fill(false));

    if (n === 0 || m === 0) {
      this.matrix = dots;
      return dots;
    }

    if (this.windowSize <= 1) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
          if (this.seq1[i] === this.seq2[j]) {
            dots[i][j] = true;
          }
        }
      }
      this.matrix = dots;
      return dots;
    }

    const half = Math.floor(this.windowSize / 2);
    for (let i = half; i < n - half; i++) {
      for (let j = half; j < m - half; j++) {
        let matches = 0;
        for (let k = -half; k <= half; k++) {
          if (this.seq1[i + k] === this.seq2[j + k]) {
            matches++;
          }
        }
        if (matches >= this.threshold) {
          dots[i][j] = true;
        }
      }
    }

    this.matrix = dots;
    return dots;
  }

  /**
   * Adapta las coordenadas de un camino óptimo proveniente de AlignmentEngine
   * para su superposición gráfica en el canvas del Dotplot.
   * Filtra celdas de borde (i=0 o j=0) y asegura formato [row, col] 1-indexado.
   *
   * @param {Array<{i: number, j: number}|[number, number]>} pathCoords
   * @returns {Array<[number, number]>}
   */
  formatOverlayPath(pathCoords) {
    if (!Array.isArray(pathCoords)) return [];
    const formatted = [];
    for (const pt of pathCoords) {
      const i = Array.isArray(pt) ? pt[0] : pt.i;
      const j = Array.isArray(pt) ? pt[1] : pt.j;
      if (typeof i === 'number' && typeof j === 'number' && i >= 1 && j >= 1) {
        formatted.push([i, j]);
      }
    }
    return formatted;
  }

  /**
   * Retorna el paquete de datos listo para el renderizador DotplotView.
   * @returns {Object}
   */
  getData() {
    return {
      seq1: this.seq1,
      seq2: this.seq2,
      windowSize: this.windowSize,
      threshold: this.threshold,
      dots: this.matrix || this.compute()
    };
  }
}

export default DotplotEngine;
