import assert from 'assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  generateCanonicalSuite,
  generateBlosumOracle,
  needlemanWunsch,
  smithWaterman,
  wagnerFischer,
  longestCommonSubsequence,
  proteinAlignmentCompare,
  parseBlosum62
} from './oraculo/test_suite_alignment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('=== [TDD: Oracle Migration Spec (ODD + TDD)] ===\n');

// 1. Verify existence and contract of algorithms
assert.strictEqual(typeof needlemanWunsch, 'function');
assert.strictEqual(typeof smithWaterman, 'function');
assert.strictEqual(typeof wagnerFischer, 'function');
assert.strictEqual(typeof longestCommonSubsequence, 'function');
assert.strictEqual(typeof proteinAlignmentCompare, 'function');
assert.strictEqual(typeof parseBlosum62, 'function');

// 2. Load existing Ground Truth JSONs
const canonicalJsonPath = join(__dirname, 'oraculo/canonical_test_suite.json');
const expectedCanonical = JSON.parse(readFileSync(canonicalJsonPath, 'utf8'));

const blosumJsonPath = join(__dirname, 'oraculo/blosum62_oraculo.json');
const expectedBlosum = JSON.parse(readFileSync(blosumJsonPath, 'utf8'));

// 3. Generate datasets in-memory via JS Oracle
const generatedCanonical = generateCanonicalSuite();
const generatedBlosum = generateBlosumOracle();

// 4. Assert 100% equivalence on Canonical Suite (ODD Oracle contract)
assert.deepStrictEqual(generatedCanonical, expectedCanonical, 'Generated canonical suite must match canonical_test_suite.json exactly');
console.log('  [PASS] Canonical test suite (TC1-TC6, 4 algorithms) matches oracle Ground Truth 100%');

// 5. Assert 100% equivalence on BLOSUM62 Oracle dataset
assert.deepStrictEqual(generatedBlosum.blosum, expectedBlosum.blosum, 'BLOSUM62 matrix scores must match blosum62_oraculo.json exactly');
assert.deepStrictEqual(generatedBlosum.casos, expectedBlosum.casos, 'BLOSUM62 alignment cases must match blosum62_oraculo.json exactly');
console.log('  [PASS] BLOSUM62 matrix & alignment oracle matches blosum62_oraculo.json 100%');

console.log('\nOracle Migration Spec PASSED flawlessly!\n');
