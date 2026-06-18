/**
 * Bracket Engine Validation — Step 2
 *
 * Validates the generator output against known, standard double-elimination
 * bracket structures for 4 and 8 team sizes.
 *
 * Run with: node --require ts-node/register src/bracket/validateBracket.ts
 * Or paste into a JS runner after compiling.
 */

import {
    BracketGame,
    BracketStructure,
    generateBracketFromTeams,
    generateSeedPlacements,
    nextPowerOfTwo
} from './bracketEngine';

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

function findGame(bracket: BracketStructure, id: string): BracketGame | undefined {
  return bracket.games.find(g => g.id === id);
}

// ─── nextPowerOfTwo ───────────────────────────────────────────────────────────

console.log('\n── nextPowerOfTwo ──');
assert(nextPowerOfTwo(4) === 4, '4 → 4');
assert(nextPowerOfTwo(5) === 8, '5 → 8');
assert(nextPowerOfTwo(8) === 8, '8 → 8');
assert(nextPowerOfTwo(9) === 16, '9 → 16');
assert(nextPowerOfTwo(17) === 32, '17 → 32');
assert(nextPowerOfTwo(24) === 32, '24 → 32 (max supported team count)');

// ─── 4-Team Bracket ───────────────────────────────────────────────────────────
//
// Standard 4-team double-elimination reference:
//
// Winners R1: W-R1-G1 (seed1 vs seed4), W-R1-G2 (seed2 vs seed3)
// Winners Final: W-R2-G1 (winner G1 vs winner G2)
// Losers R1: L-R1-G1 (loser G1 vs loser G2)  ← cross-paired
// Losers Final: L-R2-G1 (winner L-R1-G1 vs loser of winners final)
// Grand Final: GF-1 (winner W-R2-G1 vs winner L-R2-G1)

console.log('\n── 4-Team Bracket ──');
const seeds4 = ['Team1', 'Team2', 'Team3', 'Team4'];
const b4 = generateBracketFromTeams(seeds4);

assert(b4.bracketSize === 4, 'bracket size is 4');

// Total game count for 4-team DE: 3 (winners) + 2 (losers) + 1 (GF) + 1 (GF reset) = 7
assert(b4.games.length === 7, `game count is 7 (got ${b4.games.length})`);

// Winners R1
const w_r1_g1 = findGame(b4, 'W-R1-G1');
const w_r1_g2 = findGame(b4, 'W-R1-G2');
assert(!!w_r1_g1, 'W-R1-G1 exists');
assert(!!w_r1_g2, 'W-R1-G2 exists');
assert(w_r1_g1?.fedByWinner === null, 'W-R1-G1 is seeded directly (no feeder games)');
assert(w_r1_g2?.fedByWinner === null, 'W-R1-G2 is seeded directly (no feeder games)');
assert(w_r1_g1?.winnerAdvancesTo === 'W-R2-G1', 'W-R1-G1 winner → W-R2-G1');
assert(w_r1_g2?.winnerAdvancesTo === 'W-R2-G1', 'W-R1-G2 winner → W-R2-G1');

// Winners Final
const w_r2_g1 = findGame(b4, 'W-R2-G1');
assert(!!w_r2_g1, 'W-R2-G1 (winners final) exists');
assert(w_r2_g1?.fedByWinner?.includes('W-R1-G1') ?? false, 'Winners final fed by W-R1-G1');
assert(w_r2_g1?.fedByWinner?.includes('W-R1-G2') ?? false, 'Winners final fed by W-R1-G2');
assert(w_r2_g1?.winnerAdvancesTo === 'GF-1', 'Winners final winner → Grand Final');

