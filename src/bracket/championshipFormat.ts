/**
 * Zony Championship Format Module — Step 4
 *
 * Handles the single decision point at the end of a double-elimination bracket:
 * what happens after the grand final (GF-1) is decided.
 *
 * This module has no knowledge of courts, times, schedules, or Firestore.
 * It takes a game result and a format setting, and returns a decision.
 *
 * Per spec:
 *   Single Championship Game (DEFAULT): GF-1 winner is champion, no exceptions.
 *   Double Championship Game: if the losers-bracket team wins GF-1, GF-2 is required.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChampionshipFormat = 'single' | 'double';

export type BracketPath = 'winners' | 'losers';

export type GrandFinalResult = {
  winnerId: string;   // team id of who won GF-1
  loserId: string;    // team id of who lost GF-1
  winnerPath: BracketPath; // which bracket the winner came from
};

export type ChampionshipDecision =
  | { outcome: 'champion'; championId: string }
  | { outcome: 'reset_required'; resetGameId: 'GF-2' };

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * resolveGrandFinal — the single championship decision point.
 *
 * Given the result of GF-1 and the tournament's championship format setting,
 * returns either:
 *   - { outcome: 'champion', championId } — tournament is over
 *   - { outcome: 'reset_required', resetGameId: 'GF-2' } — a second game is needed
 *
 * This function is pure and deterministic:
 *   - No randomness
 *   - No side effects
 *   - Same inputs always produce same output
 */
export function resolveGrandFinal(
  result: GrandFinalResult,
  format: ChampionshipFormat
): ChampionshipDecision {
  if (format === 'single') {
    // Single Championship Game: GF-1 winner is always champion, no exceptions.
    // Even if the losers-bracket team wins, they are crowned champion immediately.
    return { outcome: 'champion', championId: result.winnerId };
  }

  // Double Championship Game:
  // If the winners-bracket team wins GF-1, they are champion.
  // They were undefeated coming in, and the losers-bracket team now has 2 losses.
  if (result.winnerPath === 'winners') {
    return { outcome: 'champion', championId: result.winnerId };
  }

  // The losers-bracket team won GF-1.
  // The previously-undefeated winners-bracket team now has exactly 1 loss.
  // Per double-elimination rules: neither team has 2 losses yet.
  // A bracket reset (GF-2) is required.
  return { outcome: 'reset_required', resetGameId: 'GF-2' };
}

/**
 * resolveReset — resolves GF-2 (the bracket reset game).
 *
 * GF-2 is only ever played when format === 'double' AND the losers-bracket
 * team won GF-1. After GF-2, whoever wins is champion regardless of bracket path,
 * since both teams now have exactly 1 loss coming into GF-2.
 */
export function resolveReset(winnerId: string): ChampionshipDecision {
  return { outcome: 'champion', championId: winnerId };
}

/**
 * getChampionshipExplanation — returns the user-facing explanation string
 * for the championship format, per spec requirement to adjust the notice dynamically.
 */
export function getChampionshipExplanation(format: ChampionshipFormat): string {
  if (format === 'single') {
    return 'This tournament\'s championship is a single game — whoever wins it is champion, regardless of bracket path.';
  }
  return 'This tournament\'s championship may require a second game. If the team coming from the losers bracket wins the first championship game, a second game will be played to determine the champion.';
}