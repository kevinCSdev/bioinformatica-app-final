import assert from 'assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AlignmentEngine } from '../js/core/AlignmentEngine.js';
import { puntajeBlosum62, ALFABETO_BLOSUM62 } from '../js/core/Blosum62.js';
import { AlgorithmType, SubstitutionType } from '../js/core/Types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Generado con tests/oraculo/test_suite_alignment.js (proteinAlignmentCompare)
const oraculo = JSON.parse(readFileSync(join(__dirname, 'oraculo/blosum62_oraculo.json'), 'utf8'));

console.log('=== [BLOSUM62: matriz y alineamiento de proteínas] ===\n');

// 1. La matriz transcrita coincide celda a celda con la del oráculo canónico
let celdas = 0;
for (const a of ALFABETO_BLOSUM62) {
  for (const b of ALFABETO_BLOSUM62) {
    assert.strictEqual(puntajeBlosum62(a, b), oraculo.blosum[a + b], `BLOSUM62(${a},${b})`);
    assert.strictEqual(puntajeBlosum62(a, b), puntajeBlosum62(b, a), `Simetría (${a},${b})`);
    celdas++;
  }
}
assert.strictEqual(puntajeBlosum62('U', 'A'), null, 'Caracteres no estándar devuelven null');
console.log(`  [PASS] ${celdas} valores de BLOSUM62 coinciden con el oráculo y son simétricos`);

// 2. Needleman-Wunsch con BLOSUM62 reproduce matriz, puntaje y alineamiento del oráculo
for (const caso of oraculo.casos) {
  const engine = new AlignmentEngine(caso.s1, caso.s2,
    { match: 1, mismatch: -1, gap: caso.gap, substitution: SubstitutionType.BLOSUM62 },
    AlgorithmType.NEEDLEMAN_WUNSCH);
  engine.computeAll();
  assert.deepStrictEqual(engine.getMatrix(), caso.dp, `Matriz NW-BLOSUM62 ${caso.s1}/${caso.s2}`);
  assert.strictEqual(engine.getScore(), caso.score, `Puntaje ${caso.s1}/${caso.s2}`);
  const [camino] = engine.findOptimalPaths();
  assert.strictEqual(camino.alignment_s1, caso.al1, `Alineamiento s1 ${caso.s1}/${caso.s2}`);
  assert.strictEqual(camino.alignment_s2, caso.al2, `Alineamiento s2 ${caso.s1}/${caso.s2}`);
  console.log(`  [PASS] NW-BLOSUM62 ${caso.s1} / ${caso.s2} → puntaje ${caso.score}`);
}

// 3. El detalle de celda expone el peso BLOSUM62 usado (para el panel matemático)
const e = new AlignmentEngine('W', 'W', { gap: -4, substitution: SubstitutionType.BLOSUM62 }, AlgorithmType.SMITH_WATERMAN);
e.computeAll();
const d = e.getCellDetails(1, 1);
assert.strictEqual(d.matchWeight, 11, 'W/W en BLOSUM62 vale 11');
assert.strictEqual(d.substitution, SubstitutionType.BLOSUM62);
assert.strictEqual(e.getScore(), 11, 'SW-BLOSUM62 W/W = 11');
console.log('  [PASS] Smith-Waterman con BLOSUM62 y detalle de celda');

// 4. Sin BLOSUM62 el motor conserva el puntaje simple (sin regresiones)
const s = new AlignmentEngine('W', 'W', { match: 1, mismatch: -1, gap: -2 }, AlgorithmType.NEEDLEMAN_WUNSCH);
s.computeAll();
assert.strictEqual(s.getScore(), 1);
console.log('  [PASS] Puntaje simple intacto cuando BLOSUM62 no está activa');

console.log('\nBLOSUM62 tests PASSED!');
