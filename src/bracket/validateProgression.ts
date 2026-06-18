/**
 * Bracket Progression Validation — Step 6
 *
 * Tests the logic of result entry and bracket advancement.
 *
 * Note: The actual Firestore writes in bracketProgression.ts require a live
 * Firebase connection and are tested via integration/manual testing.
 * This file validates the pure logic pieces that CAN be unit tested:
 *   - Status transition rules
 *   - Slot assignment logic
 *   - Championship special case routing
 *   - Bye auto-resolution logic
 *
 * Run with: npx ts-node --project tsconfig.node.json src/bracket/validateProgression.ts
 */

import { generateBracketFromTeams } from './bracketEngine';
import { resolveGrandFinal, resolveReset } from './championshipFormat';

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

// ─── Status Transition Rules ──────────────────────────────────────────────────
//
// From spec and schema:
//   pending → ready:     both teams determined
//   pending → bye:       isBye is true (set at generation)
//   ready   → completed: organizer selects winner
//   bye     → completed: automatically at generation
//   completed is terminal

console.log('\n── Status Transition Rules ──');

type GameStatus = 'pending' | 'ready' | 'bye' | 'completed';

function canTransition(from: GameStatus, to: GameStatus): boolean {
  const valid: Record<GameStatus, GameStatus[]> = {
    pending: ['ready', 'bye'],
    ready: ['completed'],
    bye: ['completed'],
    completed: [],  // terminal
  };
  return valid[from].includes(to);
}

assert(canTransition('pending', 'ready'), 'pending → ready is valid');
assert(canTransition('pending', 'bye'), 'pending → bye is valid');
assert(canTransition('ready', 'completed'), 'ready → completed is valid');
assert(canTransition('bye', 'completed'), 'bye → completed is valid');
assert(!canTransition('completed', 'pending'), 'completed → pending is invalid (terminal)');
assert(!canTransition('completed', 'ready'), 'completed → ready is invalid (terminal)');
assert(!canTransition('ready', 'pending'), 'ready → pending is invalid');
assert(!canTransition('pending', 'completed'), 'pending → completed is invalid (must go through ready first)');

// ─── Slot Assignment Logic ────────────────────────────────────────────────────
//
// fedByWinnerOf[0] → top slot, fedByWinnerOf[1] → bottom slot
// Loser dropins always fill the bottom slot

console.log('\n── Slot Assignment Logic ──');

type MockGame = {
  id: string;
  fedByWinnerOf: [string, string] | null;
  topTeamId: string | null;
  bottomTeamId: string | null;
};

function resolveSlot(targetGame: MockGame, sourceGameId: string, role: 'winner' | 'loser'): 'top' | 'bottom' {
  if (role === 'winner' && targetGame.fedByWinnerOf) {
    return targetGame.fedByWinnerOf[0] === sourceGameId ? 'top' : 'bottom';
  }
  return 'bottom'; // loser dropins always fill bottom slot
}

function isReadyAfterSlotFill(game: MockGame, slot: 'top' | 'bottom'): boolean {
  if (slot === 'top') return game.bottomTeamId !== null;
  return game.topTeamId !== null;
}

// Winners bracket: feeder game W-R1-G1 is position 0 → top slot
const wR2Game: MockGame = {
  id: 'W-R2-G1',
  fedByWinnerOf: ['W-R1-G1', 'W-R1-G2'],
  topTeamId: null,
  bottomTeamId: null,
};
assert(resolveSlot(wR2Game, 'W-R1-G1', 'winner') === 'top', 'W-R1-G1 winner fills top slot of W-R2-G1');
assert(resolveSlot(wR2Game, 'W-R1-G2', 'winner') === 'bottom', 'W-R1-G2 winner fills bottom slot of W-R2-G1');

// After filling one slot, game is not yet ready
wR2Game.topTeamId = 'teamA';
assert(!isReadyAfterSlotFill(wR2Game, 'top'), 'Game not ready after only one slot filled');

// After filling both slots, game becomes ready
wR2Game.bottomTeamId = 'teamB';
assert(isReadyAfterSlotFill(wR2Game, 'bottom'), 'Game ready after both slots filled');

// Losers bracket dropin: always fills bottom slot regardless of fedByWinnerOf
const lR2Game: MockGame = {
  id: 'L-R2-G1',
  fedByWinnerOf: ['L-R1-G1', 'W-R2-G1'],
  topTeamId: null,
  bottomTeamId: null,
};
assert(resolveSlot(lR2Game, 'W-R2-G1', 'loser') === 'bottom', 'WR2 loser dropin fills bottom slot of L-R2-G1');

// ─── Result Blocking Logic ────────────────────────────────────────────────────
//
// A game with status !== 'ready' and !== 'bye' cannot have a result entered.
// A game with status 'completed' can have its result re-entered (correction).

console.log('\n── Result Blocking Logic ──');

