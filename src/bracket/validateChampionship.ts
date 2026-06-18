/**
 * Championship Format Validation — Step 4
 *
 * Validates all decision branches of the championship format module.
 * Run with: npx ts-node --project tsconfig.node.json src/bracket/validateChampionship.ts
 */

import {
    getChampionshipExplanation,
    GrandFinalResult,
    resolveGrandFinal,
    resolveReset
} from './championshipFormat';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ─── Single Championship Game ─────────────────────────────────────────────────

console.log('\n── Single Championship Game ──');

// Winners-bracket team wins GF-1 → champion immediately
const r1: GrandFinalResult = { winnerId: 'teamA', loserId: 'teamB', winnerPath: 'winners' };
const d1 = resolveGrandFinal(r1, 'single');
assert(d1.outcome === 'champion', 'Single: winners-bracket win → champion');
assert('championId' in d1 && d1.championId === 'teamA', 'Single: winners-bracket win → correct champion');

// Losers-bracket team wins GF-1 → still champion (no reset in single format)
const r2: GrandFinalResult = { winnerId: 'teamB', loserId: 'teamA', winnerPath: 'losers' };
const d2 = resolveGrandFinal(r2, 'single');
assert(d2.outcome === 'champion', 'Single: losers-bracket win → champion (no reset)');
assert('championId' in d2 && d2.championId === 'teamB', 'Single: losers-bracket win → correct champion');

// ─── Double Championship Game ─────────────────────────────────────────────────

console.log('\n── Double Championship Game ──');

// Winners-bracket team wins GF-1 → champion immediately (losers team now has 2 losses)
const r3: GrandFinalResult = { winnerId: 'teamA', loserId: 'teamB', winnerPath: 'winners' };
const d3 = resolveGrandFinal(r3, 'double');
assert(d3.outcome === 'champion', 'Double: winners-bracket win → champion (no reset needed)');
assert('championId' in d3 && d3.championId === 'teamA', 'Double: winners-bracket win → correct champion');

// Losers-bracket team wins GF-1 → reset required
const r4: GrandFinalResult = { winnerId: 'teamB', loserId: 'teamA', winnerPath: 'losers' };
const d4 = resolveGrandFinal(r4, 'double');
assert(d4.outcome === 'reset_required', 'Double: losers-bracket win → reset required');
assert('resetGameId' in d4 && d4.resetGameId === 'GF-2', 'Double: reset points to GF-2');

// ─── Bracket Reset (GF-2) ────────────────────────────────────────────────────

console.log('\n── Bracket Reset (GF-2) ──');

// Whoever wins GF-2 is champion, no further logic needed
const resetResult1 = resolveReset('teamA');
assert(resetResult1.outcome === 'champion', 'GF-2: winner is champion');
assert('championId' in resetResult1 && resetResult1.championId === 'teamA', 'GF-2: correct champion (teamA wins)');

const resetResult2 = resolveReset('teamB');
assert(resetResult2.outcome === 'champion', 'GF-2: winner is champion');
assert('championId' in resetResult2 && resetResult2.championId === 'teamB', 'GF-2: correct champion (teamB wins)');

// ─── Determinism ─────────────────────────────────────────────────────────────

console.log('\n── Determinism ──');

const detResult1 = resolveGrandFinal(r4, 'double');
const detResult2 = resolveGrandFinal(r4, 'double');
assert(
  JSON.stringify(detResult1) === JSON.stringify(detResult2),
  'Same inputs always produce same championship decision'
);

// ─── User-facing Explanation ─────────────────────────────────────────────────

console.log('\n── User-Facing Explanation ──');

const singleExplanation = getChampionshipExplanation('single');
assert(typeof singleExplanation === 'string' && singleExplanation.length > 0, 'Single format has explanation text');
assert(singleExplanation.toLowerCase().includes('single'), 'Single explanation mentions single game');

const doubleExplanation = getChampionshipExplanation('double');
assert(typeof doubleExplanation === 'string' && doubleExplanation.length > 0, 'Double format has explanation text');
assert(doubleExplanation.toLowerCase().includes('second'), 'Double explanation mentions second game');

// ─── Default Format Confirmation ─────────────────────────────────────────────

console.log('\n── Default Format (Single) ──');

// The spec says Single is the default. This test confirms the module
// treats 'single' as the canonical safe default by verifying it never
// triggers a reset under any circumstances.
const allResults: GrandFinalResult[] = [
  { winnerId: 'A', loserId: 'B', winnerPath: 'winners' },
  { winnerId: 'A', loserId: 'B', winnerPath: 'losers' },
];
allResults.forEach(r => {
  const d = resolveGrandFinal(r, 'single');
  assert(d.outcome === 'champion', `Single format always produces champion, never reset (winnerPath: ${r.winnerPath})`);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) {
  console.error('❌ Some validations failed. Do not proceed to step 5 until all pass.');
  process.exit(1);
} else {
  console.log('✅ All validations passed. Safe to proceed to step 5.');
}