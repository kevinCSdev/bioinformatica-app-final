import assert from 'assert';
import { AMINO_ACIDS, filterAminoAcids } from '../js/core/AminoAcids.js';
import { validarEntrada, TipoSecuencia } from '../js/core/Validacion.js';

const letters = entries => entries.map(entry => entry.letter);
assert.strictEqual(AMINO_ACIDS.length, 20);
assert.strictEqual(new Set(letters(AMINO_ACIDS)).size, 20);
assert.strictEqual(letters(AMINO_ACIDS).join(''), 'ACDEFGHIKLMNPQRSTVWY');
assert.strictEqual(new Set(AMINO_ACIDS.map(entry => entry.code3)).size, 20);
assert.ok(Object.isFrozen(AMINO_ACIDS));
for (const entry of AMINO_ACIDS) {
  assert.ok(Object.isFrozen(entry));
  assert.match(entry.code3, /^[A-Z][a-z]{2}$/);
  assert.ok(entry.name.length > 0 && entry.category.length > 0);
  for (const field of ['letter', 'code3', 'name', 'category']) {
    assert.ok(filterAminoAcids(entry[field]).includes(entry), `Búsqueda por ${field}: ${entry.letter}`);
  }
}
assert.strictEqual(AMINO_ACIDS.find(entry => entry.letter === 'N').name, 'Asparagina');
assert.throws(() => { AMINO_ACIDS[0].name = 'Otro'; }, TypeError);
assert.throws(() => { AMINO_ACIDS.push({}); }, TypeError);

assert.deepStrictEqual(filterAminoAcids(), AMINO_ACIDS);
assert.deepStrictEqual(filterAminoAcids('  '), AMINO_ACIDS);
assert.deepStrictEqual(letters(filterAminoAcids('w')), ['W']);
assert.deepStrictEqual(letters(filterAminoAcids(' tRp ')), ['W']);
assert.deepStrictEqual(letters(filterAminoAcids('FANO')), ['W']);
assert.deepStrictEqual(letters(filterAminoAcids('ACIDO')), ['D', 'E']);
assert.deepStrictEqual(letters(filterAminoAcids('a\u0301CIDO')), ['D', 'E']);
assert.deepStrictEqual(letters(filterAminoAcids('BÁSICO')), ['H', 'K', 'R']);
assert.deepStrictEqual(letters(filterAminoAcids('amida')), ['N', 'Q']);
assert.deepStrictEqual(filterAminoAcids('sin coincidencias'), []);
assert.deepStrictEqual(filterAminoAcids('Ala Alifático'), [], 'No concatenar campos en la búsqueda');
const result = filterAminoAcids();
result.pop();
assert.strictEqual(AMINO_ACIDS.length, 20, 'El resultado no modifica el catálogo');

for (const tipo of [TipoSecuencia.PROTEINA, TipoSecuencia.BLOSUM62]) {
  const accepted = [];
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const errors = validarEntrada({ seq1: letter, seq2: 'A', algorithm: 'NW', tipo,
      params: { matchScore: '1', mismatchScore: '-1', gapScore: '-2' } });
    if (!errors.some(error => error.campo === 'seq_1')) accepted.push(letter);
  }
  assert.deepStrictEqual(letters(AMINO_ACIDS), accepted, `Alfabeto compatible con ${tipo}`);
}
console.log('Protein catalog tests PASSED!');