// Losers R1
const l_r1_g1 = findGame(b4, 'L-R1-G1');
assert(!!l_r1_g1, 'L-R1-G1 exists');
assert(l_r1_g1?.bracket === 'losers', 'L-R1-G1 is in losers bracket');
// Cross-paired: losers of W-R1-G1 and W-R1-G2 face each other
assert(
  (l_r1_g1?.fedByWinner?.includes('W-R1-G1') && l_r1_g1?.fedByWinner?.includes('W-R1-G2')) ?? false,
  'L-R1-G1 is fed by losers of W-R1-G1 and W-R1-G2 (cross-paired)'
);

// Losers Final
const l_r2_g1 = findGame(b4, 'L-R2-G1');
assert(!!l_r2_g1, 'L-R2-G1 (losers final) exists');
assert(
  l_r2_g1?.fedByWinner?.includes('L-R1-G1') ?? false,
  'L-R2-G1 fed by winner of L-R1-G1'
);
assert(
  l_r2_g1?.fedByWinner?.includes('W-R2-G1') ?? false,
  'L-R2-G1 fed by loser of winners final (W-R2-G1)'
);
assert(l_r2_g1?.winnerAdvancesTo === 'GF-1', 'Losers final winner → Grand Final');

// Grand Final
const gf1 = findGame(b4, 'GF-1');
assert(!!gf1, 'GF-1 exists');
assert(gf1?.bracket === 'final', 'GF-1 is in final bracket');
assert(gf1?.fedByWinner?.includes('W-R2-G1') ?? false, 'GF-1 fed by winners-final winner');
assert(gf1?.fedByWinner?.includes('L-R2-G1') ?? false, 'GF-1 fed by losers-final winner');

// Bracket reset exists in structure
const gf2 = findGame(b4, 'GF-2');
assert(!!gf2, 'GF-2 (bracket reset) exists in structure');

// ─── 4-Team Bracket with BYE (3 teams) ───────────────────────────────────────

console.log('\n── 3-Team Bracket (size 4, 1 bye) ──');
const seeds3 = ['Team1', 'Team2', 'Team3'];
const b3 = generateBracketFromTeams(seeds3);

assert(b3.bracketSize === 4, 'bracket size rounds up to 4');

// Top seed (seed 1) should get the bye
const placements3 = generateSeedPlacements(4, 3);
const byeSlot = placements3.findIndex(s => s === -1);
assert(byeSlot >= 0, `bye slot exists at position ${byeSlot}`);

// The game containing the bye slot should be marked isBye
const byeGame = b3.games.find(g => g.isBye);
assert(!!byeGame, 'A game is marked isBye');
assert(byeGame?.bracket === 'winners', 'Bye game is in winners bracket');
assert(byeGame?.round === 1, 'Bye game is in round 1');

// ─── 8-Team Bracket ───────────────────────────────────────────────────────────
//
// Standard 8-team double-elimination reference:
//
// Winners R1: 4 games (W-R1-G1 through G4)
// Winners R2: 2 games (W-R2-G1, W-R2-G2)
// Winners Final: 1 game (W-R3-G1)
//
// Losers R1: 2 games (L-R1-G1, L-R1-G2) — losers from WR1, cross-paired
// Losers R2: 2 games (L-R2-G1, L-R2-G2) — LR1 survivors vs each other
// Losers R3: 1 game (L-R3-G1) — LR2 winner vs WR2 loser
// Losers R4: 1 game (L-R4-G1) — LR3 winner vs WR2 other loser
//   (actually: both WR2 losers drop into LR3, survivors play in LR4)
// Losers Final: 1 game (L-R4 or L-R5 depending on counting)
//
// Grand Final + optional reset

console.log('\n── 8-Team Bracket ──');
const seeds8 = ['T1','T2','T3','T4','T5','T6','T7','T8'];
const b8 = generateBracketFromTeams(seeds8);

assert(b8.bracketSize === 8, 'bracket size is 8');

// Winners bracket: 7 games (R1:4, R2:2, R3:1)
const wGames8 = b8.games.filter(g => g.bracket === 'winners');
assert(wGames8.length === 7, `winners bracket has 7 games (got ${wGames8.length})`);

