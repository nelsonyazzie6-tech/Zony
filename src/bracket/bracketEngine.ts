/**
 * Zony Bracket Engine — Step 1: Core Generator
 *
 * Pure, deterministic logic only. No UI, no Firestore, no randomness.
 * The ONLY input is bracketSize (a power of two) and an ordered list of seed labels.
 * Given the same inputs, this function always produces identical output.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GameId = string; // e.g. "W-R1-G1", "L-R2-G1", "GF-1", "GF-2"

export type BracketSlot = 'top' | 'bottom';

export type BracketGame = {
  id: GameId;
  bracket: 'winners' | 'losers' | 'final';
  round: number;
  position: number;
  topSeed: number | null;
  bottomSeed: number | null;
  isBye: boolean;
  fedByWinner: [GameId, GameId] | null;
  winnerAdvancesTo: GameId | null;
  winnerAdvancesToSlot: BracketSlot | null;
  loserDropsTo: GameId | null;
  loserDropsToSlot: BracketSlot | null;
};

export type BracketStructure = {
  bracketSize: number;
  games: BracketGame[];
  grandFinalId: GameId;
  bracketResetId: GameId | null;
};

export const MAX_AUTO_BRACKET_TEAMS = 24;

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function log2(n: number): number {
  return Math.log2(n);
}

/**
 * Standard tournament seeding placement (the reflection algorithm behind
 * published 1v8/4v5/2v7/3v6-style seeding tables). Guarantees seed 1 and
 * seed 2 can never meet before the final, and that byes always land on the
 * top remaining seeds.
 */
export function generateSeedPlacements(bracketSize: number, teamCount: number): number[] {
  let order: number[] = [1];
  let size = 1;
  while (size < bracketSize) {
    const newSize = size * 2;
    const next: number[] = [];
    for (const v of order) {
      next.push(v, newSize + 1 - v);
    }
    order = next;
    size = newSize;
  }
  return order.map(seed => (seed > teamCount ? -1 : seed));
}

