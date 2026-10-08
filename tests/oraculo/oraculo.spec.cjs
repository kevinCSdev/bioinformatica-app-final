/**
 * Automated Unit Test Suite for Sequence Alignment Algorithms
 * Needleman-Wunsch (NW), Smith-Waterman (SW), Wagner-Fischer Edit Distance (ED), and LCS.
 * Validates canonical test cases against the reference oracle.
 */

const fs = require('fs');
const assert = require('assert');

// 1. Needleman-Wunsch Implementation
function runNeedlemanWunsch(s1, s2, match = 1, mismatch = -1, gap = -2) {
    const n = s1.length;
    const m = s2.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + gap;
    for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + gap;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const diag = dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch);
            const up = dp[i - 1][j] + gap;
            const left = dp[i][j - 1] + gap;
            dp[i][j] = Math.max(diag, up, left);
        }
    }

    // Traceback with priority: Diagonal > Superior > Lateral
    let i = n, j = m;
    let al1 = [], al2 = [];
    while (i > 0 || j > 0) {
        const curr = dp[i][j];
        if (i > 0 && j > 0 && curr === dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch)) {
            al1.push(s1[i - 1]);
            al2.push(s2[j - 1]);
            i--; j--;
        } else if (i > 0 && curr === dp[i - 1][j] + gap) {
            al1.push(s1[i - 1]);
            al2.push('-');
            i--;
        } else {
            al1.push('-');
            al2.push(s2[j - 1]);
            j--;
        }
    }

    return {
        score: dp[n][m],
        dp: dp,
        alignment_s1: al1.reverse().join(''),
        alignment_s2: al2.reverse().join('')
    };
}

// 2. Smith-Waterman Implementation
function runSmithWaterman(s1, s2, match = 2, mismatch = -1, gap = -2) {
    const n = s1.length;
    const m = s2.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    let maxScore = 0;
    let maxCell = [0, 0];

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const diag = dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch);
            const up = dp[i - 1][j] + gap;
            const left = dp[i][j - 1] + gap;
            const val = Math.max(0, diag, up, left);
            dp[i][j] = val;
            if (val > maxScore) {
                maxScore = val;
                maxCell = [i, j];
            }
        }
    }

    let i = maxCell[0], j = maxCell[1];
    let al1 = [], al2 = [];
    while (i > 0 && j > 0 && dp[i][j] > 0) {
        const curr = dp[i][j];
        if (i > 0 && j > 0 && curr === dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch)) {
            al1.push(s1[i - 1]);
            al2.push(s2[j - 1]);
            i--; j--;
        } else if (i > 0 && curr === dp[i - 1][j] + gap) {
            al1.push(s1[i - 1]);
            al2.push('-');
            i--;
        } else if (j > 0 && curr === dp[i][j - 1] + gap) {
            al1.push('-');
            al2.push(s2[j - 1]);
            j--;
        } else {
            break;
        }
    }

    return {
        score: maxScore,
        dp: dp,
        alignment_s1: al1.reverse().join(''),
        alignment_s2: al2.reverse().join('')
    };
}

// 3. Wagner-Fischer Edit Distance Implementation
function runWagnerFischer(s1, s2, matchCost = 0, subCost = 1, indelCost = 1) {
    const n = s1.length;
    const m = s2.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) dp[i][0] = i * indelCost;
    for (let j = 1; j <= m; j++) dp[0][j] = j * indelCost;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const diag = dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? matchCost : subCost);
            const up = dp[i - 1][j] + indelCost;
            const left = dp[i][j - 1] + indelCost;
            dp[i][j] = Math.min(diag, up, left);
        }
    }

    let i = n, j = m;
    let al1 = [], al2 = [];
    while (i > 0 || j > 0) {
        const curr = dp[i][j];
        const costDiag = (i > 0 && j > 0) ? dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? matchCost : subCost) : null;
        const costUp = (i > 0) ? dp[i - 1][j] + indelCost : null;
        const costLeft = (j > 0) ? dp[i][j - 1] + indelCost : null;

        if (costDiag !== null && curr === costDiag) {
            al1.push(s1[i - 1]);
            al2.push(s2[j - 1]);
            i--; j--;
        } else if (costUp !== null && curr === costUp) {
            al1.push(s1[i - 1]);
            al2.push('-');
            i--;
        } else {
            al1.push('-');
            al2.push(s2[j - 1]);
            j--;
        }
    }

    return {
        score: dp[n][m],
        dp: dp,
        alignment_s1: al1.reverse().join(''),
        alignment_s2: al2.reverse().join('')
    };
}

