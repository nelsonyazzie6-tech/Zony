/**
 * Zony Bracket Engine — Step 1: Core Generator
 *
 * Pure, deterministic logic only. No UI, no Firestore, no randomness.
 * The ONLY input is bracketSize (a power of two) and an ordered list of seed labels.
 * Given the same inputs, this function always produces identical output.
 *
 * Constraints from spec:
 * - Standard double-elimination structure
 * - Canonical losers-bracket mapping (no custom per-tournament logic)
 * - Explicit dependency graph (no implicit "next game" assumptions)
 * - Bracket engine has zero knowledge of courts, times, or dates
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GameId = string; // e.g. "W-R1-G1", "L-R2-G1", "GF-1", "GF-2"

export type BracketGame = {
  id: GameId;
  bracket: 'winners' | 'losers' | 'final';
  round: number;         // 1-indexed round within its bracket
  position: number;      // 1-indexed position within that round
  topSeed: number | null;    // null = TBD (filled in by a prior game's winner/loser)
  bottomSeed: number | null; // null for same reason; -1 = BYE
  isBye: boolean;
  // Explicit dependency graph — NEVER infer next game from position
  fedByWinner: [GameId, GameId] | null; // two games whose winners play here; null if seeded directly
  winnerAdvancesTo: GameId | null;      // where the winner of this game goes
  loserDropsTo: GameId | null;          // where the loser goes (null for losers-bracket games = eliminated)
};

export type BracketStructure = {
  bracketSize: number;
  games: BracketGame[];
  grandFinalId: GameId;
  bracketResetId: GameId | null; // only exists when generated; populated at championship time
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_AUTO_BRACKET_TEAMS = 24;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the next power of two >= n */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Returns log base 2 of n (n must be a power of two) */
function log2(n: number): number {
  return Math.log2(n);
}

/**
 * Standard single-elimination seeding placement for a bracket of size N.
 * Produces slot assignments so that seed 1 and seed 2 are on opposite sides,
 * and can only meet in the final.
 *
 * Returns an array of length N where each index is a bracket slot (0-indexed)
 * and the value is the seed number (1-indexed) assigned to that slot.
 * Byes are represented by -1.
 */
export function generateSeedPlacements(bracketSize: number, teamCount: number): number[] {
  const slots: number[] = new Array(bracketSize).fill(-1); // -1 = BYE

  // Standard tournament seeding algorithm: place seeds to maximize separation
  // Seeds 1..teamCount get placed, rest are byes
  const placements: number[] = [];

  function place(seeds: number[]): number[] {
    if (seeds.length === 1) return seeds;
    const result: number[] = [];
    const half = seeds.length / 2;
    const top = seeds.slice(0, half);
    const bottom = seeds.slice(half);
    for (let i = 0; i < half; i++) {
      result.push(top[i], bottom[half - 1 - i]);
    }
    return result;
  }

  // Build seed list: 1..teamCount, padded with byes (-1) to bracketSize
  const seedList = Array.from({ length: teamCount }, (_, i) => i + 1);
  while (seedList.length < bracketSize) seedList.push(-1);

  // Apply the separation placement
  let arranged = [...seedList];
  for (let round = 0; round < log2(bracketSize); round++) {
    const chunks: number[][] = [];
    const chunkSize = Math.pow(2, round + 1);
    for (let i = 0; i < arranged.length; i += chunkSize) {
      chunks.push(place(arranged.slice(i, i + chunkSize)));
    }
    arranged = chunks.flat();
  }

  return arranged;
}

// ─── Losers Bracket Mapping ───────────────────────────────────────────────────

/**
 * Canonical double-elimination losers-bracket drop mapping.
 *
 * For a bracket of size N, returns a map from winners-bracket game id
 * to the losers-bracket game id that loser drops into.
 *
 * Cross-pairing rule for WR1 → LR1:
 *   Each LR1 game receives TWO losers from WR1.
 *   Standard pairing: game at position i pairs with game at position (gamesPerR1 - 1 - i)
 *   This ensures teams that could have met in WR1 are separated in the losers bracket.
 *   e.g. for 8-team: W-R1-G1 loser + W-R1-G4 loser → L-R1-G1
 *                     W-R1-G2 loser + W-R1-G3 loser → L-R1-G2
 *   For 4-team:       W-R1-G1 loser + W-R1-G2 loser → L-R1-G1
 *
 * WR2+ → corresponding losers rounds:
 *   Winners round R (R >= 2) losers drop into losers round (2R - 2)
 *   One dropin per losers game at that round.
 */
