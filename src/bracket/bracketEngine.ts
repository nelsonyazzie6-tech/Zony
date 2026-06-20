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
 * Byes (-1) are placed last in the seed list before the separation algorithm runs,
 * so they land in the "bottom seed" positions in each matchup — meaning top seeds
 * (1, 2, 3...) are always the ones paired against byes and get the free pass.
 *
 * Returns an array of length N where each index is a bracket slot (0-indexed)
 * and the value is the seed number (1-indexed) assigned to that slot.
 * Byes are represented by -1.
 */
export function generateSeedPlacements(bracketSize: number, teamCount: number): number[] {
  const byeCount = bracketSize - teamCount;

  // Real seeds first, byes at the end.
  // The separation algorithm places later-listed seeds as opponents of earlier-listed seeds,
  // so byes at the end means they become opponents of the top seeds — giving top seeds the bye.
  const seedList: number[] = [
    ...Array.from({ length: teamCount }, (_, i) => i + 1),
    ...Array.from({ length: byeCount }, () => -1 as number),
  ];

  // Recursive separation algorithm: ensures seed 1 and seed 2 end up on opposite
  // halves of the bracket and can only meet in the final.
  function separate(seeds: number[]): number[] {
    if (seeds.length <= 2) return seeds;
    const half = seeds.length / 2;
    const top = separate(seeds.slice(0, half));
    const bottom = separate(seeds.slice(half));
    const result: number[] = [];
    for (let i = 0; i < top.length; i++) {
      result.push(top[i], bottom[top.length - 1 - i]);
    }
    return result;
  }

  return separate(seedList);
}

