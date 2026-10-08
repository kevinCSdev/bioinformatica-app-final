import { Direction, DefaultScoring, AlgorithmType, SubstitutionType } from './Types.js';
import { puntajeBlosum62 } from './Blosum62.js';

/**
 * Motor de alineamiento puro basado en Programación Dinámica.
 * Soporta Needleman-Wunsch (NW), Smith-Waterman (SW),
 * Distancia de Edición Wagner-Fischer (ED) y Subsecuencia Común más Larga (LCS).
 * 
 * Aplica resolución determinista de empates (Diagonal > Superior > Lateral)
 * y representación de secuencias en sentido 5' a 3'.
 */
export class AlignmentEngine {
  /**
   * @param {string} seq1 - Secuencia 1 (mapeada a las filas, índice i)
   * @param {string} seq2 - Secuencia 2 (mapeada a las columnas, índice j)
   * @param {Object} scoring - Parámetros de puntuación
   * @param {string} algorithm - 'NW' | 'SW' | 'ED' | 'LCS'
   */
  constructor(seq1, seq2, scoring = {}, algorithm = AlgorithmType.NEEDLEMAN_WUNSCH) {
    this.seq1 = (seq1 || '').toUpperCase();
    this.seq2 = (seq2 || '').toUpperCase();
    this.n = this.seq1.length;
    this.m = this.seq2.length;
    this.algorithm = algorithm;

    // Normalizar parámetros de puntuación con valores por defecto
    const defaults = DefaultScoring[algorithm] || DefaultScoring.NW;
    this.scoring = { ...defaults, ...scoring };

    // Inicializar estructuras de datos de programación dinámica
    this.matrix = Array.from({ length: this.n + 1 }, () => Array(this.m + 1).fill(null));
    this.directions = Array.from({ length: this.n + 1 }, () => Array(this.m + 1).fill(Direction.NONE));
    this.cellDetails = Array.from({ length: this.n + 1 }, () => Array(this.m + 1).fill(null));

    this.maxScore = 0;
    this.maxCells = [];
    this.isInitialized = false;
    this.isCompleted = false;
  }

  /**
   * Puntaje de sustitución entre dos caracteres para NW y SW:
   * BLOSUM62 si está activa, si no match/mismatch simple.
   */
  _pesoSustitucion(a, b) {
    if (this.scoring.substitution === SubstitutionType.BLOSUM62) {
      const valor = puntajeBlosum62(a, b);
      if (valor !== null) return valor;
    }
    return a === b ? this.scoring.match : this.scoring.mismatch;
  }

