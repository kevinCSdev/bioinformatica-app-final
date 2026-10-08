#!/usr/bin/env node
/**
 * Test Suite and Biological/Mathematical Validation Reference Engine (JavaScript / Node.js ESM)
 * for Sequence Alignment Visualizer (Needleman-Wunsch, Smith-Waterman, Wagner-Fischer ED, LCS, BLOSUM62)
 *
 * Migrated from Python to 100% native Node.js maintaining strict Oracle-Driven Development (ODD) parity.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export const BLOSUM62_RAW = `
   A  R  N  D  C  Q  E  G  H  I  L  K  M  F  P  S  T  W  Y  V
A  4 -1 -2 -2  0 -1 -1  0 -2 -1 -1 -1 -1 -2 -1  1  0 -3 -2  0
R -1  5  0 -2 -3  1  0 -2  0 -3 -2  2 -1 -3 -2 -1 -1 -3 -2 -3
N -2  0  6  1 -3  0  0  0  1 -3 -3  0 -2 -3 -2  1  0 -4 -2 -3
D -2 -2  1  6 -3  0  2 -1 -1 -3 -4 -1 -3 -3 -1  0 -1 -4 -3 -3
C  0 -3 -3 -3  9 -3 -4 -3 -3 -1 -1 -3 -1 -2 -3 -1 -1 -2 -2 -1
Q -1  1  0  0 -3  5  2 -2  0 -3 -2  1  0 -3 -1  0 -1 -2 -1 -2
E -1  0  0  2 -4  2  5 -2  0 -3 -3  1 -2 -3 -1  0 -1 -3 -2 -2
G  0 -2  0 -1 -3 -2 -2  6 -2 -4 -4 -2 -3 -3 -2  0 -2 -2 -3 -3
H -2  0  1 -1 -3  0  0 -2  8 -3 -3 -1 -2 -1 -2 -1 -2 -2  2 -3
I -1 -3 -3 -3 -1 -3 -3 -4 -3  4  2 -3  1  0 -3 -2 -1 -3 -1  3
L -1 -2 -3 -4 -1 -2 -3 -4 -3  2  4 -2  2  0 -3 -2 -1 -2 -1  1
K -1  2  0 -1 -3  1  1 -2 -1 -3 -2  5 -1 -3 -1  0 -1 -3 -2 -2
M -1 -1 -2 -3 -1  0 -2 -3 -2  1  2 -1  5  0 -2 -1 -1 -1 -1  1
F -2 -3 -3 -3 -2 -3 -3 -3 -1  0  0 -3  0  6 -4 -2 -2  1  3 -1
P -1 -2 -2 -1 -3 -1 -1 -2 -2 -3 -3 -1 -2 -4  7 -1 -1 -4 -3 -2
S  1 -1  1  0 -1  0  0  0 -1 -2 -2  0 -1 -2 -1  4  1 -3 -2 -2
T  0 -1  0 -1 -1 -1 -1 -2 -2 -1 -1 -1 -1 -2 -1  1  5 -2 -2  0
W -3 -3 -4 -4 -2 -2 -3 -2 -2 -3 -2 -3 -1  1 -4 -3 -2 11  2 -3
Y -2 -2 -2 -3 -2 -1 -2 -3  2 -1 -1 -2 -1  3 -3 -2 -2  2  7 -1
V  0 -3 -3 -3 -1 -2 -2 -3 -3  3  1 -2  1 -1 -2 -2  0 -3 -1  4
`;

export function parseBlosum62() {
  const lines = BLOSUM62_RAW.trim().split('\n').map(l => l.trim());
  const headers = lines[0].split(/\s+/);
  const matrix = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
    const rowAa = parts[0];
    for (let j = 0; j < headers.length; j++) {
      matrix[`${rowAa}${headers[j]}`] = parseInt(parts[j + 1], 10);
    }
  }
  return matrix;
}

const BLOSUM62 = parseBlosum62();

// -------------------------------------------------------------
// NEEDLEMAN-WUNSCH (Global Alignment)
// -------------------------------------------------------------
export function needlemanWunsch(s1, s2, match = 1, mismatch = -1, gap = -2) {
  const n = s1.length;
  const m = s2.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + gap;
  for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + gap;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const scoreDiag = dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch);
      const scoreUp = dp[i - 1][j] + gap;
      const scoreLeft = dp[i][j - 1] + gap;
      dp[i][j] = Math.max(scoreDiag, scoreUp, scoreLeft);
    }
  }

  // Traceback: Priority Diagonal > Superior (Up) > Lateral (Left)
  let i = n;
  let j = m;
  const al1 = [];
  const al2 = [];
  const steps = [];

  while (i > 0 || j > 0) {
    const curr = dp[i][j];
    if (i > 0 && j > 0 && curr === dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch)) {
      al1.push(s1[i - 1]);
      al2.push(s2[j - 1]);
      steps.push('diagonal');
      i -= 1;
      j -= 1;
    } else if (i > 0 && curr === dp[i - 1][j] + gap) {
      al1.push(s1[i - 1]);
      al2.push('-');
      steps.push('superior');
      i -= 1;
    } else {
      al1.push('-');
      al2.push(s2[j - 1]);
      steps.push('lateral');
      j -= 1;
    }
  }

  function getAllPaths(ci, cj) {
    if (ci === 0 && cj === 0) {
      return [[[], []]];
    }
    const paths = [];
    const currVal = dp[ci][cj];
    if (ci > 0 && cj > 0 && currVal === dp[ci - 1][cj - 1] + (s1[ci - 1] === s2[cj - 1] ? match : mismatch)) {
      for (const [p1, p2] of getAllPaths(ci - 1, cj - 1)) {
        paths.push([[...p1, s1[ci - 1]], [...p2, s2[cj - 1]]]);
      }
    }
    if (ci > 0 && currVal === dp[ci - 1][cj] + gap) {
      for (const [p1, p2] of getAllPaths(ci - 1, cj)) {
        paths.push([[...p1, s1[ci - 1]], [...p2, '-']]);
      }
    }
    if (cj > 0 && currVal === dp[ci][cj - 1] + gap) {
      for (const [p1, p2] of getAllPaths(ci, cj - 1)) {
        paths.push([[...p1, '-'], [...p2, s2[cj - 1]]]);
      }
    }
    return paths;
  }

  const allPaths = getAllPaths(n, m).map(([p1, p2]) => [p1.join(''), p2.join('')]);

  return {
    algorithm: 'Needleman-Wunsch',
    s1,
    s2,
    score: dp[n][m],
    dp_matrix: dp,
    alignment_s1: al1.reverse().join(''),
    alignment_s2: al2.reverse().join(''),
    steps: steps.reverse(),
    all_optimal_paths: allPaths,
    optimal_path_count: allPaths.length
  };
}

// -------------------------------------------------------------
// SMITH-WATERMAN (Local Alignment)
// -------------------------------------------------------------
export function smithWaterman(s1, s2, match = 2, mismatch = -1, gap = -2) {
  const n = s1.length;
  const m = s2.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  let maxScore = 0;
  let maxCells = [];

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const scoreDiag = dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch);
      const scoreUp = dp[i - 1][j] + gap;
      const scoreLeft = dp[i][j - 1] + gap;
      const val = Math.max(0, scoreDiag, scoreUp, scoreLeft);
      dp[i][j] = val;
      if (val > maxScore) {
        maxScore = val;
        maxCells = [[i, j]];
      } else if (val === maxScore && val > 0) {
        maxCells.push([i, j]);
      }
    }
  }

  const al1 = [];
  const al2 = [];
  const steps = [];

  if (maxScore > 0 && maxCells.length > 0) {
    let [i, j] = maxCells[0];
    while (dp[i][j] > 0) {
      const curr = dp[i][j];
      if (i > 0 && j > 0 && curr === dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch)) {
        al1.push(s1[i - 1]);
        al2.push(s2[j - 1]);
        steps.push('diagonal');
        i -= 1;
        j -= 1;
      } else if (i > 0 && curr === dp[i - 1][j] + gap) {
        al1.push(s1[i - 1]);
        al2.push('-');
        steps.push('superior');
        i -= 1;
      } else if (j > 0 && curr === dp[i][j - 1] + gap) {
        al1.push('-');
        al2.push(s2[j - 1]);
        steps.push('lateral');
        j -= 1;
      } else {
        break;
      }
    }
  }

  function getSwPaths(ci, cj) {
    if (dp[ci][cj] === 0) {
      return [[[], []]];
    }
    const paths = [];
    const currVal = dp[ci][cj];
    if (ci > 0 && cj > 0 && currVal === dp[ci - 1][cj - 1] + (s1[ci - 1] === s2[cj - 1] ? match : mismatch)) {
      for (const [p1, p2] of getSwPaths(ci - 1, cj - 1)) {
        paths.push([[...p1, s1[ci - 1]], [...p2, s2[cj - 1]]]);
      }
    }
    if (ci > 0 && currVal === dp[ci - 1][cj] + gap) {
      for (const [p1, p2] of getSwPaths(ci - 1, cj)) {
        paths.push([[...p1, s1[ci - 1]], [...p2, '-']]);
      }
    }
    if (cj > 0 && currVal === dp[ci][cj - 1] + gap) {
      for (const [p1, p2] of getSwPaths(ci, cj - 1)) {
        paths.push([[...p1, '-'], [...p2, s2[cj - 1]]]);
      }
    }
    return paths;
  }

  const allPaths = [];
  if (maxScore > 0) {
    for (const mc of maxCells) {
      for (const [p1, p2] of getSwPaths(mc[0], mc[1])) {
        allPaths.push([p1.join(''), p2.join('')]);
      }
    }
  }

  return {
    algorithm: 'Smith-Waterman',
    s1,
    s2,
    score: maxScore,
    max_cells: maxCells,
    dp_matrix: dp,
    alignment_s1: al1.reverse().join(''),
    alignment_s2: al2.reverse().join(''),
    steps: steps.reverse(),
    all_optimal_paths: allPaths,
    optimal_path_count: allPaths.length
  };
}

// -------------------------------------------------------------
// WAGNER-FISCHER / EDIT DISTANCE (Minimization)
// -------------------------------------------------------------
export function wagnerFischer(s1, s2, matchCost = 0, subCost = 1, indelCost = 1) {
  const n = s1.length;
  const m = s2.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) dp[i][0] = i * indelCost;
  for (let j = 1; j <= m; j++) dp[0][j] = j * indelCost;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const costDiag = dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? matchCost : subCost);
      const costUp = dp[i - 1][j] + indelCost;
      const costLeft = dp[i][j - 1] + indelCost;
      dp[i][j] = Math.min(costDiag, costUp, costLeft);
    }
  }

  let i = n;
  let j = m;
  const al1 = [];
  const al2 = [];
  const steps = [];

  while (i > 0 || j > 0) {
    const curr = dp[i][j];
    const costDiag = (i > 0 && j > 0) ? dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? matchCost : subCost) : null;
    const costUp = (i > 0) ? dp[i - 1][j] + indelCost : null;

    if (costDiag !== null && curr === costDiag) {
      al1.push(s1[i - 1]);
      al2.push(s2[j - 1]);
      steps.push('diagonal');
      i -= 1;
      j -= 1;
    } else if (costUp !== null && curr === costUp) {
      al1.push(s1[i - 1]);
      al2.push('-');
      steps.push('superior');
      i -= 1;
    } else {
      al1.push('-');
      al2.push(s2[j - 1]);
      steps.push('lateral');
      j -= 1;
    }
  }

  function getWfPaths(ci, cj) {
    if (ci === 0 && cj === 0) {
      return [[[], []]];
    }
    const paths = [];
    const currVal = dp[ci][cj];
    if (ci > 0 && cj > 0 && currVal === dp[ci - 1][cj - 1] + (s1[ci - 1] === s2[cj - 1] ? matchCost : subCost)) {
      for (const [p1, p2] of getWfPaths(ci - 1, cj - 1)) {
        paths.push([[...p1, s1[ci - 1]], [...p2, s2[cj - 1]]]);
      }
    }
    if (ci > 0 && currVal === dp[ci - 1][cj] + indelCost) {
      for (const [p1, p2] of getWfPaths(ci - 1, cj)) {
        paths.push([[...p1, s1[ci - 1]], [...p2, '-']]);
      }
    }
    if (cj > 0 && currVal === dp[ci][cj - 1] + indelCost) {
      for (const [p1, p2] of getWfPaths(ci, cj - 1)) {
        paths.push([[...p1, '-'], [...p2, s2[cj - 1]]]);
      }
    }
    return paths;
  }

  const allPaths = getWfPaths(n, m).map(([p1, p2]) => [p1.join(''), p2.join('')]);

  return {
    algorithm: 'Wagner-Fischer (Edit Distance)',
    s1,
    s2,
    score: dp[n][m],
    dp_matrix: dp,
    alignment_s1: al1.reverse().join(''),
    alignment_s2: al2.reverse().join(''),
    steps: steps.reverse(),
    all_optimal_paths: allPaths,
    optimal_path_count: allPaths.length
  };
}

// -------------------------------------------------------------
// LONGEST COMMON SUBSEQUENCE (LCS)
// -------------------------------------------------------------
export function longestCommonSubsequence(s1, s2) {
  const n = s1.length;
  const m = s2.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = n;
  let j = m;
  const lcsChars = [];
  const al1 = [];
  const al2 = [];
  const steps = [];

  while (i > 0 && j > 0) {
    if (s1[i - 1] === s2[j - 1]) {
      lcsChars.push(s1[i - 1]);
      al1.push(s1[i - 1]);
      al2.push(s2[j - 1]);
      steps.push('diagonal');
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      al1.push(s1[i - 1]);
      al2.push('-');
      steps.push('superior');
      i -= 1;
    } else {
      al1.push('-');
      al2.push(s2[j - 1]);
      steps.push('lateral');
      j -= 1;
    }
  }

  while (i > 0) {
    al1.push(s1[i - 1]);
    al2.push('-');
    steps.push('superior');
    i -= 1;
  }
  while (j > 0) {
    al1.push('-');
    al2.push(s2[j - 1]);
    steps.push('lateral');
    j -= 1;
  }

  function getAllLcs(ci, cj) {
    if (ci === 0 || cj === 0) {
      return new Set(['']);
    }
    if (s1[ci - 1] === s2[cj - 1]) {
      const res = new Set();
      for (const sub of getAllLcs(ci - 1, cj - 1)) {
        res.add(sub + s1[ci - 1]);
      }
      return res;
    }
    const res = new Set();
    if (dp[ci - 1][cj] === dp[ci][cj]) {
      for (const sub of getAllLcs(ci - 1, cj)) {
        res.add(sub);
      }
    }
    if (dp[ci][cj - 1] === dp[ci][cj]) {
      for (const sub of getAllLcs(ci, cj - 1)) {
        res.add(sub);
      }
    }
    return res;
  }

  const allLcs = Array.from(getAllLcs(n, m)).sort();

  return {
    algorithm: 'Longest Common Subsequence (LCS)',
    s1,
    s2,
    score: dp[n][m],
    dp_matrix: dp,
    lcs_string: lcsChars.reverse().join(''),
    all_lcs_strings: allLcs,
    alignment_s1: al1.reverse().join(''),
    alignment_s2: al2.reverse().join(''),
    steps: steps.reverse()
  };
}

// -------------------------------------------------------------
// PROTEIN ALIGNMENT (BLOSUM62 vs Linear)
// -------------------------------------------------------------
export function proteinAlignmentCompare(p1, p2, gapLinear = -2, gapBlosum = -4) {
  const resLinear = needlemanWunsch(p1, p2, 1, -1, gapLinear);

  const n = p1.length;
  const m = p2.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + gapBlosum;
  for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + gapBlosum;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const pairScore = BLOSUM62[`${p1[i - 1]}${p2[j - 1]}`] ?? -4;
      const diag = dp[i - 1][j - 1] + pairScore;
      const up = dp[i - 1][j] + gapBlosum;
      const left = dp[i][j - 1] + gapBlosum;
      dp[i][j] = Math.max(diag, up, left);
    }
  }

  let i = n;
  let j = m;
  const al1 = [];
  const al2 = [];

  while (i > 0 || j > 0) {
    const curr = dp[i][j];
    const pairScore = (i > 0 && j > 0) ? (BLOSUM62[`${p1[i - 1]}${p2[j - 1]}`] ?? -4) : null;
    if (pairScore !== null && curr === dp[i - 1][j - 1] + pairScore) {
      al1.push(p1[i - 1]);
      al2.push(p2[j - 1]);
      i -= 1;
      j -= 1;
    } else if (i > 0 && curr === dp[i - 1][j] + gapBlosum) {
      al1.push(p1[i - 1]);
      al2.push('-');
      i -= 1;
    } else {
      al1.push('-');
      al2.push(p2[j - 1]);
      j -= 1;
    }
  }

  const resBlosum = {
    algorithm: 'Needleman-Wunsch (BLOSUM62)',
    s1: p1,
    s2: p2,
    score: dp[n][m],
    dp_matrix: dp,
    alignment_s1: al1.reverse().join(''),
    alignment_s2: al2.reverse().join('')
  };

  return { resLinear, resBlosum };
}

// -------------------------------------------------------------
// GENERATORS (ODD Reference Datasets)
// -------------------------------------------------------------
export function generateCanonicalSuite() {
  const canonicalCases = [
    ['TC1: Identical Strings', 'AGTC', 'AGTC'],
    ['TC2: Single Mismatch (Substitution)', 'AGTC', 'AGAC'],
    ['TC3: Single Indel (Insertion/Deletion)', 'AGTC', 'AGC'],
    ['TC4: Highly Asymmetrical Lengths', 'ACGTACGT', 'CG'],
    ['TC5: Completely Divergent', 'AAAA', 'CCCC'],
    ['TC6: Multiple Optimal Paths (Tie-breaker)', 'AGC', 'ACG']
  ];

  const results = {};
  for (const [name, s1, s2] of canonicalCases) {
    results[name] = {
      s1,
      s2,
      NW: needlemanWunsch(s1, s2, 1, -1, -2),
      SW: smithWaterman(s1, s2, 2, -1, -2),
      ED: wagnerFischer(s1, s2, 0, 1, 1),
      LCS: longestCommonSubsequence(s1, s2)
    };
  }
  return results;
}

export function generateBlosumOracle() {
  const blosum = parseBlosum62();
  const cases = [
    { s1: 'GDLE', s2: 'GGLED', gap: -4 },
    { s1: 'HEAGAWGHEE', s2: 'PAWHEAE', gap: -4 },
    { s1: 'MKTAYIAK', s2: 'MKTAHIAK', gap: -4 },
    { s1: 'WWW', s2: 'CCC', gap: -4 }
  ];

  const casos = cases.map(c => {
    const { resBlosum } = proteinAlignmentCompare(c.s1, c.s2, -2, c.gap);
    return {
      s1: c.s1,
      s2: c.s2,
      gap: c.gap,
      score: resBlosum.score,
      dp: resBlosum.dp_matrix,
      al1: resBlosum.alignment_s1,
      al2: resBlosum.alignment_s2
    };
  });

  return { blosum, casos };
}

// CLI Execution (if invoked directly)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const canonicalData = generateCanonicalSuite();
  const canonicalPath = join(__dirname, 'canonical_test_suite.json');
  writeFileSync(canonicalPath, JSON.stringify(canonicalData, null, 2) + '\n', 'utf8');
  console.log(`Canonical test suite written to: ${canonicalPath}`);

  const blosumData = generateBlosumOracle();
  const blosumPath = join(__dirname, 'blosum62_oraculo.json');
  writeFileSync(blosumPath, JSON.stringify(blosumData, null, 1) + '\n', 'utf8');
  console.log(`BLOSUM62 oracle written to: ${blosumPath}`);
}