// 4. Longest Common Subsequence Implementation
function runLCS(s1, s2) {
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

    let i = n, j = m;
    let lcsChars = [];
    let al1 = [], al2 = [];

    while (i > 0 && j > 0) {
        if (s1[i - 1] === s2[j - 1]) {
            lcsChars.push(s1[i - 1]);
            al1.push(s1[i - 1]);
            al2.push(s2[j - 1]);
            i--; j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            al1.push(s1[i - 1]);
            al2.push('-');
            i--;
        } else {
            al1.push('-');
            al2.push(s2[j - 1]);
            j--;
        }
    }
    while (i > 0) {
        al1.push(s1[i - 1]);
        al2.push('-');
        i--;
    }
    while (j > 0) {
        al1.push('-');
        al2.push(s2[j - 1]);
        j--;
    }

    return {
        score: dp[n][m],
        dp: dp,
        lcs_string: lcsChars.reverse().join(''),
        alignment_s1: al1.reverse().join(''),
        alignment_s2: al2.reverse().join('')
    };
}

// Runner
function runSuite() {
    const rawData = fs.readFileSync(require('path').join(__dirname, 'canonical_test_suite.json'), 'utf8');
    const suite = JSON.parse(rawData);

    let totalTests = 0;
    let passedTests = 0;

    console.log('=== RUNNING BIOLOGICAL/MATHEMATICAL VALIDATION SUITE ===\n');

    for (const [caseName, data] of Object.entries(suite)) {
        console.log(`Testing: ${caseName} (${data.s1} vs ${data.s2})`);

        // Test NW
        const nw = runNeedlemanWunsch(data.s1, data.s2, 1, -1, -2);
        assert.strictEqual(nw.score, data.NW.score, `NW score mismatch on ${caseName}`);
        assert.deepStrictEqual(nw.dp, data.NW.dp_matrix, `NW matrix mismatch on ${caseName}`);
        assert.strictEqual(nw.alignment_s1, data.NW.alignment_s1, `NW alignment S1 mismatch on ${caseName}`);
        assert.strictEqual(nw.alignment_s2, data.NW.alignment_s2, `NW alignment S2 mismatch on ${caseName}`);
        console.log('  [PASS] Needleman-Wunsch');
        totalTests += 4; passedTests += 4;

        // Test SW
        const sw = runSmithWaterman(data.s1, data.s2, 2, -1, -2);
        assert.strictEqual(sw.score, data.SW.score, `SW score mismatch on ${caseName}`);
        assert.deepStrictEqual(sw.dp, data.SW.dp_matrix, `SW matrix mismatch on ${caseName}`);
        assert.strictEqual(sw.alignment_s1, data.SW.alignment_s1, `SW alignment S1 mismatch on ${caseName}`);
        assert.strictEqual(sw.alignment_s2, data.SW.alignment_s2, `SW alignment S2 mismatch on ${caseName}`);
        console.log('  [PASS] Smith-Waterman');
        totalTests += 4; passedTests += 4;

        // Test ED
        const ed = runWagnerFischer(data.s1, data.s2, 0, 1, 1);
        assert.strictEqual(ed.score, data.ED.score, `ED score mismatch on ${caseName}`);
        assert.deepStrictEqual(ed.dp, data.ED.dp_matrix, `ED matrix mismatch on ${caseName}`);
        assert.strictEqual(ed.alignment_s1, data.ED.alignment_s1, `ED alignment S1 mismatch on ${caseName}`);
        assert.strictEqual(ed.alignment_s2, data.ED.alignment_s2, `ED alignment S2 mismatch on ${caseName}`);
        console.log('  [PASS] Wagner-Fischer (Edit Distance)');
        totalTests += 4; passedTests += 4;

        // Test LCS
        const lcs = runLCS(data.s1, data.s2);
        assert.strictEqual(lcs.score, data.LCS.score, `LCS score mismatch on ${caseName}`);
        assert.deepStrictEqual(lcs.dp, data.LCS.dp_matrix, `LCS matrix mismatch on ${caseName}`);
        assert.strictEqual(lcs.lcs_string, data.LCS.lcs_string, `LCS string mismatch on ${caseName}`);
        console.log('  [PASS] Longest Common Subsequence (LCS)');
        totalTests += 3; passedTests += 3;
    }

    console.log(`\n======================================================`);
    console.log(`RESULTS: ${passedTests}/${totalTests} assertions passed flawlessly (100%).`);
    console.log(`======================================================\n`);
}

runSuite();