  /**
   * Inicializa los casos base de la matriz (fila 0 y columna 0)
   */
  initMatrix() {
    const { gap = -2, indelCost = 1 } = this.scoring;
    this.matrix[0][0] = 0;
    this.directions[0][0] = Direction.NONE;
    this.cellDetails[0][0] = {
      i: 0,
      j: 0,
      score: 0,
      isBoundary: true,
      directions: Direction.NONE,
      description: 'Origin base case'
    };

    if (this.algorithm === AlgorithmType.NEEDLEMAN_WUNSCH) {
      for (let i = 1; i <= this.n; i++) {
        this.matrix[i][0] = i * gap;
        this.directions[i][0] = Direction.SUPERIOR;
        this.cellDetails[i][0] = {
          i,
          j: 0,
          score: i * gap,
          isBoundary: true,
          directions: Direction.SUPERIOR,
          candidateUp: (i - 1) * gap + gap,
          description: `Row 0 boundary: ${i} * gap`
        };
      }
      for (let j = 1; j <= this.m; j++) {
        this.matrix[0][j] = j * gap;
        this.directions[0][j] = Direction.LATERAL;
        this.cellDetails[0][j] = {
          i: 0,
          j,
          score: j * gap,
          isBoundary: true,
          directions: Direction.LATERAL,
          candidateLeft: (j - 1) * gap + gap,
          description: `Col 0 boundary: ${j} * gap`
        };
      }
    } else if (this.algorithm === AlgorithmType.SMITH_WATERMAN) {
      for (let i = 1; i <= this.n; i++) {
        this.matrix[i][0] = 0;
        this.directions[i][0] = Direction.ZERO;
        this.cellDetails[i][0] = {
          i,
          j: 0,
          score: 0,
          isBoundary: true,
          directions: Direction.ZERO,
          description: 'Local alignment 0 boundary'
        };
      }
      for (let j = 1; j <= this.m; j++) {
        this.matrix[0][j] = 0;
        this.directions[0][j] = Direction.ZERO;
        this.cellDetails[0][j] = {
          i: 0,
          j,
          score: 0,
          isBoundary: true,
          directions: Direction.ZERO,
          description: 'Local alignment 0 boundary'
        };
      }
      this.maxScore = 0;
      this.maxCells = [];
    } else if (this.algorithm === AlgorithmType.WAGNER_FISCHER) {
      for (let i = 1; i <= this.n; i++) {
        this.matrix[i][0] = i * indelCost;
        this.directions[i][0] = Direction.SUPERIOR;
        this.cellDetails[i][0] = {
          i,
          j: 0,
          score: i * indelCost,
          isBoundary: true,
          directions: Direction.SUPERIOR,
          candidateUp: (i - 1) * indelCost + indelCost,
          description: `Edit distance insertion: ${i} * indel`
        };
      }
      for (let j = 1; j <= this.m; j++) {
        this.matrix[0][j] = j * indelCost;
        this.directions[0][j] = Direction.LATERAL;
        this.cellDetails[0][j] = {
          i: 0,
          j,
          score: j * indelCost,
          isBoundary: true,
          directions: Direction.LATERAL,
          candidateLeft: (j - 1) * indelCost + indelCost,
          description: `Edit distance deletion: ${j} * indel`
        };
      }
    } else if (this.algorithm === AlgorithmType.LCS) {
      for (let i = 1; i <= this.n; i++) {
        this.matrix[i][0] = 0;
        this.directions[i][0] = Direction.SUPERIOR;
        this.cellDetails[i][0] = {
          i,
          j: 0,
          score: 0,
          isBoundary: true,
          directions: Direction.SUPERIOR,
          description: 'LCS base case'
        };
      }
      for (let j = 1; j <= this.m; j++) {
        this.matrix[0][j] = 0;
        this.directions[0][j] = Direction.LATERAL;
        this.cellDetails[0][j] = {
          i: 0,
          j,
          score: 0,
          isBoundary: true,
          directions: Direction.LATERAL,
          description: 'LCS base case'
        };
      }
    }

    // Reiniciar explícitamente las celdas internas (i >= 1, j >= 1) a null
    for (let i = 1; i <= this.n; i++) {
      for (let j = 1; j <= this.m; j++) {
        this.matrix[i][j] = null;
        this.directions[i][j] = Direction.NONE;
        this.cellDetails[i][j] = null;
      }
    }

    this.isCompleted = false;
    this.maxScore = 0;
    this.maxCells = [];
    this.isInitialized = true;
    return this;
  }