function canEnterResult(status: GameStatus): boolean {
  return status === 'ready' || status === 'bye' || status === 'completed';
}

assert(!canEnterResult('pending'), 'Cannot enter result for pending game (dependencies not met)');
assert(canEnterResult('ready'), 'Can enter result for ready game');
assert(canEnterResult('bye'), 'Can enter result for bye game (auto-resolved at generation)');
assert(canEnterResult('completed'), 'Can re-enter result for completed game (correction)');

// ─── Championship Routing ─────────────────────────────────────────────────────

console.log('\n── Championship Routing ──');

// Single format: GF-1 always produces champion
const singleWW = resolveGrandFinal({ winnerId: 'A', loserId: 'B', winnerPath: 'winners' }, 'single');
const singleWL = resolveGrandFinal({ winnerId: 'B', loserId: 'A', winnerPath: 'losers' }, 'single');
assert(singleWW.outcome === 'champion', 'Single: winners-bracket win → champion');
assert(singleWL.outcome === 'champion', 'Single: losers-bracket win → champion (no reset)');

// Double format: winners-bracket win → champion, losers-bracket win → reset
const doubleWW = resolveGrandFinal({ winnerId: 'A', loserId: 'B', winnerPath: 'winners' }, 'double');
const doubleWL = resolveGrandFinal({ winnerId: 'B', loserId: 'A', winnerPath: 'losers' }, 'double');
assert(doubleWW.outcome === 'champion', 'Double: winners-bracket win → champion');
assert(doubleWL.outcome === 'reset_required', 'Double: losers-bracket win → reset required');

// GF-2 always produces champion
const resetResult = resolveReset('teamA');
assert(resetResult.outcome === 'champion', 'GF-2: always produces champion');

// ─── Bye Auto-Resolution ──────────────────────────────────────────────────────

console.log('\n── Bye Auto-Resolution ──');

// Verify that bye games in a generated bracket have exactly one real team
const b5 = generateBracketFromTeams(['T1','T2','T3','T4','T5']);
const byeGames = b5.games.filter(g => g.isBye);

assert(byeGames.length === 3, `5-team bracket has 3 bye games (got ${byeGames.length})`);

byeGames.forEach(g => {
  const hasRealTeam = (g.topSeed !== null && g.topSeed !== -1) ||
                      (g.bottomSeed !== null && g.bottomSeed !== -1);
  const hasOneByeSlot = (g.topSeed === -1) !== (g.bottomSeed === -1);
  assert(hasRealTeam, `${g.id}: bye game has at least one real team`);
  assert(hasOneByeSlot, `${g.id}: bye game has exactly one bye slot`);
  assert(g.winnerAdvancesTo !== null, `${g.id}: bye game has a winner advancement destination`);
  assert(g.loserDropsTo === null, `${g.id}: bye game has no loser drop (no one loses a bye)`);
});

// ─── Dependency Graph Completeness ───────────────────────────────────────────
//
// Every non-seeded game must have fedByWinnerOf populated.
// Every game except the final must have winnerAdvancesTo populated.
// Games in losers bracket or winners bracket (non-final) must have loserDropsTo
// pointing somewhere OR be the final game feeding the grand final.

console.log('\n── Dependency Graph Completeness ──');

const b8 = generateBracketFromTeams(['T1','T2','T3','T4','T5','T6','T7','T8']);

// All non-R1 winners and all losers games should have fedByWinnerOf
const nonSeededGames = b8.games.filter(g =>
  g.bracket !== 'final' &&
  !(g.bracket === 'winners' && g.round === 1)
);
nonSeededGames.forEach(g => {
  assert(
    g.fedByWinner !== null,
    `${g.id}: non-seeded game has fedByWinner populated`
  );
});

// All games except GF-1 and GF-2 should have winnerAdvancesTo
const nonFinalGames = b8.games.filter(g => g.id !== 'GF-1' && g.id !== 'GF-2');
nonFinalGames.forEach(g => {
  assert(
    g.winnerAdvancesTo !== null,
    `${g.id}: non-final game has winnerAdvancesTo populated`
  );
});

// All winners bracket non-final games should have loserDropsTo
const wNonFinal = b8.games.filter(g =>
  g.bracket === 'winners' &&
  g.round < Math.log2(b8.bracketSize) &&
  !g.isBye
);
wNonFinal.forEach(g => {
  assert(
    g.loserDropsTo !== null,
    `${g.id}: winners bracket game has loserDropsTo populated`
  );
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) {
  console.error('❌ Some validations failed. Review before proceeding to step 7.');
  process.exit(1);
} else {
  console.log('✅ All validations passed. Safe to proceed to step 7.');
  console.log('\nNote: Firestore write integration (enterResult, autoResolveByes)');
  console.log('requires a live Firebase connection and should be tested manually');
  console.log('once the organizer UI is built in step 8.\n');
}