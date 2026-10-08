/**
 * @file DotplotView.js
 * @description Renderizado interactivo sobre HTML5 Canvas para la vista Dotplot,
 * con soporte para alta resolución (devicePixelRatio), superposición del camino
 * óptimo y exportación a PNG.
 * Adaptado e integrado orgánicamente desde el proyecto de César.
 */

export class DotplotView {
  /**
   * Renderiza el gráfico Dotlet en el contenedor indicado.
   * @param {HTMLElement|string} container - Elemento o ID del contenedor DOM
   * @param {Object} dotletData - Datos del motor ({ seq1, seq2, dots, windowSize, threshold })
   * @param {Object} [options={}] - Opciones de celda y overlay
   * @param {Array<[number, number]>} [options.overlayPath] - Coordenadas [row, col] 1-indexadas
   */
  static render(container, dotletData, options = {}) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;
    el.innerHTML = '';

    const { seq1 = '', seq2 = '', dots = [] } = dotletData;
    const n = seq1.length; // Filas (Vertical: seq1)
    const m = seq2.length; // Columnas (Horizontal: seq2)

    if (n === 0 || m === 0) {
      el.innerHTML = '<div class="empty-msg" style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-weight:500;">Ingrese secuencias válidas para generar el Dotplot.</div>';
      return;
    }

    // Auto-adaptación dinámica al contenedor (como en D3Renderer con viewport adaptativo)
    const containerW = el.clientWidth || 700;
    const containerH = el.clientHeight || 520;

    const paddingLeft = 55;
    const paddingTop = 40;
    const paddingRight = 8;
    const paddingBottom = 8;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fit square cells to the limiting dimension; scroll instead of shrinking labels.
    ctx.font = '10px monospace';
    const minCellSize = Math.max(16, Math.ceil(ctx.measureText(String(m)).width) + 4);
    const availW = Math.max(0, containerW - paddingLeft - paddingRight);
    const availH = Math.max(0, containerH - paddingTop - paddingBottom);
    const cellSize = options.cellSize || Math.max(minCellSize, Math.min(availW / m, availH / n));
    const width = paddingLeft + m * cellSize + paddingRight;
    const height = paddingTop + n * cellSize + paddingBottom;

    const dpr = (typeof globalThis.window !== 'undefined' && globalThis.window.devicePixelRatio) ? globalThis.window.devicePixelRatio : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style = canvas.style || {};
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    canvas.style.flex = 'none';
    canvas.style.objectFit = 'contain';
    canvas.style.display = 'block';
    canvas.style.margin = 'auto';
    canvas.className = 'dotlet-canvas';