  /**
   * Calcula una única celda interna (i, j)
   * @param {number} i - Índice de fila (1 a n)
   * @param {number} j - Índice de columna (1 a m)
   * @returns {Object} Resultado de la celda { i, j, score, directions, details }
   */
  computeCell(i, j) {
    if (!this.isInitialized) {
      this.initMatrix();
    }

    const s1Char = this.seq1[i - 1];
    const s2Char = this.seq2[j - 1];
    const isMatch = s1Char === s2Char;

    let score = 0;
    let dirMask = Direction.NONE;
    let details = {
      i,
      j,
      s1Char,
      s2Char,
      isMatch,
      isBoundary: false,
      algorithm: this.algorithm
    };

    if (this.algorithm === AlgorithmType.NEEDLEMAN_WUNSCH) {
      const { gap = -2 } = this.scoring;
      const diagVal = this.matrix[i - 1][j - 1];
      const upVal = this.matrix[i - 1][j];
      const leftVal = this.matrix[i][j - 1];

      const matchWeight = this._pesoSustitucion(s1Char, s2Char);
      const candidateDiag = diagVal + matchWeight;
      const candidateUp = upVal + gap;
      const candidateLeft = leftVal + gap;
      score = Math.max(candidateDiag, candidateUp, candidateLeft);

      if (candidateDiag === score) dirMask |= Direction.DIAGONAL;
      if (candidateUp === score) dirMask |= Direction.SUPERIOR;
      if (candidateLeft === score) dirMask |= Direction.LATERAL;

      details = {
        ...details,
        score,
        diagVal,
        upVal,
        leftVal,
        candidateDiag,
        candidateUp,
        candidateLeft,
        matchWeight,
        substitution: this.scoring.substitution || SubstitutionType.SIMPLE,
        gapWeight: gap
      };
    } else if (this.algorithm === AlgorithmType.SMITH_WATERMAN) {
      const { gap = -2 } = this.scoring;
      const diagVal = this.matrix[i - 1][j - 1];
      const upVal = this.matrix[i - 1][j];
      const leftVal = this.matrix[i][j - 1];

      const matchWeight = this._pesoSustitucion(s1Char, s2Char);
      const candidateDiag = diagVal + matchWeight;
      const candidateUp = upVal + gap;
      const candidateLeft = leftVal + gap;
      const maxCandidate = Math.max(candidateDiag, candidateUp, candidateLeft);
      score = Math.max(0, maxCandidate);

      if (score === 0) {
        dirMask |= Direction.ZERO;
      } else {
        if (candidateDiag === score) dirMask |= Direction.DIAGONAL;
        if (candidateUp === score) dirMask |= Direction.SUPERIOR;
        if (candidateLeft === score) dirMask |= Direction.LATERAL;
      }

      if (score > this.maxScore) {
        this.maxScore = score;
        this.maxCells = [[i, j]];
      } else if (score === this.maxScore && score > 0) {
        this.maxCells.push([i, j]);
      }

      details = {
        ...details,
        score,
        diagVal,
        upVal,
        leftVal,
        candidateDiag,
        candidateUp,
        candidateLeft,
        matchWeight,
        substitution: this.scoring.substitution || SubstitutionType.SIMPLE,
        gapWeight: gap
      };
    } else if (this.algorithm === AlgorithmType.WAGNER_FISCHER) {
      const { matchCost = 0, subCost = 1, indelCost = 1 } = this.scoring;
      const diagVal = this.matrix[i - 1][j - 1];
      const upVal = this.matrix[i - 1][j];
      const leftVal = this.matrix[i][j - 1];

      const candidateDiag = diagVal + (isMatch ? matchCost : subCost);
      const candidateUp = upVal + indelCost;
      const candidateLeft = leftVal + indelCost;
      score = Math.min(candidateDiag, candidateUp, candidateLeft);

      if (candidateDiag === score) dirMask |= Direction.DIAGONAL;
      if (candidateUp === score) dirMask |= Direction.SUPERIOR;
      if (candidateLeft === score) dirMask |= Direction.LATERAL;

      details = {
        ...details,
        score,
        diagVal,
        upVal,
        leftVal,
        candidateDiag,
        candidateUp,
        candidateLeft,
        matchWeight: isMatch ? matchCost : subCost,
        gapWeight: indelCost
      };
    } else if (this.algorithm === AlgorithmType.LCS) {
      const diagVal = this.matrix[i - 1][j - 1];
      const upVal = this.matrix[i - 1][j];
      const leftVal = this.matrix[i][j - 1];

      if (isMatch) {
        score = diagVal + 1;
        dirMask |= Direction.DIAGONAL;
      } else {
        score = Math.max(upVal, leftVal);
        if (upVal >= leftVal) dirMask |= Direction.SUPERIOR;
        if (leftVal >= upVal) dirMask |= Direction.LATERAL;
      }

      details = {
        ...details,
        score,
        diagVal,
        upVal,
        leftVal,
        candidateDiag: diagVal + 1,
        candidateUp: upVal,
        candidateLeft: leftVal
      };
    }

    this.matrix[i][j] = score;
    this.directions[i][j] = dirMask;
    this.cellDetails[i][j] = details;

    return {
      i,
      j,
      score,
      directions: dirMask,
      details
    };
  }