// ─── Losers Bracket Mapping ───────────────────────────────────────────────────
//
// NOTE: losers-bracket drop mapping is now computed directly inside
// generateBracket() by simulating actual loser flow round-by-round, rather
// than via a precomputed formula. This correctly handles non-power-of-2 team
// counts where byes compress the winners bracket unevenly. See the
// "Losers Bracket" section in generateBracket() below for the implementation.

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
  // Minimum bracket size is 4 — a 2-team double elimination bracket requires
  // at least a winners game + losers bracket + grand final structure
  if (bracketSize < 4) {
    throw new Error(`Minimum bracket size is 4 (minimum 2 real teams). Got bracketSize=${bracketSize}.`);
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
  // Built by simulating the actual flow of losers through the bracket, rather
  // than by a fixed formula based on bracketSize. This matters because byes
  // remove "losers" from the system unevenly — a heavily-bye winners round
  // produces fewer real losers than bracketSize/2 would suggest, and the old
  // formula-based approach silently dropped feeders when counts didn't match.
  //
  // Model: at each stage we carry forward a list of "tokens" — each token is
  // either a real losers-bracket game (its winner is the token's value) or a
  // raw winners-bracket game (a team that just lost and is entering the
  // losers bracket for the first time). Tokens get paired up into games each
  // round. When an odd token has no partner, it is NOT given a phantom
  // self-match — it passes through untouched to the next round, exactly like
  // a bye. This naturally handles every shape: heavy-bye brackets, brackets
  // where dropins outnumber survivors (bye-path teams losing in WR2+), and
  // anything in between.

  type LToken = { feedId: GameId; sourceGame: BracketGame };

  const realWR1Games = wR1Games.filter(g => !g.isBye).sort((a, b) => a.position - b.position);

  const losersGames: BracketGame[] = [];
  let lr = 0;

  /** Pairs up a list of tokens into one losers-bracket round. Any leftover
   *  unpaired token passes through as-is (no game created for it). */
  function pairTokens(tokens: LToken[]): LToken[] {
    if (tokens.length === 0) return [];
    if (tokens.length === 1) return tokens; // pass through untouched
    lr++;
    const roundGames: BracketGame[] = [];
    const nextTokens: LToken[] = [];
    let i = 0, j = tokens.length - 1, pos = 1;
    while (i < j) {
      const t1 = tokens[i];
      const t2 = tokens[j];
      const id: GameId = `L-R${lr}-G${pos}`;
      const game: BracketGame = {
        id, bracket: 'losers', round: lr, position: pos,
        topSeed: null, bottomSeed: null, isBye: false,
        fedByWinner: [t1.feedId, t2.feedId],
        winnerAdvancesTo: null, loserDropsTo: null,
      };
      // Only losers-bracket source games advance their WINNER here — a
      // winners-bracket source game's winnerAdvancesTo belongs to its own
      // winners-bracket progression (already wired earlier) and must never
      // be touched; its LOSER's destination is wired separately via the
      // loserDropsTo cross-map step below, driven by fedByWinner.
      if (t1.sourceGame.bracket === 'losers') t1.sourceGame.winnerAdvancesTo = id;
      if (t2.sourceGame.bracket === 'losers') t2.sourceGame.winnerAdvancesTo = id;
      roundGames.push(game);
      nextTokens.push({ feedId: id, sourceGame: game });
      i++; j--; pos++;
    }
    if (i === j) {
      // Odd one out — passes through to next round untouched.
      nextTokens.push(tokens[i]);
    }
    losersGames.push(...roundGames);
    return nextTokens;
  }

  // LR1: every real WR1 loser becomes a token entering the losers bracket.
  let survivorTokens: LToken[] = realWR1Games.map(g => ({ feedId: g.id, sourceGame: g }));
  survivorTokens = pairTokens(survivorTokens);

  // Pre-compute, for each winners round >= 2, the ordered list of games that
  // produce a real loser (WR games are never byes past round 1).
  const wRoundLosers: BracketGame[][] = [];
  for (let r = 2; r <= wRounds; r++) {
    wRoundLosers[r] = allGames.filter(g => g.bracket === 'winners' && g.round === r).sort((a, b) => a.position - b.position);
  }

  for (let wRound = 2; wRound <= wRounds; wRound++) {
    // Dropin stage: merge current survivor tokens with this WR round's fresh
    // losers, then pair. Survivors and fresh dropins are equally valid
    // tokens — there's no structural difference between "a team that won a
    // losers-bracket game" and "a team that just lost in the winners
    // bracket" at this point, they're just tokens waiting for an opponent.
    const dropinTokens: LToken[] = wRoundLosers[wRound].map(g => ({ feedId: g.id, sourceGame: g }));
    survivorTokens = pairTokens([...survivorTokens, ...dropinTokens]);

    // Survivors-only stage: pair remaining survivors among themselves before
    // the next winners round's losers arrive. (Skipped automatically by
    // pairTokens when there's 0 or 1 token — no-op pass-through.)
    if (wRound < wRounds) {
      survivorTokens = pairTokens(survivorTokens);
    }
  }

  // Collapse any remaining survivor tokens down to a single losers finalist.
  while (survivorTokens.length > 1) {
    survivorTokens = pairTokens(survivorTokens);
  }

  if (survivorTokens.length !== 1) {
    throw new Error('Losers bracket failed to resolve to a single finalist — this indicates a bug in bracket generation.');
  }
  const losersFinalGame = survivorTokens[0].sourceGame;

  allGames.push(...losersGames);

  // ── Cross-map: winners losers → losers bracket drop slots ─────────────────
  // Built directly from the fedByWinner wiring above (each losers game's
  // feeders that are winners-bracket games define where that WR game's
  // loser drops to) — this guarantees loserDropsTo and fedByWinner can
  // never disagree, unlike the old approach which computed them separately.

  const winnersGames = allGames.filter(g => g.bracket === 'winners');
  losersGames.forEach(lGame => {
    if (!lGame.fedByWinner) return;
    lGame.fedByWinner.forEach(feederId => {
      const wGame = winnersGames.find(wg => wg.id === feederId);
      if (wGame && !wGame.isBye) wGame.loserDropsTo = lGame.id;
    });
  });

  // Degenerate case: with only 2 real teams, there are no losers-bracket
  // games at all — the single winners-bracket game's WINNER feeds GF-1's
  // top slot, and that same game's LOSER must feed GF-1's bottom slot
  // directly (the standard "loser gets one more chance" minimum case).
  const isDegenerateTwoTeam = losersFinalGame.id === winnersFinalGame.id;
  if (isDegenerateTwoTeam) {
    winnersFinalGame.loserDropsTo = 'GF-1';
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
    fedByWinner: isDegenerateTwoTeam ? [winnersFinalGame.id, winnersFinalGame.id] : [winnersFinalGame.id, losersFinalGame.id],
    winnerAdvancesTo: null, // champion
    loserDropsTo: null,
  };
  allGames.push(grandFinal);

  winnersFinalGame.winnerAdvancesTo = gfId;
  if (!isDegenerateTwoTeam) losersFinalGame.winnerAdvancesTo = gfId;

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

  const bracketSize = Math.max(4, nextPowerOfTwo(teamCount));
  const seedPlacements = generateSeedPlacements(bracketSize, teamCount);

  // Map slot positions to actual team names (null = BYE)
  const seeds: (string | null)[] = seedPlacements.map(slotSeed =>
    slotSeed === -1 ? null : (teams[slotSeed - 1] || null)
  );

  return generateBracket(bracketSize, seeds);
}