// Winners R1: 4 games
const wR1_8 = wGames8.filter(g => g.round === 1);
assert(wR1_8.length === 4, `winners R1 has 4 games (got ${wR1_8.length})`);

// Winners R2: 2 games
const wR2_8 = wGames8.filter(g => g.round === 2);
assert(wR2_8.length === 2, `winners R2 has 2 games (got ${wR2_8.length})`);

// Losers bracket: 6 games (R1:2, R2:2, R3:1, R4:1)
const lGames8 = b8.games.filter(g => g.bracket === 'losers');
assert(lGames8.length === 6, `losers bracket has 6 games (got ${lGames8.length})`);

// Losers R1: 2 games (cross-paired losers from WR1)
const lR1_8 = lGames8.filter(g => g.round === 1);
assert(lR1_8.length === 2, `losers R1 has 2 games (got ${lR1_8.length})`);

// Every WR1 loser should have a drop destination
wR1_8.forEach(game => {
  assert(game.loserDropsTo !== null, `${game.id} loser has a drop destination`);
});

// Every WR2 loser should also have a drop destination
wR2_8.forEach(game => {
  assert(game.loserDropsTo !== null, `${game.id} loser has a drop destination`);
});

// Grand final exists
const gf_8 = findGame(b8, 'GF-1');
assert(!!gf_8, 'GF-1 exists in 8-team bracket');

// ─── Max Team Count ───────────────────────────────────────────────────────────

console.log('\n── Max Team Count Validation ──');
try {
  generateBracketFromTeams(Array.from({ length: 25 }, (_, i) => `Team${i + 1}`));
  assert(false, '25 teams should throw an error');
} catch (e: any) {
  assert(e.message.includes('24'), `25 teams throws correct error: "${e.message}"`);
}

// 24 teams should succeed (rounds up to size 32)
const seeds24 = Array.from({ length: 24 }, (_, i) => `Team${i + 1}`);
const b24 = generateBracketFromTeams(seeds24);
assert(b24.bracketSize === 32, '24 teams → bracket size 32');

// ─── Determinism Check ───────────────────────────────────────────────────────

console.log('\n── Determinism ──');
const teamsForDet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const det1 = generateBracketFromTeams(teamsForDet);
const det2 = generateBracketFromTeams(teamsForDet);
assert(
  JSON.stringify(det1) === JSON.stringify(det2),
  'Same input always produces identical bracket structure'
);

// ─── Step 3: Bye Placement and Seeding ───────────────────────────────────────
//
// For any non-power-of-two team count:
//   - Bracket size rounds up to next power of two
//   - Correct number of byes are created
//   - Byes land on TOP seed positions (after random shuffle, the teams in
//     positions 1..byeCount get the byes — per spec)
//   - Bye games are marked isBye=true
//   - Bye games only appear in winners R1
//   - Every bye game has exactly one real team and one null (BYE) opponent

console.log('\n── Step 3: Bye Placement ──');

// Helper: count byes in a bracket
function countByeGames(bracket: BracketStructure): number {
  return bracket.games.filter(g => g.isBye).length;
}

// 5 teams → size 8, 3 byes
const b5 = generateBracketFromTeams(['T1','T2','T3','T4','T5']);
assert(b5.bracketSize === 8, '5 teams → bracket size 8');
assert(countByeGames(b5) === 3, '5 teams → 3 bye games');
assert(
  b5.games.filter(g => g.isBye).every(g => g.bracket === 'winners' && g.round === 1),
  'All bye games are in winners R1'
);

// 6 teams → size 8, 2 byes
const b6 = generateBracketFromTeams(['T1','T2','T3','T4','T5','T6']);
assert(b6.bracketSize === 8, '6 teams → bracket size 8');
assert(countByeGames(b6) === 2, '6 teams → 2 bye games');