  /**
   * Calcula la matriz completa de manera sincrónica
   */
  computeAll() {
    this.initMatrix();
    for (let i = 1; i <= this.n; i++) {
      for (let j = 1; j <= this.m; j++) {
        this.computeCell(i, j);
      }
    }
    this.isCompleted = true;
    return this;
  }

  /**
   * Retorna el orden secuencial de todas las coordenadas de celdas internas a calcular
   * @returns {Array<{i: number, j: number}>}
   */
  getCellOrder() {
    const order = [];
    for (let i = 1; i <= this.n; i++) {
      for (let j = 1; j <= this.m; j++) {
        order.push({ i, j });
      }
    }
    return order;
  }

  /**
   * Generador que produce el cálculo de cada celda de forma secuencial
   */
  *stepGenerator() {
    if (!this.isInitialized) {
      this.initMatrix();
    }
    for (let i = 1; i <= this.n; i++) {
      for (let j = 1; j <= this.m; j++) {
        yield this.computeCell(i, j);
      }
    }
    this.isCompleted = true;
  }

  /**
   * Obtiene la puntuación óptima del alineamiento
   */
  getScore() {
    if (this.algorithm === AlgorithmType.SMITH_WATERMAN) {
      return this.maxScore;
    }
    return this.matrix[this.n][this.m];
  }

  /**
   * Obtiene la matriz bidimensional de puntuaciones
   */
  getMatrix() {
    return this.matrix;
  }

  /**
   * Obtiene la matriz bidimensional de máscaras de bits de dirección
   */
  getDirections() {
    return this.directions;
  }

  /**
   * Obtiene los detalles matemáticos de una celda específica
   */
  getCellDetails(i, j) {
    return this.cellDetails[i][j];
  }

  /**
   * Encuentra los caminos óptimos de traceback aplicando prioridad estricta de desempate:
   * Diagonal > Superior > Lateral.
   * 
   * Retorna una lista de objetos AlignedPath orientados en sentido 5' a 3'.
   * @param {number} maxPaths - Número máximo de caminos distintos a extraer
   * @returns {Array<Object>}
   */
  findOptimalPaths(maxPaths = 10) {
    if (!this.isCompleted) {
      this.computeAll();
    }

    if (this.algorithm === AlgorithmType.SMITH_WATERMAN) {
      if (this.maxScore === 0) {
        return [{
          alignment_s1: '',
          alignment_s2: '',
          lcs_string: '',
          score: 0,
          steps: [],
          path: [],
          max_cell: null
        }];
      }

      // Recolectar caminos óptimos desde cada celda con puntuación máxima
      const results = [];
      for (const [startI, startJ] of this.maxCells) {
        const path = this._tracebackSW(startI, startJ);
        results.push(path);
        if (results.length >= maxPaths) break;
      }
      return results;
    }

    // En NW, ED y LCS: el traceback inicia siempre en (n, m)
    const primaryPath = this._tracebackGlobal(this.n, this.m);
    const results = [primaryPath];

    // Verificar si existen caminos alternativos por ramificación de empates
    if (maxPaths > 1) {
      const allPaths = [];
      this._findBranchPaths(this.n, this.m, [], allPaths, maxPaths);
      for (const branch of allPaths) {
        const mat = this.materializeAlignment(branch);
        // Evitar duplicar el camino principal ya registrado
        if (mat.alignment_s1 !== primaryPath.alignment_s1 || mat.alignment_s2 !== primaryPath.alignment_s2) {
          results.push(mat);
          if (results.length >= maxPaths) break;
        }
      }
    }

    return results;
  }

