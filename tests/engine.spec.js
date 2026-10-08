import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import assert from 'assert';
import { AlignmentEngine } from '../js/core/AlignmentEngine.js';
import { Direction, AlgorithmType, DefaultScoring } from '../js/core/Types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const suitePath = join(__dirname, 'oraculo/canonical_test_suite.json');

function runEngineTests() {
  const rawData = readFileSync(suitePath, 'utf8');
  const suite = JSON.parse(rawData);

  let totalTests = 0;
  let passedTests = 0;

  console.log('=== [TDD: Engine Spec] RUNNING ALIGNMENT ENGINE SPEC AGAINST CANONICAL SUITE ===\n');

  for (const [caseName, data] of Object.entries(suite)) {
    console.log(`Verifying: ${caseName} (${data.s1} vs ${data.s2})`);

    // 1. Probar Needleman-Wunsch (NW)
    const nwEngine = new AlignmentEngine(data.s1, data.s2, { match: 1, mismatch: -1, gap: -2 }, AlgorithmType.NEEDLEMAN_WUNSCH);
    nwEngine.computeAll();
    const nwPaths = nwEngine.findOptimalPaths();
    const nwPrimary = nwPaths[0] || { alignment_s1: '', alignment_s2: '' };

    assert.strictEqual(nwEngine.getScore(), data.NW.score, `NW score mismatch on ${caseName}`);
    assert.deepStrictEqual(nwEngine.getMatrix(), data.NW.dp_matrix, `NW matrix mismatch on ${caseName}`);
    assert.strictEqual(nwPrimary.alignment_s1, data.NW.alignment_s1, `NW alignment S1 mismatch on ${caseName}`);
    assert.strictEqual(nwPrimary.alignment_s2, data.NW.alignment_s2, `NW alignment S2 mismatch on ${caseName}`);
    console.log('  [PASS] Needleman-Wunsch');
    totalTests += 4;
    passedTests += 4;

    // 2. Probar Smith-Waterman (SW)
    const swEngine = new AlignmentEngine(data.s1, data.s2, { match: 2, mismatch: -1, gap: -2 }, AlgorithmType.SMITH_WATERMAN);
    swEngine.computeAll();
    const swPaths = swEngine.findOptimalPaths();
    const swPrimary = swPaths[0] || { alignment_s1: '', alignment_s2: '' };

    assert.strictEqual(swEngine.getScore(), data.SW.score, `SW score mismatch on ${caseName}`);
    assert.deepStrictEqual(swEngine.getMatrix(), data.SW.dp_matrix, `SW matrix mismatch on ${caseName}`);
    assert.strictEqual(swPrimary.alignment_s1, data.SW.alignment_s1, `SW alignment S1 mismatch on ${caseName}`);
    assert.strictEqual(swPrimary.alignment_s2, data.SW.alignment_s2, `SW alignment S2 mismatch on ${caseName}`);
    console.log('  [PASS] Smith-Waterman');
    totalTests += 4;
    passedTests += 4;

    // 3. Probar Wagner-Fischer (Distancia de Edición - ED)
    const edEngine = new AlignmentEngine(data.s1, data.s2, { matchCost: 0, subCost: 1, indelCost: 1 }, AlgorithmType.WAGNER_FISCHER);
    edEngine.computeAll();
    const edPaths = edEngine.findOptimalPaths();
    const edPrimary = edPaths[0] || { alignment_s1: '', alignment_s2: '' };

    assert.strictEqual(edEngine.getScore(), data.ED.score, `ED score mismatch on ${caseName}`);
    assert.deepStrictEqual(edEngine.getMatrix(), data.ED.dp_matrix, `ED matrix mismatch on ${caseName}`);
    assert.strictEqual(edPrimary.alignment_s1, data.ED.alignment_s1, `ED alignment S1 mismatch on ${caseName}`);
    assert.strictEqual(edPrimary.alignment_s2, data.ED.alignment_s2, `ED alignment S2 mismatch on ${caseName}`);
    console.log('  [PASS] Wagner-Fischer (Edit Distance)');
    totalTests += 4;
    passedTests += 4;

    // 4. Probar Subsecuencia Común más Larga (LCS)
    const lcsEngine = new AlignmentEngine(data.s1, data.s2, { match: 1, mismatch: 0, gap: 0 }, AlgorithmType.LCS);
    lcsEngine.computeAll();
    const lcsPaths = lcsEngine.findOptimalPaths();
    const lcsPrimary = lcsPaths[0] || { lcs_string: '' };

    assert.strictEqual(lcsEngine.getScore(), data.LCS.score, `LCS score mismatch on ${caseName}`);
    assert.deepStrictEqual(lcsEngine.getMatrix(), data.LCS.dp_matrix, `LCS matrix mismatch on ${caseName}`);
    assert.strictEqual(lcsPrimary.lcs_string, data.LCS.lcs_string, `LCS string mismatch on ${caseName}`);
    console.log('  [PASS] Longest Common Subsequence (LCS)');
    totalTests += 3;
    passedTests += 3;
  }

  // Verificación adicional: desempate TC6a con prioridad Diagonal > Superior > Lateral
  // S1 = "AA", S2 = "A", NW con coincidencia=1, discrepancia=-1, hueco=-2
  const tieEngine = new AlignmentEngine("AA", "A", { match: 1, mismatch: -1, gap: -2 }, AlgorithmType.NEEDLEMAN_WUNSCH);
  tieEngine.computeAll();
  const tiePaths = tieEngine.findOptimalPaths();
  assert.strictEqual(tiePaths[0].alignment_s1, "AA", "TC6a S1 alignment priority");
  assert.strictEqual(tiePaths[0].alignment_s2, "-A", "TC6a S2 alignment priority (Diagonal chosen over Superior)");
  totalTests += 2;
  passedTests += 2;

  // Verificación del generador de pasos y orden secuencial de celdas
  const genEngine = new AlignmentEngine("AC", "AG", { match: 1, mismatch: -1, gap: -2 }, AlgorithmType.NEEDLEMAN_WUNSCH);
  const order = genEngine.getCellOrder();
  assert.strictEqual(order.length, 4, "Expected 4 internal cells for 2x2");
  assert.deepStrictEqual(order[0], { i: 1, j: 1 });
  assert.deepStrictEqual(order[3], { i: 2, j: 2 });
  const gen = genEngine.stepGenerator();
  let stepCount = 0;
  for (const cell of gen) {
    assert(cell.score !== undefined);
    stepCount++;
  }
  assert.strictEqual(stepCount, 4);
  assert.strictEqual(genEngine.isCompleted, true);
  totalTests += 4;
  passedTests += 4;

  // Verificación: initMatrix() tras computeAll() limpia el 100% de las celdas internas a null
  console.log('Verifying: initMatrix() after computeAll() cell cleanup');
  const cleanEngine = new AlignmentEngine("ACGT", "TAGC", { match: 1, mismatch: -1, gap: -2 }, AlgorithmType.NEEDLEMAN_WUNSCH);
  cleanEngine.computeAll();
  assert.strictEqual(cleanEngine.isCompleted, true);
  assert.notStrictEqual(cleanEngine.matrix[1][1], null);

  cleanEngine.initMatrix();
  assert.strictEqual(cleanEngine.isCompleted, false, 'isCompleted must be false after initMatrix');
  assert.strictEqual(cleanEngine.maxScore, 0, 'maxScore must be 0 after initMatrix');
  assert.deepStrictEqual(cleanEngine.maxCells, [], 'maxCells must be empty after initMatrix');

  let internalCellsClean = true;
  let directionsClean = true;
  let cellDetailsClean = true;
  for (let i = 1; i <= cleanEngine.n; i++) {
    for (let j = 1; j <= cleanEngine.m; j++) {
      if (cleanEngine.matrix[i][j] !== null) internalCellsClean = false;
      if (cleanEngine.directions[i][j] !== Direction.NONE) directionsClean = false;
      if (cleanEngine.cellDetails[i][j] !== null) cellDetailsClean = false;
    }
  }
  assert.strictEqual(internalCellsClean, true, 'All internal cells (i>=1, j>=1) must be null after initMatrix()');
  assert.strictEqual(directionsClean, true, 'All internal directions must be Direction.NONE after initMatrix()');
  assert.strictEqual(cellDetailsClean, true, 'All internal cellDetails must be null after initMatrix()');
  console.log('  [PASS] initMatrix() full internal reset (NW)');
  totalTests += 6;
  passedTests += 6;

  // Verificación con Smith-Waterman para comprobar el reinicio de maxScore y maxCells
  const swCleanEngine = new AlignmentEngine("ACGT", "TAGC", { match: 2, mismatch: -1, gap: -2 }, AlgorithmType.SMITH_WATERMAN);
  swCleanEngine.computeAll();
  assert.strictEqual(swCleanEngine.isCompleted, true);
  assert(swCleanEngine.maxScore > 0);
  assert(swCleanEngine.maxCells.length > 0);

  swCleanEngine.initMatrix();
  assert.strictEqual(swCleanEngine.isCompleted, false);
  assert.strictEqual(swCleanEngine.maxScore, 0);
  assert.deepStrictEqual(swCleanEngine.maxCells, []);
  for (let i = 1; i <= swCleanEngine.n; i++) {
    for (let j = 1; j <= swCleanEngine.m; j++) {
      assert.strictEqual(swCleanEngine.matrix[i][j], null);
      assert.strictEqual(swCleanEngine.directions[i][j], Direction.NONE);
      assert.strictEqual(swCleanEngine.cellDetails[i][j], null);
    }
  }
  console.log('  [PASS] initMatrix() full internal reset (SW)');
  totalTests += 5;
  passedTests += 5;

  console.log(`\n======================================================`);
  console.log(`ENGINE RESULTS: ${passedTests}/${totalTests} assertions passed.`);
  console.log(`======================================================\n`);
}

runEngineTests();