// 7 teams → size 8, 1 bye
const b7 = generateBracketFromTeams(['T1','T2','T3','T4','T5','T6','T7']);
assert(b7.bracketSize === 8, '7 teams → bracket size 8');
assert(countByeGames(b7) === 1, '7 teams → 1 bye game');

// 9 teams → size 16, 7 byes
const b9 = generateBracketFromTeams(['T1','T2','T3','T4','T5','T6','T7','T8','T9']);
assert(b9.bracketSize === 16, '9 teams → bracket size 16');
assert(countByeGames(b9) === 7, '9 teams → 7 bye games');

// 11 teams → size 16, 5 byes
const b11 = generateBracketFromTeams(Array.from({length:11},(_,i)=>`T${i+1}`));
assert(b11.bracketSize === 16, '11 teams → bracket size 16');
assert(countByeGames(b11) === 5, '11 teams → 5 bye games');

// 13 teams → size 16, 3 byes
const b13 = generateBracketFromTeams(Array.from({length:13},(_,i)=>`T${i+1}`));
assert(b13.bracketSize === 16, '13 teams → bracket size 16');
assert(countByeGames(b13) === 3, '13 teams → 3 bye games');

// 17 teams → size 32, 15 byes
const b17 = generateBracketFromTeams(Array.from({length:17},(_,i)=>`T${i+1}`));
assert(b17.bracketSize === 32, '17 teams → bracket size 32');
assert(countByeGames(b17) === 15, '17 teams → 15 bye games');

console.log('\n── Step 3: Bye Game Structure ──');

// Bye games should have exactly one real team and one null slot
// topSeed or bottomSeed should be -1 (BYE marker) on bye games
const byeGames5 = b5.games.filter(g => g.isBye);
assert(
  byeGames5.every(g => g.topSeed === -1 || g.bottomSeed === -1),
  'Every bye game has exactly one BYE slot (-1)'
);
assert(
  byeGames5.every(g => !(g.topSeed === -1 && g.bottomSeed === -1)),
  'No bye game has two BYE slots (at least one real team per game)'
);

// Byes should be on the top seed positions
// After generateSeedPlacements for 5 teams in size 8:
// Top seeds (positions 1, 2, 3) get byes — their games are marked isBye
const placements5 = generateSeedPlacements(8, 5);
const byeSlotCount5 = placements5.filter(s => s === -1).length;
assert(byeSlotCount5 === 3, `5 teams in size-8 bracket has 3 bye slots in placement (got ${byeSlotCount5})`);

console.log('\n── Step 3: Bye Auto-Advancement ──');

// Per spec: a bye team automatically advances to round 2 with no loss.
// In the bracket structure, this means:
//   - The bye game's winner advances to a round 2 game (winnerAdvancesTo is set)
//   - The bye game has no loserDropsTo (no one loses a bye game)
//   - The bye game is NOT fed by two prior games (fedByWinner is null — seeded directly)

byeGames5.forEach(g => {
  assert(g.winnerAdvancesTo !== null, `${g.id}: bye game winner has an advancement destination`);
  assert(g.loserDropsTo === null, `${g.id}: bye game has no loser drop (no one loses a bye)`);
  assert(g.fedByWinner === null, `${g.id}: bye game is seeded directly, not fed by prior games`);
});

// The round 2 games that receive bye auto-advancers should exist
byeGames5.forEach(g => {
  const r2Game = findGame(b5, g.winnerAdvancesTo!);
  assert(!!r2Game, `${g.id}: winnerAdvancesTo game '${g.winnerAdvancesTo}' exists in bracket`);
  assert(r2Game?.round === 2, `${g.id}: bye winner advances to a round 2 game`);
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) {
  console.error('❌ Some validations failed. Do not proceed to step 4 until all pass.');
  process.exit(1);
} else {
  console.log('✅ All validations passed. Safe to proceed to step 4.');
}