  /**
   * Traceback para NW, ED y LCS desde (n, m) con prioridad estricta:
   * Diagonal > Superior > Lateral
   */
  _tracebackGlobal(startI, startJ) {
    let i = startI;
    let j = startJ;
    const steps = [];
    const pathCoords = [{ i, j }];

    if (this.algorithm === AlgorithmType.LCS) {
      const lcsChars = [];
      const al1 = [];
      const al2 = [];

      while (i > 0 && j > 0) {
        if (this.seq1[i - 1] === this.seq2[j - 1]) {
          lcsChars.push(this.seq1[i - 1]);
          al1.push(this.seq1[i - 1]);
          al2.push(this.seq2[j - 1]);
          steps.push('diagonal');
          i--;
          j--;
        } else if (this.matrix[i - 1][j] >= this.matrix[i][j - 1]) {
          al1.push(this.seq1[i - 1]);
          al2.push('-');
          steps.push('superior');
          i--;
        } else {
          al1.push('-');
          al2.push(this.seq2[j - 1]);
          steps.push('lateral');
          j--;
        }
        pathCoords.push({ i, j });
      }

      while (i > 0) {
        al1.push(this.seq1[i - 1]);
        al2.push('-');
        steps.push('superior');
        i--;
        pathCoords.push({ i, j });
      }

      while (j > 0) {
        al1.push('-');
        al2.push(this.seq2[j - 1]);
        steps.push('lateral');
        j--;
        pathCoords.push({ i, j });
      }

      return {
        alignment_s1: al1.reverse().join(''),
        alignment_s2: al2.reverse().join(''),
        lcs_string: lcsChars.reverse().join(''),
        score: this.matrix[startI][startJ],
        steps: steps.reverse(),
        path: pathCoords.reverse()
      };
    }

    // Traceback para Needleman-Wunsch y Wagner-Fischer
    const { gap = -2, matchCost = 0, subCost = 1, indelCost = 1 } = this.scoring;
    const al1 = [];
    const al2 = [];

    while (i > 0 || j > 0) {
      const curr = this.matrix[i][j];

      if (this.algorithm === AlgorithmType.NEEDLEMAN_WUNSCH) {
        const isDiag = (i > 0 && j > 0 && curr === this.matrix[i - 1][j - 1] + this._pesoSustitucion(this.seq1[i - 1], this.seq2[j - 1]));
        const isUp = (i > 0 && curr === this.matrix[i - 1][j] + gap);

        if (isDiag) {
          al1.push(this.seq1[i - 1]);
          al2.push(this.seq2[j - 1]);
          steps.push('diagonal');
          i--;
          j--;
        } else if (isUp) {
          al1.push(this.seq1[i - 1]);
          al2.push('-');
          steps.push('superior');
          i--;
        } else {
          al1.push('-');
          al2.push(this.seq2[j - 1]);
          steps.push('lateral');
          j--;
        }
      } else if (this.algorithm === AlgorithmType.WAGNER_FISCHER) {
        const costDiag = (i > 0 && j > 0) ? this.matrix[i - 1][j - 1] + (this.seq1[i - 1] === this.seq2[j - 1] ? matchCost : subCost) : null;
        const costUp = (i > 0) ? this.matrix[i - 1][j] + indelCost : null;

        if (costDiag !== null && curr === costDiag) {
          al1.push(this.seq1[i - 1]);
          al2.push(this.seq2[j - 1]);
          steps.push('diagonal');
          i--;
          j--;
        } else if (costUp !== null && curr === costUp) {
          al1.push(this.seq1[i - 1]);
          al2.push('-');
          steps.push('superior');
          i--;
        } else {
          al1.push('-');
          al2.push(this.seq2[j - 1]);
          steps.push('lateral');
          j--;
        }
      }
      pathCoords.push({ i, j });
    }

    return {
      alignment_s1: al1.reverse().join(''),
      alignment_s2: al2.reverse().join(''),
      lcs_string: '',
      score: this.matrix[startI][startJ],
      steps: steps.reverse(),
      path: pathCoords.reverse()
    };
  }

