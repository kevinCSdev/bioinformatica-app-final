import { AlgorithmType } from '../core/Types.js';

/**
 * Panel visual de desglose matemático y renderizado KaTeX.
 * Renderiza:
 * 1. La matriz visual de cálculo paso a paso según especificación App-08 (Lateral, Diagonal, Superior, Reinicio)
 *    con etiquetas de celda, valores de vecinos, operaciones y la opción ganadora destacada con marca de verificación.
 * 2. La deducción matemática exacta de la relación de recurrencia en KaTeX.
 */
export class MathPanel {
  /**
   * @param {string|HTMLElement} container - Selector o elemento del DOM
   */
  constructor(container) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.activeCell = null;
    this.algorithm = AlgorithmType.NEEDLEMAN_WUNSCH;
    this.scoring = {};
  }

  /**
   * Actualiza el panel con los detalles de la celda activa
   * @param {Object} cellDetails - Detalle de la celda obtenido desde AlignmentEngine
   * @param {string} algorithm - Clave del algoritmo activo
   * @param {Object} scoring - Parámetros de puntuación activos
   */
  update(cellDetails, algorithm = AlgorithmType.NEEDLEMAN_WUNSCH, scoring = {}) {
    if (!this.container) return;
    this.activeCell = cellDetails;
    this.algorithm = algorithm;
    this.scoring = scoring;

    if (!cellDetails) {
      this.renderEmpty();
      return;
    }

    // Construir el HTML de la matriz visual paso a paso (estilo App-08 con etiquetas en español)
    const visualMatrixHtml = this.generateVisualCalculationMatrix(cellDetails, algorithm, scoring);
    const latex = this.generateLatex(cellDetails, algorithm, scoring);

    this.container.innerHTML = `
      <div class="math-panel-wrapper">
        <div class="math-panel-cell-title">
          <span class="badge-cell">Celda (${cellDetails.i}, ${cellDetails.j})</span>
          <span class="badge-score">Valor = ${cellDetails.score}</span>
        </div>
        ${visualMatrixHtml}
        <div class="katex-formula-container"></div>
      </div>
    `;

    // Renderizar fórmula KaTeX si no corresponde al origen base
    const target = this.container.querySelector('.katex-formula-container');
    const katex = window.katex;
    if (target && katex && typeof katex.render === 'function') {
      try {
        katex.render(latex, target, {
          displayMode: true,
          throwOnError: false
        });
      } catch (err) {
        target.innerHTML = `<pre class="math-fallback">${latex}</pre>`;
      }
    } else if (target) {
      target.innerHTML = `<pre class="math-fallback">${latex.replace(/\\\\/g, '\n').replace(/[{}]/g, '')}</pre>`;
    }
  }

  /**
   * Renderiza el estado vacío del panel
   */
  renderEmpty() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="calculation-matrix-placeholder">
        <i class="bx bx-calculator"></i>
        <p>Avanza un paso o haz clic en una celda para ver el desglose matemático</p>
      </div>
    `;
  }

  /**
   * Genera la matriz visual de cálculo coincidente con la especificación App-08
   */
  generateVisualCalculationMatrix(details, algo, scoring) {
    const { i, j, isBoundary, isMatch, score, diagVal, upVal, leftVal, candidateDiag, candidateUp, candidateLeft, matchWeight, gapWeight } = details;

    if (isBoundary || i === 0 || j === 0) {
      return `
        <div class="calculation-matrix-container boundary-info">
          <div class="boundary-header"><i class="bx bx-info-circle"></i> Caso Base / Condición de Borde</div>
          <div class="boundary-body">
            ${i === 0 && j === 0 ? 'Origen de la matriz: inicializado en <strong>0</strong>' : 
              algo === AlgorithmType.SMITH_WATERMAN ? 'Borde Smith-Waterman inicializado en <strong>0</strong> (sin penalización inicial en alineamiento local)' :
              algo === AlgorithmType.WAGNER_FISCHER ? `Penalización de inserción/deleción (Indel) acumulada: <strong>${score}</strong>` :
              algo === AlgorithmType.LCS ? 'Borde LCS inicializado en <strong>0</strong> (subsecuencia común vacía)' :
              `Penalización acumulada de Huecos (Gaps): <strong>${score}</strong> (${(i || j)} × gap)`}
          </div>
        </div>
      `;
    }

    const includeReset = algo === AlgorithmType.SMITH_WATERMAN;
    const isEditDist = algo === AlgorithmType.WAGNER_FISCHER;
    const isLCS = algo === AlgorithmType.LCS;

    // Determinar qué candidato(s) resultaron ganadores
    let isDiagWinner = false;
    let isUpWinner = false;
    let isLeftWinner = false;
    let isZeroWinner = false;

    if (includeReset && score === 0 && candidateDiag < 0 && candidateUp < 0 && candidateLeft < 0) {
      isZeroWinner = true;
    } else if (isEditDist) {
      const minVal = Math.min(candidateDiag, candidateUp, candidateLeft);
      if (candidateDiag === minVal) isDiagWinner = true;
      if (candidateUp === minVal) isUpWinner = true;
      if (candidateLeft === minVal) isLeftWinner = true;
    } else {
      const maxVal = Math.max(candidateDiag, candidateUp, candidateLeft, includeReset ? 0 : -Infinity);
      if (candidateDiag === maxVal) isDiagWinner = true;
      if (candidateUp === maxVal) isUpWinner = true;
      if (candidateLeft === maxVal) isLeftWinner = true;
      if (includeReset && 0 === maxVal) isZeroWinner = true;
    }

    const colCount = includeReset ? 4 : 3;

    return `
      <div class="calculation-matrix-container">
        <div class="matrix-" style="grid-template-columns: repeat(${colCount}, 1fr);">
          <!-- Fila 1: Iconos de dirección -->
          <div class="matrix-row-header" style="display: contents;">
            <div class="matrix-cell"><div class="cell-icon">←</div></div>
            <div class="matrix-cell"><div class="cell-icon">↖</div></div>
            <div class="matrix-cell"><div class="cell-icon">↑</div></div>
            ${includeReset ? '<div class="matrix-cell reset-cell"><div class="cell-icon">⊗</div></div>' : ''}
          </div>

          <!-- Fila 2: Valores vecinos con etiquetas normalizadas en español -->
          <div class="matrix-row-values" style="display: contents;">
            <div class="matrix-cell">
              <div class="cell-label">LATERAL</div>
              <div class="cell-value ${leftVal < 0 ? 'negative' : 'positive'}">${leftVal}</div>
            </div>
            <div class="matrix-cell">
              <div class="cell-label">DIAGONAL</div>
              <div class="cell-value ${diagVal < 0 ? 'negative' : 'positive'}">${diagVal}</div>
            </div>
            <div class="matrix-cell">
              <div class="cell-label">SUPERIOR</div>
              <div class="cell-value ${upVal < 0 ? 'negative' : 'positive'}">${upVal}</div>
            </div>
            ${includeReset ? `
              <div class="matrix-cell">
                <div class="cell-label">REINICIO</div>
                <div class="cell-value">0</div>
              </div>
            ` : ''}
          </div>

          <!-- Fila 3: Puntuación / Operación normalizada en español -->
          <div class="matrix-row-scores" style="display: contents;">
            <div class="matrix-cell">
              <div class="cell-label">${isEditDist ? 'INDEL' : 'GAP'}</div>
              <div class="cell-operation">${gapWeight}</div>
            </div>
            <div class="matrix-cell">
              <div class="cell-label">${details.substitution === 'blosum62' ? `BLOSUM62 (${details.s1Char},${details.s2Char})` : (isMatch ? 'COINCIDENCIA' : (isEditDist ? 'SUSTITUCIÓN' : 'DISCREPANCIA'))}</div>
              <div class="cell-operation">${matchWeight}</div>
            </div>
            <div class="matrix-cell">
              <div class="cell-label">${isEditDist ? 'INDEL' : 'GAP'}</div>
              <div class="cell-operation">${gapWeight}</div>
            </div>
            ${includeReset ? `
              <div class="matrix-cell">
                <div class="cell-label">CERO</div>
                <div class="cell-operation">0</div>
              </div>
            ` : ''}
          </div>

          <!-- Fila 4: Resultados / Ganador -->
          <div class="matrix-row-results" style="display: contents;">
            <div class="matrix-cell ${isLeftWinner ? 'winner' : ''}">
              <div class="cell-result ${candidateLeft < 0 ? 'negative' : candidateLeft > 0 ? 'positive' : ''}">${candidateLeft}</div>
            </div>
            <div class="matrix-cell ${isDiagWinner ? 'winner' : ''}">
              <div class="cell-result ${candidateDiag < 0 ? 'negative' : candidateDiag > 0 ? 'positive' : ''}">${candidateDiag}</div>
            </div>
            <div class="matrix-cell ${isUpWinner ? 'winner' : ''}">
              <div class="cell-result ${candidateUp < 0 ? 'negative' : candidateUp > 0 ? 'positive' : ''}">${candidateUp}</div>
            </div>
            ${includeReset ? `
              <div class="matrix-cell ${isZeroWinner ? 'winner' : ''}">
                <div class="cell-result">0</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Genera la ecuación de recurrencia en LaTeX en español
   */
  generateLatex(details, algo, scoring) {
    const { i, j, isBoundary, score } = details;
    if (isBoundary || i === 0 || j === 0) {
      if (i === 0 && j === 0) return `M(0, 0) = 0`;
      return `M(${i}, ${j}) = ${score}`;
    }

    const { diagVal, upVal, leftVal, candidateDiag, candidateUp, candidateLeft, matchWeight, gapWeight, isMatch } = details;
    const sign = (val) => (val >= 0 ? `+ ${val}` : `- ${Math.abs(val)}`);

    if (algo === AlgorithmType.NEEDLEMAN_WUNSCH) {
      return `
        \\begin{aligned}
        M(${i}, ${j}) &= \\max \\begin{cases}
          \\text{Diagonal}: & ${diagVal} ${sign(matchWeight)} = \\mathbf{${candidateDiag}} \\\\
          \\text{Superior}: & ${upVal} ${sign(gapWeight)} = \\mathbf{${candidateUp}} \\\\
          \\text{Lateral}:  & ${leftVal} ${sign(gapWeight)} = \\mathbf{${candidateLeft}}
        \\end{cases} = \\mathbf{${score}}
        \\end{aligned}
      `;
    }

    if (algo === AlgorithmType.SMITH_WATERMAN) {
      return `
        \\begin{aligned}
        H(${i}, ${j}) &= \\max \\begin{cases}
          0 \\quad (\\text{Reinicio}) \\\\
          \\text{Diagonal}: & ${diagVal} ${sign(matchWeight)} = \\mathbf{${candidateDiag}} \\\\
          \\text{Superior}: & ${upVal} ${sign(gapWeight)} = \\mathbf{${candidateUp}} \\\\
          \\text{Lateral}:  & ${leftVal} ${sign(gapWeight)} = \\mathbf{${candidateLeft}}
        \\end{cases} = \\mathbf{${score}}
        \\end{aligned}
      `;
    }

    if (algo === AlgorithmType.WAGNER_FISCHER) {
      return `
        \\begin{aligned}
        D(${i}, ${j}) &= \\min \\begin{cases}
          \\text{Diagonal}: & ${diagVal} + ${matchWeight} = \\mathbf{${candidateDiag}} \\\\
          \\text{Superior}: & ${upVal} + ${gapWeight} = \\mathbf{${candidateUp}} \\\\
          \\text{Lateral}:  & ${leftVal} + ${gapWeight} = \\mathbf{${candidateLeft}}
        \\end{cases} = \\mathbf{${score}}
        \\end{aligned}
      `;
    }

    if (algo === AlgorithmType.LCS) {
      if (isMatch) {
        return `L(${i}, ${j}) = L(${i-1}, ${j-1}) + 1 = ${diagVal} + 1 = \\mathbf{${score}}`;
      }
      return `L(${i}, ${j}) = \\max(L(${i-1}, ${j}), L(${i}, ${j-1})) = \\max(${upVal}, ${leftVal}) = \\mathbf{${score}}`;
    }

    return `M(${i}, ${j}) = ${score}`;
  }
}
