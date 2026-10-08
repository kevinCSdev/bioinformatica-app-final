import { AlgorithmType } from './Types.js';

/**
 * Validación de la entrada antes de construir la matriz
 * (aporte del grupo Cata-Anto, extendido con el tipo de secuencia).
 *
 * Sin validación, la aplicación acepta dígitos, signos y campos vacíos y
 * construye una matriz sin sentido biológico sin advertir al usuario.
 */

export const LARGO_MAXIMO = 20;

export const TipoSecuencia = Object.freeze({
  ADN: 'adn',             // ADN/ARN con puntaje simple
  PROTEINA: 'proteina',   // Proteína con puntaje simple
  BLOSUM62: 'blosum62'    // Proteína con matriz BLOSUM62 (solo NW y SW)
});

const ALFABETOS = {
  [TipoSecuencia.ADN]: {
    patron: /^[ACGTU]+$/,
    descripcion: 'nucleótidos A, C, G, T y U'
  },
  [TipoSecuencia.PROTEINA]: {
    patron: /^[ACDEFGHIKLMNPQRSTVWY]+$/,
    descripcion: 'los 20 aminoácidos estándar (A C D E F G H I K L M N P Q R S T V W Y)'
  },
  [TipoSecuencia.BLOSUM62]: {
    patron: /^[ACDEFGHIKLMNPQRSTVWY]+$/,
    descripcion: 'los 20 aminoácidos estándar (A C D E F G H I K L M N P Q R S T V W Y)'
  }
};

/**
 * @param {Object} entrada
 * @param {string} entrada.seq1
 * @param {string} entrada.seq2
 * @param {string} entrada.algorithm - 'NW' | 'SW' | 'ED' | 'LCS'
 * @param {string} entrada.tipo - valor de TipoSecuencia
 * @param {Object} entrada.params - { matchScore, mismatchScore, gapScore } como texto del formulario
 * @returns {Array<{campo: string, texto: string}>} lista vacía si la entrada es válida
 */
export function validarEntrada({ seq1 = '', seq2 = '', algorithm, tipo = TipoSecuencia.ADN, params = {} }) {
  const errores = [];
  const secuencias = [
    { campo: 'seq_1', nombre: 'Secuencia 1', valor: seq1.trim().toUpperCase() },
    { campo: 'seq_2', nombre: 'Secuencia 2', valor: seq2.trim().toUpperCase() }
  ];
  const alfabeto = ALFABETOS[tipo] || ALFABETOS[TipoSecuencia.ADN];

  for (const s of secuencias) {
    if (s.valor === '') {
      errores.push({ campo: s.campo, texto: `La ${s.nombre} está vacía.` });
      continue;
    }
    if (!alfabeto.patron.test(s.valor)) {
      errores.push({
        campo: s.campo,
        texto: `La ${s.nombre} contiene caracteres no válidos. Solo se aceptan ${alfabeto.descripcion}.`
      });
    }
    // El atributo maxlength del input puede eludirse desde la consola
    if (s.valor.length > LARGO_MAXIMO) {
      errores.push({ campo: s.campo, texto: `La ${s.nombre} supera los ${LARGO_MAXIMO} caracteres.` });
    }
  }

  if (tipo === TipoSecuencia.BLOSUM62 &&
      algorithm !== AlgorithmType.NEEDLEMAN_WUNSCH && algorithm !== AlgorithmType.SMITH_WATERMAN) {
    errores.push({ campo: 'tipo-select', texto: 'BLOSUM62 solo se aplica a Needleman-Wunsch y Smith-Waterman.' });
  }

  // LCS no usa parámetros de puntaje
  if (algorithm === AlgorithmType.LCS) return errores;

  const esDistancia = algorithm === AlgorithmType.WAGNER_FISCHER;
  const parametros = [
    { id: 'matchScore', nombre: esDistancia ? 'costo de coincidencia' : 'coincidencia' },
    { id: 'mismatchScore', nombre: esDistancia ? 'costo de sustitución' : 'discrepancia' },
    { id: 'gapScore', nombre: esDistancia ? 'costo indel' : 'gap' }
  ];
  // Con BLOSUM62 la matriz reemplaza a coincidencia y discrepancia
  const aRevisar = tipo === TipoSecuencia.BLOSUM62 ? parametros.slice(2) : parametros;

  for (const p of aRevisar) {
    const texto = String(params[p.id] ?? '').trim();
    if (texto === '' || !/^-?\d+$/.test(texto)) {
      errores.push({ campo: p.id, texto: `El puntaje de ${p.nombre} debe ser un número entero.` });
    } else if (esDistancia && Number(texto) < 0) {
      errores.push({ campo: p.id, texto: `El ${p.nombre} no puede ser negativo en la distancia de edición.` });
    }
  }

  return errores;
}