  /**
   * Traceback de Smith-Waterman a partir de la celda de valor máximo local
   */
  _tracebackSW(startI, startJ) {
    let i = startI;
    let j = startJ;
    const { gap = -2 } = this.scoring;
    const al1 = [];
    const al2 = [];
    const steps = [];
    const pathCoords = [{ i, j }];

    while (i > 0 && j > 0 && this.matrix[i][j] > 0) {
      const curr = this.matrix[i][j];
      const isDiag = (curr === this.matrix[i - 1][j - 1] + this._pesoSustitucion(this.seq1[i - 1], this.seq2[j - 1]));
      const isUp = (curr === this.matrix[i - 1][j] + gap);
      const isLeft = (curr === this.matrix[i][j - 1] + gap);

      if (isDiag) {
        al1.push(this.seq1[i - 1]);
        al2.push(this.seq2[j - 1]);
        steps.push('diagonal');
        i--;
        j--;
      } else if (isUp) {
        al1.push(this.seq1[i - 1]);
        al2.push('-');
        steps.push('superior');
        i--;
      } else if (isLeft) {
        al1.push('-');
        al2.push(this.seq2[j - 1]);
        steps.push('lateral');
        j--;
      } else {
        break;
      }
      pathCoords.push({ i, j });
    }

    return {
      alignment_s1: al1.reverse().join(''),
      alignment_s2: al2.reverse().join(''),
      lcs_string: '',
      score: this.matrix[startI][startJ],
      steps: steps.reverse(),
      path: pathCoords.reverse(),
      max_cell: [startI, startJ]
    };
  }

  /**
   * Explorador recursivo de ramificaciones para extraer múltiples caminos óptimos
   */
  _findBranchPaths(i, j, currentSteps, allPaths, maxPaths) {
    if (allPaths.length >= maxPaths) return;

    if (i === 0 && j === 0) {
      allPaths.push([...currentSteps]);
      return;
    }

    const dirMask = this.directions[i][j];

    // Prioridad estricta: primero Diagonal, luego Superior, finalmente Lateral
    if (i > 0 && j > 0 && (dirMask & Direction.DIAGONAL)) {
      currentSteps.push({ dir: 'diagonal', i, j, char1: this.seq1[i - 1], char2: this.seq2[j - 1] });
      this._findBranchPaths(i - 1, j - 1, currentSteps, allPaths, maxPaths);
      currentSteps.pop();
    }

    if (i > 0 && (dirMask & Direction.SUPERIOR)) {
      currentSteps.push({ dir: 'superior', i, j, char1: this.seq1[i - 1], char2: '-' });
      this._findBranchPaths(i - 1, j, currentSteps, allPaths, maxPaths);
      currentSteps.pop();
    }

    if (j > 0 && (dirMask & Direction.LATERAL)) {
      currentSteps.push({ dir: 'lateral', i, j, char1: '-', char2: this.seq2[j - 1] });
      this._findBranchPaths(i, j - 1, currentSteps, allPaths, maxPaths);
      currentSteps.pop();
    }
  }

  /**
   * Materializa las secuencias de alineamiento resultantes en sentido biológico 5' a 3'
   */
  materializeAlignment(stepList) {
    let s1 = '';
    let s2 = '';
    let lcs = '';
    const steps = [];
    const path = [];

    // stepList se construyó desde (n, m) hacia (0, 0), por lo que se invierte
    for (let k = stepList.length - 1; k >= 0; k--) {
      const step = stepList[k];
      s1 += step.char1;
      s2 += step.char2;
      if (step.dir === 'diagonal' && step.char1 === step.char2) {
        lcs += step.char1;
      }
      steps.push(step.dir);
      path.push({ i: step.i, j: step.j });
    }

    return {
      alignment_s1: s1,
      alignment_s2: s2,
      lcs_string: lcs,
      score: this.getScore(),
      steps,
      path
    };
  }
}
