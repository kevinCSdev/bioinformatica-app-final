import { AppState } from './state/AppState.js';
import { D3Renderer } from './ui/D3Renderer.js';
import { MathPanel } from './ui/MathPanel.js';
import { SummaryPanel } from './ui/SummaryPanel.js';
import { AlgorithmType, DefaultScoring, SubstitutionType } from './core/Types.js';
import { validarEntrada, TipoSecuencia } from './core/Validacion.js';
import { exportarCSV, exportarPNG } from './ui/Exportador.js';
import { DotplotEngine } from './core/DotplotEngine.js';
import { DotplotView } from './ui/DotplotView.js';

/**
 * Inicialización principal de la aplicación y conexión con el DOM
 */
document.addEventListener('DOMContentLoaded', () => {
  // Referencias al DOM - Barra lateral y botón de colapso
  const sidebar = document.querySelector('nav.sidebar');
  const toggle = sidebar.querySelector('.toggle');
  // Entradas de texto, selectores y etiquetas
  const seq1Input = document.getElementById('seq_1');
  const seq2Input = document.getElementById('seq_2');
  const algoSelect = document.getElementById('algo-select');
  const tipoSelect = document.getElementById('tipo-select');
  const mensajes = document.getElementById('mensajes');
  const matrixCard = document.querySelector('.matrix-card');
  const matchScoreInput = document.getElementById('matchScore');
  const mismatchScoreInput = document.getElementById('mismatchScore');
  const gapScoreInput = document.getElementById('gapScore');

  // Elementos de Dotplot
  const tabBtnMatrix = document.getElementById('tab-btn-matrix');
  const tabBtnDotplot = document.getElementById('tab-btn-dotplot');
  const matrixContainer = document.getElementById('matrix-canvas-container');
  const dotplotContainer = document.getElementById('dotplot-canvas-container');
  const viewInstructions = document.getElementById('matrix-instructions');
  const dotplotParamsGroup = document.getElementById('dotplot-params-group');
  const dotplotWindowInput = document.getElementById('dotplotWindow');
  const dotplotThresholdInput = document.getElementById('dotplotThreshold');
  const dotplotOverlayToggle = document.getElementById('dotplotOverlayToggle');

  const labelMatch = document.getElementById('label-match');
  const labelMismatch = document.getElementById('label-mismatch');
  const labelGap = document.getElementById('label-gap');

  // Botones de acción y control
  const calculateButton = document.getElementById('calculateButton');
  const btnPrev = document.getElementById('anterior');
  const btnNext = document.getElementById('siguiente');
  const btnAutoRun = document.getElementById('autoRunButton');
  const autorunLabel = document.getElementById('autorun-label');
  const autorunIcon = document.getElementById('autorun-icon');
  const btnFinal = document.getElementById('finalButton');
  const btnReset = document.getElementById('resetButton');
  const btnExportCsv = document.getElementById('exportCsvButton');
  const btnExportPng = document.getElementById('exportPngButton');

  // Controles que dependen de una entrada válida (se bloquean si hay errores)
  const controlesDependientes = [btnPrev, btnNext, btnAutoRun, btnFinal, btnReset, btnExportCsv, btnExportPng];
  const controlesEjecucion = [calculateButton, btnPrev, btnNext, btnAutoRun, btnFinal, btnReset];
  let entradaValida = true;
  let activeView = 'matrix';

  const speedSlider = document.getElementById('speed-slider');
  const speedLabel = document.getElementById('speed-label');
  const playbackStatus = document.getElementById('playback-status');
  const activeAlgoBadge = document.getElementById('active-algo-badge');
  const exampleSelect = document.getElementById('example-select');

  // Instanciar los componentes principales
  const appState = new AppState();
  const mathPanel = new MathPanel('#math-panel-container');
  const summaryPanel = new SummaryPanel('#summary-panel-container', {
    onPathChange: (index) => {
      appState.setActivePathIndex(index);
    }
  });

  const renderer = new D3Renderer('#matrix-canvas-container', {
    onCellClick: (cell) => {
      if (cell && cell.calculated && appState.engine) {
        const details = appState.engine.getCellDetails(cell.i, cell.j);
        if (details) {
          mathPanel.update(details, appState.algorithm, appState.scoring);
        }
      }
    }
  });

  const algoDisplayNames = {
    [AlgorithmType.NEEDLEMAN_WUNSCH]: 'Global: Needleman-Wunsch',
    [AlgorithmType.SMITH_WATERMAN]: 'Local: Smith-Waterman',
    [AlgorithmType.WAGNER_FISCHER]: 'Wagner-Fischer (Edit Distance)',
    [AlgorithmType.LCS]: 'Longest Common Subsequence (LCS)'
  };

  /**
   * Alterna la expansión/colapso de la barra lateral
   */
  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('close');
    });
  }

  /**
   * Actualiza las etiquetas y valores por defecto de puntuación según el algoritmo seleccionado
   */
  function updateScoringInputs(algorithm) {
    const defaults = DefaultScoring[algorithm] || DefaultScoring.NW;

    if (algorithm === AlgorithmType.WAGNER_FISCHER) {
      if (labelMatch) labelMatch.textContent = 'Costo Coincidencia';
      if (labelMismatch) labelMismatch.textContent = 'Costo Sustitución';
      if (labelGap) labelGap.textContent = 'Costo Indel';

      matchScoreInput.placeholder = 'Costo Coincidencia (0)';
      matchScoreInput.value = defaults.matchCost ?? 0;
      mismatchScoreInput.placeholder = 'Costo Sustitución (1)';
      mismatchScoreInput.value = defaults.subCost ?? 1;
      gapScoreInput.placeholder = 'Costo Indel (1)';
      gapScoreInput.value = defaults.indelCost ?? 1;
    } else if (algorithm === AlgorithmType.LCS) {
      if (labelMatch) labelMatch.textContent = 'Coincidencia (Match)';
      if (labelMismatch) labelMismatch.textContent = 'Discrepancia (Mismatch)';
      if (labelGap) labelGap.textContent = 'Penalización Gap';

      matchScoreInput.placeholder = 'Match (1)';
      matchScoreInput.value = 1;
      mismatchScoreInput.placeholder = 'Mismatch (0)';
      mismatchScoreInput.value = 0;
      gapScoreInput.placeholder = 'Gap (0)';
      gapScoreInput.value = 0;
    } else {
      if (labelMatch) labelMatch.textContent = 'Coincidencia (Match)';
      if (labelMismatch) labelMismatch.textContent = 'Discrepancia (Mismatch)';
      if (labelGap) labelGap.textContent = 'Penalización Gap';

      matchScoreInput.placeholder = 'Coincidencia (Match)';
      matchScoreInput.value = defaults.match ?? 1;
      mismatchScoreInput.placeholder = 'Discrepancia (Mismatch)';
      mismatchScoreInput.value = defaults.mismatch ?? -1;
      gapScoreInput.placeholder = 'Penalización Gap';
      gapScoreInput.value = defaults.gap ?? -2;
    }
  }

  /**
   * Lee los parámetros de puntuación desde la interfaz de usuario
   */
  function getScoringFromUI() {
    const algo = algoSelect.value;
    if (algo === AlgorithmType.WAGNER_FISCHER) {
      return {
        matchCost: Number(matchScoreInput.value || 0),
        subCost: Number(mismatchScoreInput.value || 1),
        indelCost: Number(gapScoreInput.value || 1)
      };
    } else if (algo === AlgorithmType.LCS) {
      return { match: 1, mismatch: 0, gap: 0 };
    }
    return {
      match: Number(matchScoreInput.value || 1),
      mismatch: Number(mismatchScoreInput.value || -1),
      gap: Number(gapScoreInput.value || -2),
      substitution: tipoSelect.value === TipoSecuencia.BLOSUM62 ? SubstitutionType.BLOSUM62 : SubstitutionType.SIMPLE
    };
  }

  /**
   * BLOSUM62 solo aplica a NW y SW; con ella, coincidencia y discrepancia
   * los define la matriz, por lo que esos campos se deshabilitan
   */
  function actualizarControlesTipo() {
    const algo = algoSelect.value;
    const admiteBlosum = algo === AlgorithmType.NEEDLEMAN_WUNSCH || algo === AlgorithmType.SMITH_WATERMAN;
    const opcionBlosum = tipoSelect.querySelector(`option[value="${TipoSecuencia.BLOSUM62}"]`);
    opcionBlosum.disabled = !admiteBlosum;
    if (!admiteBlosum && tipoSelect.value === TipoSecuencia.BLOSUM62) {
      tipoSelect.value = TipoSecuencia.PROTEINA;
    }

    const usaBlosum = tipoSelect.value === TipoSecuencia.BLOSUM62;
    const sinParametros = algo === AlgorithmType.LCS;
    [matchScoreInput, mismatchScoreInput].forEach(input => {
      input.disabled = usaBlosum || sinParametros;
      input.title = usaBlosum ? 'Definido por la matriz BLOSUM62' : '';
    });
    gapScoreInput.disabled = sinParametros;
    document.querySelectorAll('.stepper-btn').forEach(btn => {
      const objetivo = document.getElementById(btn.getAttribute('data-target'));
      btn.disabled = objetivo ? objetivo.disabled : false;
    });
  }

  function descripcionPuntaje() {
    const opcion = tipoSelect.options[tipoSelect.selectedIndex];
    return opcion ? opcion.textContent : '';
  }

  /**
   * Muestra los errores de validación y marca los campos inválidos
   */
  function mostrarErrores(errores) {
    document.querySelectorAll('.campo-invalido').forEach(el => el.classList.remove('campo-invalido'));
    if (errores.length === 0) {
      mensajes.innerHTML = '';
      return;
    }
    errores.forEach(e => {
      const campo = document.getElementById(e.campo);
      if (campo) campo.classList.add('campo-invalido');
    });
    // Se eliminan mensajes repetidos antes de listarlos
    const textos = [...new Set(errores.map(e => e.texto))];
    const caja = document.createElement('div');
    caja.className = 'aviso-error';
    caja.innerHTML = `
      <div class="aviso-icono"><i class='bx bx-error-circle' aria-hidden="true"></i></div>
      <div class="aviso-cuerpo">
        <h2 class="aviso-titulo">No es posible construir la matriz</h2>
        <ul class="aviso-lista"></ul>
        <p class="aviso-ayuda">Corrija los campos marcados para continuar.</p>
      </div>`;
    const lista = caja.querySelector('.aviso-lista');
    textos.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      lista.appendChild(li);
    });
    mensajes.replaceChildren(caja);
  }

  function bloquearControles(bloquear) {
    entradaValida = !bloquear;
    actualizarEstadoControles();
    if (matrixCard) matrixCard.classList.toggle('matriz-invalida', bloquear);
  }

  // Derive anchor availability from both view and validation, never from old CSS state.
  function actualizarEstadoControles() {
    const controles = new Set([calculateButton, ...controlesDependientes]);
    controles.forEach(el => {
      if (!el) return;
      const bloqueado = (activeView === 'dotplot' && controlesEjecucion.includes(el)) ||
        (!entradaValida && controlesDependientes.includes(el));
      el.classList.toggle('control-bloqueado', bloqueado);
      el.setAttribute('aria-disabled', String(bloqueado));
      if (bloqueado) el.setAttribute('tabindex', '-1');
      else el.removeAttribute('tabindex');
    });
  }

  /**
   * Reinicializa el estado y la matriz con los valores actuales del formulario
   */
  function reinitialize() {
    const algo = algoSelect.value;
    const errores = validarEntrada({
      seq1: seq1Input.value,
      seq2: seq2Input.value,
      algorithm: algo,
      tipo: tipoSelect.value,
      params: {
        matchScore: matchScoreInput.value,
        mismatchScore: mismatchScoreInput.value,
        gapScore: gapScoreInput.value
      }
    });
    mostrarErrores(errores);
    if (errores.length > 0) {
      appState.stopAutoRun();
      bloquearControles(true);
      return;
    }
    bloquearControles(false);

    const s1 = seq1Input.value.trim().toUpperCase();
    const s2 = seq2Input.value.trim().toUpperCase();
    appState.init(s1, s2, algo, getScoringFromUI());
  }

  // Suscripción reactiva a eventos de AppState
  appState.subscribe((state, eventType, payload) => {
    playbackStatus.textContent = state.status;
    activeAlgoBadge.innerHTML = `<i class='bx bx-chip'></i> ${algoDisplayNames[state.algorithm] || state.algorithm}`;

    if (eventType === 'INIT') {
      renderer.mount(payload.rows, payload.cols, payload.seq1, payload.seq2);
      renderer.updateMatrixCells(state.getFlatMatrix(), null, []);
      mathPanel.renderEmpty();
      summaryPanel.renderEmpty();
    } else if (eventType === 'STEP_FORWARD' || eventType === 'STEP_BACKWARD') {
      renderer.clearTraceback();
      if (state.optimalPaths.length === 0) {
        summaryPanel.renderEmpty();
      }
      const active = payload.activeCell;
      renderer.updateMatrixCells(state.getFlatMatrix(), active, []);
      if (active) {
        mathPanel.update(active.details || active, state.algorithm, state.scoring);
      } else {
        mathPanel.renderEmpty();
      }
    } else if (eventType === 'COMPLETE' || eventType === 'INSTANT_COMPLETE') {
      const active = payload.activeCell;
      const pathCoords = state.getActivePathCoordinates();
      renderer.updateMatrixCells(state.getFlatMatrix(), active, pathCoords);
      renderer.renderTracebackArrow(pathCoords);
      if (active) {
        mathPanel.update(active.details || active, state.algorithm, state.scoring);
      }
      summaryPanel.render(state.optimalPaths, state.activePathIndex);
    } else if (eventType === 'RESET') {
      renderer.updateMatrixCells(state.getFlatMatrix(), null, []);
      renderer.clearTraceback();
      mathPanel.renderEmpty();
      summaryPanel.renderEmpty();
    } else if (eventType === 'AUTORUN_START') {
      autorunIcon.className = 'bx bx-pause icon';
      autorunLabel.textContent = 'Pausar';
    } else if (eventType === 'AUTORUN_STOP') {
      autorunIcon.className = 'bx bx-play icon';
      autorunLabel.textContent = 'Auto Ejecutar';
    } else if (eventType === 'PATH_CHANGE') {
      const pathCoords = state.getActivePathCoordinates();
      renderer.updateMatrixCells(state.getFlatMatrix(), state.getActiveCell(), pathCoords);
      renderer.renderTracebackArrow(pathCoords);
    }

    if (activeView === 'dotplot') {
      renderDotplot();
    }
  });

  // Escuchadores de eventos para entradas de secuencia
  seq1Input.addEventListener('input', () => {
    seq1Input.value = seq1Input.value.toUpperCase();
    if (exampleSelect) exampleSelect.value = '';
  });

  seq2Input.addEventListener('input', () => {
    seq2Input.value = seq2Input.value.toUpperCase();
    if (exampleSelect) exampleSelect.value = '';
  });

  // Al confirmar una secuencia (Enter o salir del campo) se valida y reconstruye la matriz
  [seq1Input, seq2Input].forEach(input => input.addEventListener('change', reinitialize));

  tipoSelect.addEventListener('change', () => {
    if (exampleSelect) exampleSelect.value = '';
    // Penalización de gap habitual para BLOSUM62 en este laboratorio
    if (tipoSelect.value === TipoSecuencia.BLOSUM62) gapScoreInput.value = -4;
    actualizarControlesTipo();
    reinitialize();
  });

  // Botones paso a paso (+ / -) para ajuste de puntuaciones
  const stepperButtons = document.querySelectorAll('.stepper-btn');
  stepperButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const step = Number(input.getAttribute('step') || 1);
      let val = Number(input.value || 0);

      if (btn.classList.contains('stepper-btn-inc')) {
        val += step;
      } else if (btn.classList.contains('stepper-btn-dec')) {
        val -= step;
      }

      input.value = val;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      reinitialize();
    });
  });

  // Escuchadores de cambio manual para las entradas de puntuación
  [matchScoreInput, mismatchScoreInput, gapScoreInput].forEach(input => {
    if (input) {
      input.addEventListener('change', () => {
        reinitialize();
      });
    }
  });

  algoSelect.addEventListener('change', () => {
    updateScoringInputs(algoSelect.value);
    actualizarControlesTipo();
    reinitialize();
  });

  calculateButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeView === 'dotplot') return;
    reinitialize();
  });

  btnPrev.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeView === 'dotplot' || !entradaValida) return;
    appState.stepBackward();
  });

  btnNext.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeView === 'dotplot' || !entradaValida) return;
    appState.stepForward();
  });

  btnAutoRun.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeView === 'dotplot' || !entradaValida) return;
    appState.toggleAutoRun();
  });

  btnFinal.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeView === 'dotplot' || !entradaValida) return;
    appState.instantCompute();
  });

  btnReset.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeView === 'dotplot' || !entradaValida) return;
    if (exampleSelect) exampleSelect.value = '';
    appState.reset();
  });

  btnExportCsv.addEventListener('click', (e) => {
    e.preventDefault();
    if (!entradaValida || !appState.engine) return;
    exportarCSV(appState, descripcionPuntaje());
  });

  // Control de vistas (Matriz DP vs Dotplot)

  function renderDotplot() {
    if (!dotplotContainer) return;
    const s1 = (seq1Input.value || '').trim().toUpperCase();
    const s2 = (seq2Input.value || '').trim().toUpperCase();
    if (!s1 || !s2) {
      dotplotContainer.innerHTML = '<div class="empty-msg" style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-weight:500;">Ingrese secuencias válidas para generar el Dotplot.</div>';
      return;
    }
    const w = Number(dotplotWindowInput?.value || 1);
    const t = Number(dotplotThresholdInput?.value || 1);
    const engine = new DotplotEngine(s1, s2, { windowSize: w, threshold: t });
    const data = engine.getData();

    let overlayPath = null;
    if (dotplotOverlayToggle?.checked && appState.optimalPaths && appState.optimalPaths.length > 0) {
      const activePath = appState.optimalPaths[appState.activePathIndex || 0];
      if (activePath && activePath.path) {
        overlayPath = engine.formatOverlayPath(activePath.path);
      }
    }

    DotplotView.render(dotplotContainer, data, { overlayPath });
  }

  function switchView(view) {
    activeView = view;
    if (view === 'dotplot') appState.stopAutoRun();
    actualizarEstadoControles();
    if (view === 'dotplot') {
      if (tabBtnDotplot) {
        tabBtnDotplot.classList.add('active');
        tabBtnDotplot.setAttribute('aria-selected', 'true');
      }
      if (tabBtnMatrix) {
        tabBtnMatrix.classList.remove('active');
        tabBtnMatrix.setAttribute('aria-selected', 'false');
      }
      if (matrixContainer) matrixContainer.style.display = 'none';
      if (dotplotContainer) dotplotContainer.style.display = 'flex';
      if (dotplotParamsGroup) dotplotParamsGroup.style.display = 'block';
      if (viewInstructions) {
        viewInstructions.innerHTML = 'Puntos azules: identidades por ventana &bull; Trazo rojo: camino óptimo';
      }
      renderDotplot();
    } else {
      if (tabBtnMatrix) {
        tabBtnMatrix.classList.add('active');
        tabBtnMatrix.setAttribute('aria-selected', 'true');
      }
      if (tabBtnDotplot) {
        tabBtnDotplot.classList.remove('active');
        tabBtnDotplot.setAttribute('aria-selected', 'false');
      }
      if (dotplotContainer) dotplotContainer.style.display = 'none';
      if (matrixContainer) matrixContainer.style.display = 'flex';
      if (dotplotParamsGroup) dotplotParamsGroup.style.display = 'none';
      if (viewInstructions) {
        viewInstructions.innerHTML = 'Rueda del ratón: zoom &bull; Arrastrar: desplazar &bull; Clic: inspeccionar celda';
      }
    }
  }

  if (tabBtnMatrix) tabBtnMatrix.addEventListener('click', () => switchView('matrix'));
  if (tabBtnDotplot) tabBtnDotplot.addEventListener('click', () => switchView('dotplot'));
  if (dotplotWindowInput) {
    dotplotWindowInput.addEventListener('change', () => { if (activeView === 'dotplot') renderDotplot(); });
  }
  if (dotplotThresholdInput) {
    dotplotThresholdInput.addEventListener('change', () => { if (activeView === 'dotplot') renderDotplot(); });
  }
  if (dotplotOverlayToggle) {
    dotplotOverlayToggle.addEventListener('change', () => { if (activeView === 'dotplot') renderDotplot(); });
  }

  // Auto-adaptación reactiva a redimensionamientos del contenedor
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      if (activeView === 'dotplot') renderDotplot();
    });
    if (window.ResizeObserver && dotplotContainer) {
      const ro = new ResizeObserver(() => {
        if (activeView === 'dotplot') renderDotplot();
      });
      ro.observe(dotplotContainer);
    }
  }

  btnExportPng.addEventListener('click', (e) => {
    e.preventDefault();
    if (!entradaValida) return;
    if (activeView === 'dotplot') {
      const s1 = (seq1Input.value || '').trim().toUpperCase();
      const s2 = (seq2Input.value || '').trim().toUpperCase();
      const w = Number(dotplotWindowInput?.value || 1);
      const t = Number(dotplotThresholdInput?.value || 1);
      const engine = new DotplotEngine(s1, s2, { windowSize: w, threshold: t });
      const data = engine.getData();
      let overlayPath = null;
      if (dotplotOverlayToggle?.checked && appState.optimalPaths && appState.optimalPaths.length > 0) {
        const activePath = appState.optimalPaths[appState.activePathIndex || 0];
        if (activePath && activePath.path) {
          overlayPath = engine.formatOverlayPath(activePath.path);
        }
      }
      DotplotView.exportToPng(data, { overlayPath });
      return;
    }
    if (!appState.engine) return;
    const svg = document.querySelector('#matrix-canvas-container svg');
    const puntaje = appState.optimalPaths.length > 0 ? ` | Puntaje ${appState.optimalPaths[0].score}` : '';
    exportarPNG(svg, appState, `${algoDisplayNames[appState.algorithm]} | ${appState.seq1} / ${appState.seq2}${puntaje}`);
  });

  speedSlider.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    speedLabel.textContent = val >= 1000 ? `${val / 1000}s` : `${val}ms`;
    appState.setSpeed(val);
  });

  // Diccionario de ejemplos canónicos preconfigurados
  const CANONICAL_EXAMPLES = {
    tc1: { s1: 'AGTC', s2: 'AGTC', algo: 'NW' },
    tc2: { s1: 'AGTC', s2: 'AGAC', algo: 'NW' },
    tc3: { s1: 'AGTC', s2: 'AGC', algo: 'NW' },
    tc4: { s1: 'ACGTACGT', s2: 'CG', algo: 'NW' },
    tc5: { s1: 'AAAA', s2: 'CCCC', algo: 'NW' },
    tc6: { s1: 'AGC', s2: 'ACG', algo: 'NW' },
    ex_gdle: { s1: 'GDLE', s2: 'GGLED', algo: 'NW', tipo: TipoSecuencia.PROTEINA },
    ex_gaccta: { s1: 'GACCTA', s2: 'GGTACC', algo: 'NW' },
    ex_blosum: { s1: 'HEAGAWGHEE', s2: 'PAWHEAE', algo: 'NW', tipo: TipoSecuencia.BLOSUM62, gap: -4 }
  };

  // Selector desplegable de ejemplos canónicos
  if (exampleSelect) {
    exampleSelect.addEventListener('change', () => {
      const selectedKey = exampleSelect.value;
      const example = CANONICAL_EXAMPLES[selectedKey];
      if (!example) return;

      seq1Input.value = example.s1;
      seq2Input.value = example.s2;
      if (example.algo) {
        algoSelect.value = example.algo;
        updateScoringInputs(example.algo);
      }
      tipoSelect.value = example.tipo || TipoSecuencia.ADN;
      if (example.gap !== undefined) gapScoreInput.value = example.gap;
      actualizarControlesTipo();
      reinitialize();
    });
  }

  // Atajos de teclado (Espacio: auto-ejecutar, Flecha Derecha: siguiente, Flecha Izquierda: anterior)
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (activeView === 'dotplot' || !entradaValida) return;
    if (e.code === 'Space') {
      e.preventDefault();
      appState.toggleAutoRun();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      appState.stepForward();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      appState.stepBackward();
    }
  });

  // Inicialización y primer renderizado
  updateScoringInputs(algoSelect.value);
  actualizarControlesTipo();
  reinitialize();
});
