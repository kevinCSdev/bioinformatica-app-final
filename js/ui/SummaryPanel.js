/**
 * Componente del panel de resumen (Alineamiento Óptimo).
 * Muestra el alineamiento biológico, métricas de identidad,
 * formato compacto de alineamiento con huecos (A-TG, AATG), vista condensada para secuencias largas (>40 nt)
 * y controles de navegación cuando existen múltiples caminos óptimos.
 */
export class SummaryPanel {
  /**
   * @param {string|HTMLElement} container - Selector o elemento del DOM
   * @param {Object} options - Opciones de configuración
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.onPathChange = options.onPathChange || null;

    this.paths = [];
    this.activePathIndex = 0;
    this.showFullView = false;
    this.threshold = options.threshold || 40;
  }

  /**
   * Establece los caminos óptimos y renderiza el resumen
   * @param {Array<Object>} paths - Arreglo de objetos AlignedPath
   * @param {number} activeIndex - Índice del camino actualmente seleccionado
   */
  render(paths = [], activeIndex = 0) {
    if (!this.container) return;

    if (paths !== this.paths) {
      this.paths = paths;
      this.showFullView = false;
    }

    this.activePathIndex = Math.max(0, Math.min(activeIndex, paths.length - 1));

    if (!paths || paths.length === 0) {
      this.renderEmpty();
      return;
    }

    const currentPath = paths[this.activePathIndex];
    const metrics = this._computeMetrics(currentPath);
    const isLong = metrics.length > this.threshold;
    const isCondensed = isLong && !this.showFullView;

    const badgesHtml = this._renderBadges(metrics, currentPath.score);
    const navHtml = this._renderNavigation(paths.length, this.activePathIndex);
    const metaBarHtml = this._renderMetaBar(currentPath, metrics, isLong, isCondensed);
    const alignmentHtml = this._formatAlignment(currentPath, isCondensed);

    this.container.innerHTML = `
      <div class="summary-card">
        <div class="summary-header">
          <h3 class="summary-title">
            <i class="bx bx-dna"></i> Alineamiento Óptimo
          </h3>
          ${navHtml}
        </div>
        ${badgesHtml}
        ${metaBarHtml}
        ${isCondensed ? `
          <div class="condensed-notice">
            <i class="bx bx-info-circle"></i> Secuencia extensa (${metrics.length} nucleótidos) &bull; Mostrando resumen condensado con elipsis.
          </div>
        ` : ''}
        <div class="alignment-box">
          ${alignmentHtml}
        </div>
      </div>
    `;

    this._bindEvents(isLong);
  }

  renderEmpty() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="summary-placeholder">
        <i class="bx bx-hourglass"></i>
        <span>Calcula el alineamiento para ver los resultados textuales y las métricas de identidad</span>
      </div>
    `;
  }

  _computeMetrics(path) {
    const s1 = path.alignment_s1 || '';
    const s2 = path.alignment_s2 || '';
    const len = Math.max(s1.length, s2.length);

    let matches = 0;
    let mismatches = 0;
    let gaps = 0;

    for (let k = 0; k < len; k++) {
      const c1 = s1[k];
      const c2 = s2[k];
      if (c1 === '-' || c2 === '-') {
        gaps++;
      } else if (c1 === c2) {
        matches++;
      } else {
        mismatches++;
      }
    }

    const identityPercent = len > 0 ? ((matches / len) * 100).toFixed(1) : '0.0';

    return {
      length: len,
      matches,
      mismatches,
      gaps,
      identityPercent
    };
  }

  _renderBadges(m, score) {
    return `
      <div class="metrics-grid">
        <div class="metric-badge metric-score">
          <span class="metric-label">Puntaje</span>
          <span class="metric-val">${score}</span>
        </div>
        <div class="metric-badge metric-identity">
          <span class="metric-label">Identidad</span>
          <span class="metric-val">${m.identityPercent}%</span>
        </div>
        <div class="metric-badge metric-matches">
          <span class="metric-label">Coincidencias</span>
          <span class="metric-val">${m.matches}</span>
        </div>
        <div class="metric-badge metric-mismatches">
          <span class="metric-label">Discrepancias</span>
          <span class="metric-val">${m.mismatches}</span>
        </div>
        <div class="metric-badge metric-gaps">
          <span class="metric-label">Huecos (Gaps)</span>
          <span class="metric-val">${m.gaps}</span>
        </div>
        <div class="metric-badge metric-length">
          <span class="metric-label">Longitud</span>
          <span class="metric-val">${m.length}</span>
        </div>
      </div>
    `;
  }

  _renderMetaBar(path, metrics, isLong, isCondensed) {
    if (!isLong) return '';

    return `
      <div class="alignment-meta-bar">
        <button type="button" class="btn-toggle-view" id="btn-toggle-view">
          <i class="bx ${isCondensed ? 'bx-expand-alt' : 'bx-collapse-alt'}"></i>
          ${isCondensed ? 'Vista Completa' : 'Vista Resumida'}
        </button>
      </div>
    `;
  }

  _formatAlignment(path, isCondensed) {
    const s1 = path.alignment_s1 || '';
    const s2 = path.alignment_s2 || '';
    const len = Math.max(s1.length, s2.length);

    if (len === 0) {
      return `<div class="empty-alignment">(No se encontró alineamiento local con puntaje &gt; 0)</div>`;
    }

    let matchLine = '';
    for (let k = 0; k < len; k++) {
      const c1 = s1[k];
      const c2 = s2[k];
      if (c1 === '-' || c2 === '-') {
        matchLine += ' ';
      } else if (c1 === c2) {
        matchLine += '|';
      } else {
        matchLine += ':';
      }
    }

    let s1Display = s1;
    let s2Display = s2;
    let matchDisplay = matchLine;

    if (isCondensed) {
      const prefixCount = 15;
      const suffixCount = 15;
      s1Display = `${s1.slice(0, prefixCount)} ... ${s1.slice(-suffixCount)}`;
      s2Display = `${s2.slice(0, prefixCount)} ... ${s2.slice(-suffixCount)}`;
      matchDisplay = `${matchLine.slice(0, prefixCount)} ... ${matchLine.slice(-suffixCount)}`;
    }

    return `
      <div class="alignment-display-wrapper">
        <div class="sequence-blocks-container">
          <div class="sequence-block sequence-block-horizontal">
            <div class="sequence-block-header">
              <span class="sequence-badge badge-horizontal" data-seq="Seq 2">SECUENCIA HORIZONTAL (SEQ 2)</span>
            </div>
            <div class="sequence-content">
              <span class="sequence-chars seq-2-chars">${s2Display}</span>
            </div>
          </div>

