import assert from 'assert';
import { validarEntrada, TipoSecuencia } from '../js/core/Validacion.js';

console.log('=== [Validación de entrada] ===\n');

const params = { matchScore: '1', mismatchScore: '-1', gapScore: '-2' };
const base = { seq1: 'AAG', seq2: 'AGT', algorithm: 'NW', tipo: TipoSecuencia.ADN, params };
const campos = errores => errores.map(e => e.campo);

assert.deepStrictEqual(validarEntrada(base), [], 'Entrada válida sin errores');
assert.deepStrictEqual(validarEntrada({ ...base, seq1: 'acgu' }), [], 'Minúsculas y ARN aceptados');
console.log('  [PASS] Entrada válida de ADN/ARN');

assert.deepStrictEqual(campos(validarEntrada({ ...base, seq1: '', seq2: '  ' })), ['seq_1', 'seq_2']);
console.log('  [PASS] Secuencias vacías rechazadas');

assert.deepStrictEqual(campos(validarEntrada({ ...base, seq1: 'A1G' })), ['seq_1']);
assert.deepStrictEqual(campos(validarEntrada({ ...base, seq2: 'GDLE' })), ['seq_2'], 'Aminoácidos no son ADN');
console.log('  [PASS] Caracteres fuera del alfabeto de ADN/ARN rechazados');

assert.deepStrictEqual(validarEntrada({ ...base, seq1: 'GDLE', seq2: 'GGLED', tipo: TipoSecuencia.PROTEINA }), []);
assert.deepStrictEqual(campos(validarEntrada({ ...base, seq1: 'GDLX', tipo: TipoSecuencia.PROTEINA })), ['seq_1']);
console.log('  [PASS] Alfabeto de proteínas (20 aminoácidos estándar)');

assert.deepStrictEqual(campos(validarEntrada({ ...base, seq1: 'A'.repeat(21) })), ['seq_1']);
console.log('  [PASS] Largo máximo de 20 caracteres');

assert.deepStrictEqual(campos(validarEntrada({ ...base, params: { ...params, gapScore: '' } })), ['gapScore']);
assert.deepStrictEqual(campos(validarEntrada({ ...base, params: { ...params, matchScore: '1.5' } })), ['matchScore']);
assert.deepStrictEqual(campos(validarEntrada({ ...base, params: { ...params, mismatchScore: 'x' } })), ['mismatchScore']);
console.log('  [PASS] Parámetros vacíos o no enteros rechazados');

assert.deepStrictEqual(campos(validarEntrada({ ...base, algorithm: 'ED', params: { matchScore: '0', mismatchScore: '-1', gapScore: '1' } })), ['mismatchScore']);
console.log('  [PASS] Costos negativos rechazados en distancia de edición');

const blosum = { ...base, seq1: 'HEAGAWGHEE', seq2: 'PAWHEAE', tipo: TipoSecuencia.BLOSUM62 };
assert.deepStrictEqual(validarEntrada({ ...blosum, params: { matchScore: '', mismatchScore: '', gapScore: '-4' } }), [],
  'Con BLOSUM62 no se exigen coincidencia ni discrepancia');
assert.deepStrictEqual(campos(validarEntrada({ ...blosum, algorithm: 'LCS' })), ['tipo-select']);
console.log('  [PASS] BLOSUM62 solo con NW/SW e ignora match/mismatch');

assert.deepStrictEqual(validarEntrada({ ...base, algorithm: 'LCS', params: {} }), []);
console.log('  [PASS] LCS no requiere parámetros de puntaje');

console.log('\nValidación tests PASSED!');