export function generateBracket(bracketSize: number, seeds: (string | null)[]): BracketStructure {
  if (seeds.length !== bracketSize) {
    throw new Error(`seeds length (${seeds.length}) must equal bracketSize (${bracketSize})`);
  }
  if (bracketSize < 4) {
    throw new Error(`Minimum bracket size is 4 (minimum 2 real teams). Got bracketSize=${bracketSize}.`);
  }

  const wRounds = log2(bracketSize);
  const allGames: BracketGame[] = [];

  // ── Winners Bracket ──
  const wR1Games: BracketGame[] = [];
  for (let i = 0; i < bracketSize; i += 2) {
    const pos = i / 2 + 1;
    const id: GameId = `W-R1-G${pos}`;
    const topSeedVal = i + 1;
    const bottomSeedVal = i + 2;
    const topIsBye = seeds[i] === null;
    const bottomIsBye = seeds[i + 1] === null;
    const isBye = topIsBye || bottomIsBye;

    wR1Games.push({
      id, bracket: 'winners', round: 1, position: pos,
      topSeed: topIsBye ? -1 : topSeedVal,
      bottomSeed: bottomIsBye ? -1 : bottomSeedVal,
      isBye,
      fedByWinner: null, winnerAdvancesTo: null, winnerAdvancesToSlot: null,
      loserDropsTo: null, loserDropsToSlot: null,
    });
  }
  allGames.push(...wR1Games);

  let prevRoundGames = wR1Games;
  for (let r = 2; r <= wRounds; r++) {
    const roundGames: BracketGame[] = [];
    for (let p = 0; p < prevRoundGames.length / 2; p++) {
      const id: GameId = `W-R${r}-G${p + 1}`;
      const feeder1 = prevRoundGames[p * 2];
      const feeder2 = prevRoundGames[p * 2 + 1];

      roundGames.push({
        id, bracket: 'winners', round: r, position: p + 1,
        topSeed: null, bottomSeed: null, isBye: false,
        fedByWinner: [feeder1.id, feeder2.id],
        winnerAdvancesTo: null, winnerAdvancesToSlot: null,
        loserDropsTo: null, loserDropsToSlot: null,
      });

      feeder1.winnerAdvancesTo = id;
      feeder1.winnerAdvancesToSlot = 'top';
      feeder2.winnerAdvancesTo = id;
      feeder2.winnerAdvancesToSlot = 'bottom';
    }
    allGames.push(...roundGames);
    prevRoundGames = roundGames;
  }

  const winnersFinalGame = prevRoundGames[0];
  winnersFinalGame.bracket = 'winners';

  // ── Losers Bracket — simulated token flow, never a fixed formula ──
  type LToken = { feedId: GameId; sourceGame: BracketGame };

  const realWR1Games = wR1Games.filter(g => !g.isBye).sort((a, b) => a.position - b.position);
  const losersGames: BracketGame[] = [];
  let lr = 0;

  function pairTokens(tokens: LToken[]): LToken[] {
    if (tokens.length === 0) return [];
    if (tokens.length === 1) return tokens;
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
        winnerAdvancesTo: null, winnerAdvancesToSlot: null,
        loserDropsTo: null, loserDropsToSlot: null,
      };
      if (t1.sourceGame.bracket === 'losers') {
        t1.sourceGame.winnerAdvancesTo = id;
        t1.sourceGame.winnerAdvancesToSlot = 'top';
      }
      if (t2.sourceGame.bracket === 'losers') {
        t2.sourceGame.winnerAdvancesTo = id;
        t2.sourceGame.winnerAdvancesToSlot = 'bottom';
      }
      roundGames.push(game);
      nextTokens.push({ feedId: id, sourceGame: game });
      i++; j--; pos++;
    }
    if (i === j) nextTokens.push(tokens[i]);
    losersGames.push(...roundGames);
    return nextTokens;
  }

  let survivorTokens: LToken[] = realWR1Games.map(g => ({ feedId: g.id, sourceGame: g }));
  survivorTokens = pairTokens(survivorTokens);

  const wRoundLosers: BracketGame[][] = [];
  for (let r = 2; r <= wRounds; r++) {
    wRoundLosers[r] = allGames.filter(g => g.bracket === 'winners' && g.round === r).sort((a, b) => a.position - b.position);
  }

  for (let wRound = 2; wRound <= wRounds; wRound++) {
    const dropinTokens: LToken[] = wRoundLosers[wRound].map(g => ({ feedId: g.id, sourceGame: g }));
    survivorTokens = pairTokens([...survivorTokens, ...dropinTokens]);
    if (wRound < wRounds) {
      survivorTokens = pairTokens(survivorTokens);
    }
  }

  while (survivorTokens.length > 1) {
    survivorTokens = pairTokens(survivorTokens);
  }

  if (survivorTokens.length !== 1) {
    throw new Error('Losers bracket failed to resolve to a single finalist — this indicates a bug in bracket generation.');
  }
  const losersFinalGame = survivorTokens[0].sourceGame;
  allGames.push(...losersGames);

  // ── Cross-map: winners losers → losers bracket drop slots ──
  const winnersGames = allGames.filter(g => g.bracket === 'winners');
  losersGames.forEach(lGame => {
    if (!lGame.fedByWinner) return;
    lGame.fedByWinner.forEach((feederId, idx) => {
      const wGame = winnersGames.find(wg => wg.id === feederId);
      if (wGame && !wGame.isBye) {
        wGame.loserDropsTo = lGame.id;
        wGame.loserDropsToSlot = idx === 0 ? 'top' : 'bottom';
      }
    });
  });

  const isDegenerateTwoTeam = losersFinalGame.id === winnersFinalGame.id;
  if (isDegenerateTwoTeam) {
    winnersFinalGame.loserDropsTo = 'GF-1';
    winnersFinalGame.loserDropsToSlot = 'bottom';
  }

  // ── Grand Final ──
  const gfId: GameId = 'GF-1';
  const grandFinal: BracketGame = {
    id: gfId, bracket: 'final', round: 1, position: 1,
    topSeed: null, bottomSeed: null, isBye: false,
    fedByWinner: isDegenerateTwoTeam ? [winnersFinalGame.id, winnersFinalGame.id] : [winnersFinalGame.id, losersFinalGame.id],
    winnerAdvancesTo: null, winnerAdvancesToSlot: null,
    loserDropsTo: null, loserDropsToSlot: null,
  };
  allGames.push(grandFinal);

  winnersFinalGame.winnerAdvancesTo = gfId;
  winnersFinalGame.winnerAdvancesToSlot = 'top';
  if (!isDegenerateTwoTeam) {
    losersFinalGame.winnerAdvancesTo = gfId;
    losersFinalGame.winnerAdvancesToSlot = 'bottom';
  }

  const gfResetId: GameId = 'GF-2';
  allGames.push({
    id: gfResetId, bracket: 'final', round: 2, position: 1,
    topSeed: null, bottomSeed: null, isBye: false,
    fedByWinner: null, winnerAdvancesTo: null, winnerAdvancesToSlot: null,
    loserDropsTo: null, loserDropsToSlot: null,
  });

  return { bracketSize, games: allGames, grandFinalId: gfId, bracketResetId: gfResetId };
}

export function generateBracketFromTeams(teams: string[]): BracketStructure {
  const teamCount = teams.length;
  if (teamCount < 2) throw new Error('Need at least 2 teams');
  if (teamCount > MAX_AUTO_BRACKET_TEAMS) {
    throw new Error(`Automatic bracket generation supports a maximum of ${MAX_AUTO_BRACKET_TEAMS} teams per division. This division has ${teamCount} teams.`);
  }
  const bracketSize = Math.max(4, nextPowerOfTwo(teamCount));
  const seedPlacements = generateSeedPlacements(bracketSize, teamCount);
  const seeds: (string | null)[] = seedPlacements.map(slotSeed =>
    slotSeed === -1 ? null : (teams[slotSeed - 1] || null)
  );
  return generateBracket(bracketSize, seeds);
}