          <div class="sequence-block sequence-block-match">
            <div class="sequence-block-header">
              <span class="sequence-badge badge-match">CORRESPONDENCIA</span>
            </div>
            <div class="sequence-content">
              <span class="sequence-chars match-line-chars">${matchDisplay}</span>
            </div>
          </div>

          <div class="sequence-block sequence-block-vertical">
            <div class="sequence-block-header">
              <span class="sequence-badge badge-vertical" data-seq="Seq 1">SECUENCIA VERTICAL (SEQ 1)</span>
            </div>
            <div class="sequence-content">
              <span class="sequence-chars seq-1-chars">${s1Display}</span>
            </div>
          </div>
        </div>

        <div class="alignment-pure-vertical">
          <div class="pure-vertical-header">
            <span class="pure-vertical-title"><i class="bx bx-copy"></i> Texto vertical</span>
          </div>
          <pre class="pure-vertical-code">${s2Display}\n${s1Display}</pre>
        </div>
      </div>
    `;
  }

  _renderNavigation(totalPaths, currentIndex) {
    if (totalPaths <= 1) return '';

    return `
      <div class="path-navigation">
        <button type="button" class="btn-nav btn-prev-path" ${currentIndex === 0 ? 'disabled' : ''} title="Camino anterior">
          <i class="bx bx-chevron-left"></i>
        </button>
        <span class="path-indicator">Camino ${currentIndex + 1} de ${totalPaths}</span>
        <button type="button" class="btn-nav btn-next-path" ${currentIndex === totalPaths - 1 ? 'disabled' : ''} title="Camino siguiente">
          <i class="bx bx-chevron-right"></i>
        </button>
      </div>
    `;
  }

  _bindEvents(isLong) {
    const prevBtn = this.container.querySelector('.btn-prev-path');
    const nextBtn = this.container.querySelector('.btn-next-path');
    const toggleBtn = this.container.querySelector('#btn-toggle-view');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.activePathIndex > 0) {
          this.activePathIndex--;
          this.render(this.paths, this.activePathIndex);
          if (this.onPathChange) {
            this.onPathChange(this.activePathIndex, this.paths[this.activePathIndex]);
          }
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.activePathIndex < this.paths.length - 1) {
          this.activePathIndex++;
          this.render(this.paths, this.activePathIndex);
          if (this.onPathChange) {
            this.onPathChange(this.activePathIndex, this.paths[this.activePathIndex]);
          }
        }
      });
    }

    if (toggleBtn && isLong) {
      toggleBtn.addEventListener('click', () => {
        this.showFullView = !this.showFullView;
        this.render(this.paths, this.activePathIndex);
      });
    }
  }
}