function buildLoserDropMap(
  bracketSize: number,
  winnersGames: BracketGame[],
  losersGames: BracketGame[]
): Map<GameId, GameId> {
  const map = new Map<GameId, GameId>();

  // ── WR1 → LR1 cross-pairing ──────────────────────────────────────────────
  const wR1Games = winnersGames
    .filter(g => g.round === 1)
    .sort((a, b) => a.position - b.position);
  const lR1Games = losersGames
    .filter(g => g.round === 1)
    .sort((a, b) => a.position - b.position);

  // Each LR1 game receives exactly 2 WR1 losers:
  // L-R1-G1 ← losers from W-R1-G1 and W-R1-G(last)
  // L-R1-G2 ← losers from W-R1-G2 and W-R1-G(last-1)
  // etc.
  const halfW = wR1Games.length; // e.g. 4 for 8-team, 2 for 4-team
  for (let i = 0; i < lR1Games.length; i++) {
    const lGame = lR1Games[i];
    const wTop = wR1Games[i];                      // top half: G1, G2...
    const wBottom = wR1Games[halfW - 1 - i];       // bottom half: G4, G3... (reversed)
    if (wTop) map.set(wTop.id, lGame.id);
    if (wBottom && wBottom.id !== wTop?.id) map.set(wBottom.id, lGame.id);
  }

  // ── WR2+ → corresponding losers rounds ───────────────────────────────────
  // With corrected structure:
  //   WR2 → LR2 (1 loser per LR2 game, matched with LR1 survivor)
  //   WR3 → LR4 (1 loser per LR4 game, matched with LR3 survivor)
  //   WR4 → LR6
  //   Pattern: WR(r) → LR((r-1)*2) for r >= 2
  const wRounds = Math.log2(bracketSize);
  for (let wRound = 2; wRound <= wRounds; wRound++) {
    const actualTargetLRound = (wRound - 1) * 2;
    const wRGames = winnersGames
      .filter(g => g.round === wRound)
      .sort((a, b) => a.position - b.position);
    const lTargetGames = losersGames
      .filter(g => g.round === actualTargetLRound)
      .sort((a, b) => a.position - b.position);

    // Match 1-to-1: each WR loser goes to one LR game
    wRGames.forEach((wGame, i) => {
      const lGame = lTargetGames[i] || lTargetGames[lTargetGames.length - 1];
      if (lGame) map.set(wGame.id, lGame.id);
    });
  }

  return map;
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * generateBracket — the core bracket engine.
 *
 * Input:
 *   - bracketSize: must be a power of two (4, 8, 16, 32)
 *   - seeds: ordered array of seed labels (strings), length === bracketSize
 *            BYE slots should already be in the correct positions per generateSeedPlacements()
 *
 * Output:
 *   - Complete BracketStructure with all games, dependencies, and cross-links
 *   - No randomness — same input always produces same output
 *   - No knowledge of courts, times, or dates
 */
export function generateBracket(bracketSize: number, seeds: (string | null)[]): BracketStructure {
  if (seeds.length !== bracketSize) {
    throw new Error(`seeds length (${seeds.length}) must equal bracketSize (${bracketSize})`);
  }

  const wRounds = log2(bracketSize);
  const allGames: BracketGame[] = [];

  // ── Winners Bracket ────────────────────────────────────────────────────────

  // Round 1: seed matchups from the placement array
  const wR1Games: BracketGame[] = [];
  for (let i = 0; i < bracketSize; i += 2) {
    const pos = i / 2 + 1;
    const id: GameId = `W-R1-G${pos}`;
    const topSeedVal = i + 1;     // seed number (1-indexed slot position)
    const bottomSeedVal = i + 2;
    const topIsBye = seeds[i] === null;
    const bottomIsBye = seeds[i + 1] === null;
    const isBye = topIsBye || bottomIsBye;

    wR1Games.push({
      id,
      bracket: 'winners',
      round: 1,
      position: pos,
      topSeed: topIsBye ? -1 : topSeedVal,
      bottomSeed: bottomIsBye ? -1 : bottomSeedVal,
      isBye,
      fedByWinner: null, // seeded directly
      winnerAdvancesTo: null, // filled in below
      loserDropsTo: null,     // filled in below
    });
  }
  allGames.push(...wR1Games);

  // Rounds 2..wRounds (winners bracket progression)
  let prevRoundGames = wR1Games;
  for (let r = 2; r <= wRounds; r++) {
    const roundGames: BracketGame[] = [];
    for (let p = 0; p < prevRoundGames.length / 2; p++) {
      const id: GameId = `W-R${r}-G${p + 1}`;
      const feeder1 = prevRoundGames[p * 2];
      const feeder2 = prevRoundGames[p * 2 + 1];

      roundGames.push({
        id,
        bracket: r === wRounds ? 'winners' : 'winners',
        round: r,
        position: p + 1,
        topSeed: null,
        bottomSeed: null,
        isBye: false,
        fedByWinner: [feeder1.id, feeder2.id],
        winnerAdvancesTo: null,
        loserDropsTo: null,
      });

      // Wire feeders' winnerAdvancesTo
      feeder1.winnerAdvancesTo = id;
      feeder2.winnerAdvancesTo = id;
    }
    allGames.push(...roundGames);
    prevRoundGames = roundGames;
  }

  // The last winners-bracket game (before grand final) is the winners final
  const winnersFinalGame = prevRoundGames[0];
  winnersFinalGame.bracket = 'winners';

  // ── Losers Bracket ────────────────────────────────────────────────────────
  //
  // Correct canonical structure:
  //   LR1: bracketSize/4 games — each receives 2 WR1 losers (dropin, special)
  //   LR2: bracketSize/4 games — each LR1 winner plays a WR2 loser (dropin)
  //   LR3: bracketSize/8 games — LR2 winners play each other (survivors)
  //   LR4: bracketSize/8 games — each LR3 winner plays a WR3 loser (dropin)
  //   LR5: bracketSize/16 games — survivors
  //   ... alternates dropin/survivors until 1 game remains (losers final)
  //
  //   Round type:
  //     LR1 = special dropin (2 WR1 losers per game)
  //     LR2 = dropin (1 LR1 winner + 1 WR2 loser per game)
  //     LR3 = survivors (2 LR2 winners per game)
  //     LR4 = dropin ...
  //   isDropin(lr) = lr <= 2 || lr % 2 === 0
  //   isSurvivors(lr) = lr > 2 && lr % 2 === 1

  const lRounds = (wRounds - 1) * 2;
  const losersGames: BracketGame[] = [];
  const losersByRound: BracketGame[][] = [];

  let prevLRoundCount = bracketSize / 4; // LR1 game count

  for (let lr = 1; lr <= lRounds; lr++) {
    // LR1 and LR2 are both full-count dropin rounds
    // LR3+ alternates: odd = survivors (halves), even = dropin (same count)
    let gamesThisRound: number;
    if (lr <= 2) {
      gamesThisRound = bracketSize / 4;
    } else if (lr % 2 === 1) {
      // survivors round: halves
      gamesThisRound = Math.max(1, prevLRoundCount / 2);
    } else {
      // dropin round: same count as previous
      gamesThisRound = prevLRoundCount;
    }

    const roundGames: BracketGame[] = [];
    for (let p = 0; p < gamesThisRound; p++) {
      const id: GameId = `L-R${lr}-G${p + 1}`;
      roundGames.push({
        id,
        bracket: 'losers',
        round: lr,
        position: p + 1,
        topSeed: null,
        bottomSeed: null,
        isBye: false,
        fedByWinner: null,
        winnerAdvancesTo: null,
        loserDropsTo: null,
      });
    }

    losersGames.push(...roundGames);
    losersByRound.push(roundGames);
    prevLRoundCount = gamesThisRound;
  }
  allGames.push(...losersGames);

  // Last losers game winner goes to grand final (wired below)
  const losersFinalGame = losersByRound[lRounds - 1][0];

  // ── Cross-map: winners losers → losers bracket drop slots ─────────────────

  const winnersGames = allGames.filter(g => g.bracket === 'winners');
  const dropMap = buildLoserDropMap(bracketSize, winnersGames, losersGames);

  // Apply drop map to winners games
  winnersGames.forEach(wGame => {
    const lDest = dropMap.get(wGame.id);
    if (lDest) wGame.loserDropsTo = lDest;
  });

  // ── Wire losers bracket internal structure ─────────────────────────────────
  //
  // LR1: fed by WR1 losers (2 per game, handled via dropMap)
  // LR2: fed by (LR1 winner + WR2 loser) per game — dropin round
  // LR3: fed by (2 LR2 winners) per game — survivors round
  // LR4: fed by (LR3 winner + WR3 loser) per game — dropin round
  // ... alternating survivors/dropin from LR3 onwards

  // Wire LR1 fedByWinner from drop map
  losersByRound[0].forEach(lGame => {
    const feeders = winnersGames
      .filter(wGame => wGame.round === 1 && dropMap.get(wGame.id) === lGame.id)
      .sort((a, b) => a.position - b.position);
    if (feeders.length >= 2) {
      lGame.fedByWinner = [feeders[0].id, feeders[1].id];
    } else if (feeders.length === 1) {
      lGame.fedByWinner = [feeders[0].id, feeders[0].id];
    }
  });

  // Wire LR2+: alternate between dropin and survivors rounds
  for (let lr = 2; lr <= lRounds; lr++) {
    const isDropin = lr === 2 || lr % 2 === 0; // LR2, LR4, LR6... are dropin
    const isSurvivors = lr > 2 && lr % 2 === 1; // LR3, LR5, LR7... are survivors

    const thisRound = losersByRound[lr - 1];
    const prevRound = losersByRound[lr - 2];

    if (isDropin) {
      // Each game in this round: 1 survivor from prev round + 1 WR dropin
      thisRound.forEach((lGame, i) => {
        const survivor = prevRound[i];
        const wDropin = winnersGames.find(wg => dropMap.get(wg.id) === lGame.id) || null;

        if (survivor) survivor.winnerAdvancesTo = lGame.id;

        if (survivor && wDropin) {
          lGame.fedByWinner = [survivor.id, wDropin.id];
        } else if (survivor) {
          // No WR dropin found — shouldn't happen in valid brackets but handle gracefully
          lGame.fedByWinner = [survivor.id, survivor.id];
        }
      });
    } else if (isSurvivors) {
      // Each game in this round: 2 survivors from prev round play each other
      thisRound.forEach((lGame, i) => {
        const feeder1 = prevRound[i * 2];
        const feeder2 = prevRound[i * 2 + 1];

        if (feeder1) feeder1.winnerAdvancesTo = lGame.id;
        if (feeder2) feeder2.winnerAdvancesTo = lGame.id;

        if (feeder1 && feeder2) {
          lGame.fedByWinner = [feeder1.id, feeder2.id];
        } else if (feeder1) {
          lGame.fedByWinner = [feeder1.id, feeder1.id];
        }
      });
    }
  }

  // ── Grand Final ───────────────────────────────────────────────────────────

  const gfId: GameId = 'GF-1';
  const grandFinal: BracketGame = {
    id: gfId,
    bracket: 'final',
    round: 1,
    position: 1,
    topSeed: null,
    bottomSeed: null,
    isBye: false,
    fedByWinner: [winnersFinalGame.id, losersFinalGame.id],
    winnerAdvancesTo: null, // champion
    loserDropsTo: null,
  };
  allGames.push(grandFinal);

  winnersFinalGame.winnerAdvancesTo = gfId;
  losersFinalGame.winnerAdvancesTo = gfId;

  // Bracket reset game (only instantiated if Double Championship Game mode is selected at runtime)
  // We define its structure here but it's conditional — the bracket engine doesn't decide,
  // the execution layer does based on the championship format setting.
  const gfResetId: GameId = 'GF-2';
  const bracketReset: BracketGame = {
    id: gfResetId,
    bracket: 'final',
    round: 2,
    position: 1,
    topSeed: null,
    bottomSeed: null,
    isBye: false,
    fedByWinner: null, // fed by GF-1 participants if triggered
    winnerAdvancesTo: null,
    loserDropsTo: null,
  };
  allGames.push(bracketReset);

  return {
    bracketSize,
    games: allGames,
    grandFinalId: gfId,
    bracketResetId: gfResetId,
  };
}

// ─── Seeding Entry Point ──────────────────────────────────────────────────────

/**
 * generateBracketFromTeams — combines seeding + bye placement + bracket generation.
 *
 * Input:
 *   - teams: ordered array of team names, already randomly shuffled by the caller
 *            (the ONLY randomness in the system happens before this function is called)
 *
 * Output:
 *   - BracketStructure ready for Firestore write
 */
export function generateBracketFromTeams(teams: string[]): BracketStructure {
  const teamCount = teams.length;

  if (teamCount < 2) throw new Error('Need at least 2 teams');
  if (teamCount > MAX_AUTO_BRACKET_TEAMS) {
    throw new Error(`Automatic bracket generation supports a maximum of ${MAX_AUTO_BRACKET_TEAMS} teams per division. This division has ${teamCount} teams.`);
  }

  const bracketSize = nextPowerOfTwo(teamCount);
  const seedPlacements = generateSeedPlacements(bracketSize, teamCount);

  // Map slot positions to actual team names (null = BYE)
  const seeds: (string | null)[] = seedPlacements.map(slotSeed =>
    slotSeed === -1 ? null : (teams[slotSeed - 1] || null)
  );

  return generateBracket(bracketSize, seeds);
}