    ctx.scale(dpr, dpr);

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Encabezados superiores (seq2, horizontal)
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let j = 0; j < m; j++) {
      const x = paddingLeft + j * cellSize + cellSize / 2;
      ctx.fillText(seq2[j], x, paddingTop - 22);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText((j + 1).toString(), x, paddingTop - 8);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    }

    // Encabezados laterales (seq1, vertical)
    for (let i = 0; i < n; i++) {
      const y = paddingTop + i * cellSize + cellSize / 2;
      ctx.fillText(seq1[i], paddingLeft - 26, y);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText((i + 1).toString(), paddingLeft - 10, y);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    }

    // Cuadrícula
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    for (let i = 0; i <= n; i++) {
      const y = paddingTop + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + m * cellSize, y);
      ctx.stroke();
    }

    for (let j = 0; j <= m; j++) {
      const x = paddingLeft + j * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + n * cellSize);
      ctx.stroke();
    }

    // Puntos del Dotplot
    ctx.fillStyle = '#2563eb';
    const radius = Math.max(3, Math.floor(cellSize * 0.28));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        if (dots[i] && dots[i][j]) {
          const cx = paddingLeft + j * cellSize + cellSize / 2;
          const cy = paddingTop + i * cellSize + cellSize / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Trazo de superposición del camino óptimo en rojo
    if (options.overlayPath && Array.isArray(options.overlayPath) && options.overlayPath.length > 0) {
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.lineWidth = Math.max(2, Math.floor(cellSize * 0.16));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      let first = true;
      for (const coord of options.overlayPath) {
        const row = (Array.isArray(coord) ? coord[0] : coord.i) - 1;
        const col = (Array.isArray(coord) ? coord[1] : coord.j) - 1;
        if (row >= 0 && row < n && col >= 0 && col < m) {
          const x = paddingLeft + col * cellSize + cellSize / 2;
          const y = paddingTop + row * cellSize + cellSize / 2;
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    el.appendChild(canvas);
  }

  /**
   * Exporta el gráfico en alta resolución descargable en formato PNG.
   * @param {Object} dotletData
   * @param {Object} [options={}]
   * @param {string} [filename='']
   */
  static exportToPng(dotletData, options = {}, filename = '') {
    if (typeof document === 'undefined') return null;

    const { seq1 = '', seq2 = '', dots = [], windowSize = 1, threshold = 1 } = dotletData;
    const n = seq1.length;
    const m = seq2.length;
    if (n === 0 || m === 0) return null;

    const finalFilename = filename || `dotplot_${seq1}_${seq2}_w${windowSize}_t${threshold}.png`;
    const cellSize = 36;
    const paddingLeft = 65;
    const paddingTop = 165;
    const paddingRight = 40;
    const paddingBottom = 40;

    const gridWidth = m * cellSize;
    const gridHeight = n * cellSize;
    const width = Math.max(paddingLeft + gridWidth + paddingRight, 540);
    const height = paddingTop + gridHeight + paddingBottom;

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(scale, scale);

    // Fondo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Encabezado
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Gráfico Dotplot de Secuencias', 30, 22);

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(`Sec 1 (Fila / Vertical,   ${n} res): ${seq1}`, 30, 50);
    ctx.fillText(`Sec 2 (Col / Horizontal, ${m} res): ${seq2}`, 30, 72);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Parámetros: Ventana = ${windowSize}, Umbral = ${threshold}`, 30, 96);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 120);
    ctx.lineTo(width - 30, 120);
    ctx.stroke();

    const startX = paddingLeft;
    const startY = paddingTop;

    // Encabezados superiores
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let j = 0; j < m; j++) {
      const x = startX + j * cellSize + cellSize / 2;
      ctx.fillStyle = '#1e293b';
      ctx.fillText(seq2[j], x, startY - 24);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText((j + 1).toString(), x, startY - 8);
      ctx.font = 'bold 13px system-ui, sans-serif';
    }

    // Encabezados laterales
    for (let i = 0; i < n; i++) {
      const y = startY + i * cellSize + cellSize / 2;
      ctx.fillStyle = '#1e293b';
      ctx.fillText(seq1[i], startX - 26, y);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText((i + 1).toString(), startX - 10, y);
      ctx.font = 'bold 13px system-ui, sans-serif';
    }

    // Cuadrícula
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      const y = startY + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + gridWidth, y);
      ctx.stroke();
    }
    for (let j = 0; j <= m; j++) {
      const x = startX + j * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + gridHeight);
      ctx.stroke();
    }

    // Puntos
    ctx.fillStyle = '#2563eb';
    const radius = Math.max(3, Math.floor(cellSize * 0.28));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        if (dots[i] && dots[i][j]) {
          const cx = startX + j * cellSize + cellSize / 2;
          const cy = startY + i * cellSize + cellSize / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Overlay
    if (options.overlayPath && Array.isArray(options.overlayPath) && options.overlayPath.length > 0) {
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.lineWidth = Math.max(2, Math.floor(cellSize * 0.16));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      let first = true;
      for (const coord of options.overlayPath) {
        const row = (Array.isArray(coord) ? coord[0] : coord.i) - 1;
        const col = (Array.isArray(coord) ? coord[1] : coord.j) - 1;
        if (row >= 0 && row < n && col >= 0 && col < m) {
          const x = startX + col * cellSize + cellSize / 2;
          const y = startY + row * cellSize + cellSize / 2;
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    // Descarga
    const link = document.createElement('a');
    link.download = finalFilename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return canvas;
  }
}

export default DotplotView;
