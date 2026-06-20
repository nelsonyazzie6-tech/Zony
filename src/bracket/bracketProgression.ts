/**
 * Zony Bracket Progression Engine — Step 6
 *
 * Handles result entry and automatic bracket advancement.
 *
 * This now shares its core advancement logic with bye resolution
 * (bracketAdvancement.ts's applyGameResult) instead of reimplementing slot
 * inference separately — that duplication was the source of a real bug:
 * the old positional inference (fedByWinnerOf[0] === sourceGameId) broke
 * for any 2-team tournament's grand final, where the lone winners-bracket
 * game feeds GF-1 as both winner AND loser. applyGameResult uses the
 * explicit winnerAdvancesToSlot/loserDropsToSlot fields instead, which
 * disambiguates that case correctly.
 *
 * Read-then-write now happens inside a Firestore transaction rather than
 * getDoc() + writeBatch(), closing a race condition where two feeders
 * writing into the same downstream game's two slots could each read a
 * stale "other slot is still empty" state and leave that game stuck at
 * 'pending' even after both slots were actually filled.
 *
 * Module separation (per spec):
 *   - This module knows about Firestore and bracket structure
 *   - It does NOT know about courts, times, or scheduling
 *   - It imports from bracketSchema (paths/types), bracketAdvancement (the
 *     shared advancement function), and championshipFormat (GF logic)
 *   - It does NOT import from bracketEngine (generation is complete by this point)
 */

import {
    doc,
    runTransaction,
    serverTimestamp,
    Transaction,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { applyGameResult, AdvancementGame } from './bracketAdvancement';
import { BracketDoc, BracketPaths, GameDoc } from './bracketSchema';
import {
    BracketPath,
    ChampionshipFormat,
    resolveGrandFinal
} from './championshipFormat';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnterResultInput = {
  tournamentId: string;
  divisionId: string;
  gameId: string;
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  topScore?: number | null;
  bottomScore?: number | null;
  enteredByUid: string;
};

export type ProgressionResult =
  | { outcome: 'advanced'; gamesUpdated: string[] }
  | { outcome: 'champion'; championId: string; championName: string }
  | { outcome: 'reset_required' };

// ─── Conversion helper ────────────────────────────────────────────────────────

function toAdvancementGame(g: GameDoc): AdvancementGame {
  return {
    id: g.id,
    isBye: g.isBye,
    status: g.status,
    topTeamId: g.topTeamId,
    topTeamName: g.topTeamName,
    bottomTeamId: g.bottomTeamId,
    bottomTeamName: g.bottomTeamName,
    winnerId: g.winnerId,
    winnerName: g.winnerName,
    loserId: g.loserId,
    loserName: g.loserName,
    winnerAdvancesTo: g.winnerAdvancesTo,
    winnerAdvancesToSlot: g.winnerAdvancesToSlot,
    loserDropsTo: g.loserDropsTo,
    loserDropsToSlot: g.loserDropsToSlot,
  };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * enterResult — organizer marks a winner for a game.
 *
 * Runs entirely inside a single Firestore transaction: reads the source
 * game, the bracket metadata, and whatever destination games it feeds
 * into, builds the same in-memory shape bracketAdvancement.ts uses for
 * byes, runs the one shared applyGameResult function, then writes back
 * exactly what it touched. No partial state is ever visible to live
 * listeners on other devices, and no destination game can be left
 * half-updated by a concurrent write.
 */
export async function enterResult(input: EnterResultInput): Promise<ProgressionResult> {
  const { tournamentId, divisionId, gameId, winnerId, winnerName, loserId, loserName } = input;

  const gameRef = doc(db, BracketPaths.game(tournamentId, divisionId, gameId));
  const bracketRef = doc(db, BracketPaths.bracket(tournamentId, divisionId));

  return await runTransaction(db, async (tx): Promise<ProgressionResult> => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error(`Game ${gameId} not found`);
    const game = gameSnap.data() as GameDoc;

    const bracketSnap = await tx.get(bracketRef);
    if (!bracketSnap.exists()) throw new Error('Bracket document not found');
    const bracket = bracketSnap.data() as BracketDoc;

    // ── Championship special cases (GF-1 and GF-2) ───────────────────────
    // These don't flow through normal winnerAdvancesTo/loserDropsTo — the
    // champion-vs-reset decision is championship-format logic, not generic
    // bracket topology, so it stays separate from applyGameResult by design.

    if (gameId === 'GF-1') {
      return handleGrandFinal(tx, { input, game, bracket, bracketRef, winnerId, winnerName, loserId, loserName });
    }

    if (gameId === 'GF-2') {
      tx.update(bracketRef, {
        status: 'completed',
        championTeamId: winnerId,
        completedAt: serverTimestamp(),
      });
      return { outcome: 'champion', championId: winnerId, championName: winnerName };
    }

    // ── Normal game: read whatever it feeds into, all before any writes ──
    // (Firestore transactions require every read to happen before any write.)

    const destIds = new Set<string>();
    if (game.winnerAdvancesTo) destIds.add(game.winnerAdvancesTo);
    if (game.loserDropsTo) destIds.add(game.loserDropsTo);
    // Note: in the 2-team degenerate bracket, winnerAdvancesTo and
    // loserDropsTo are BOTH 'GF-1' — the Set above naturally dedupes that
    // to a single read, and applyGameResult below correctly applies both
    // the winner-advance and loser-drop writes to that one in-memory game
    // object using its distinct winnerAdvancesToSlot/loserDropsToSlot,
    // instead of two separate stale reads racing each other.

    const destSnaps = new Map<string, GameDoc>();
    for (const id of destIds) {
      const snap = await tx.get(doc(db, BracketPaths.game(tournamentId, divisionId, id)));
      if (snap.exists()) destSnaps.set(id, snap.data() as GameDoc);
    }

    // ── Build the in-memory map and run the one shared advancement function ──

    const games = new Map<string, AdvancementGame>();
    games.set(game.id, toAdvancementGame(game));
    destSnaps.forEach((d, id) => games.set(id, toAdvancementGame(d)));

    const touched = applyGameResult(
      games,
      gameId,
      { id: winnerId, name: winnerName },
      { id: loserId, name: loserName }
    );

    // ── Write back exactly what changed ───────────────────────────────────

    for (const id of touched) {
      const g = games.get(id)!;
      const ref = doc(db, BracketPaths.game(tournamentId, divisionId, id));

      if (id === gameId) {
        tx.update(ref, {
          status: g.status,
          winnerId: g.winnerId,
          winnerName: g.winnerName,
          loserId: g.loserId,
          loserName: g.loserName,
          topScore: input.topScore ?? null,
          bottomScore: input.bottomScore ?? null,
          resultEnteredAt: serverTimestamp(),
          resultEnteredBy: input.enteredByUid,
        });
      } else {
        tx.update(ref, {
          topTeamId: g.topTeamId,
          topTeamName: g.topTeamName,
          bottomTeamId: g.bottomTeamId,
          bottomTeamName: g.bottomTeamName,
          status: g.status,
        });
      }
    }

    if (bracket.status === 'generated') {
      tx.update(bracketRef, { status: 'in_progress' });
    }

    return { outcome: 'advanced', gamesUpdated: touched };
  });
}

// ─── Grand Final Handler ──────────────────────────────────────────────────────

async function handleGrandFinal(
  tx: Transaction,
  {
    input, game, bracket, bracketRef, winnerId, winnerName, loserId, loserName,
  }: {
    input: EnterResultInput;
    game: GameDoc;
    bracket: BracketDoc;
    bracketRef: ReturnType<typeof doc>;
    winnerId: string;
    winnerName: string;
    loserId: string;
    loserName: string;
  }
): Promise<ProgressionResult> {
  const { tournamentId, divisionId } = input;

  tx.update(doc(db, BracketPaths.game(tournamentId, divisionId, 'GF-1')), {
    status: 'completed',
    winnerId,
    winnerName,
    loserId,
    loserName,
    topScore: input.topScore ?? null,
    bottomScore: input.bottomScore ?? null,
    resultEnteredAt: serverTimestamp(),
    resultEnteredBy: input.enteredByUid,
  });

  // Determine which bracket path the winner came from — top slot in GF-1
  // is always the winners-bracket finalist per bracket structure.
  const winnerPath: BracketPath = game.topTeamId === winnerId ? 'winners' : 'losers';

  const decision = resolveGrandFinal(
    { winnerId, loserId, winnerPath },
    bracket.championshipFormat as ChampionshipFormat
  );

  if (decision.outcome === 'champion') {
    tx.update(bracketRef, {
      status: 'completed',
      championTeamId: winnerId,
      completedAt: serverTimestamp(),
    });
    return { outcome: 'champion', championId: winnerId, championName: winnerName };
  }

  // Reset required: populate GF-2 with the same two teams, flipped — the
  // team that lost GF-1 (the previously-undefeated winners-bracket team)
  // gets the top slot in GF-2.
  tx.update(doc(db, BracketPaths.game(tournamentId, divisionId, 'GF-2')), {
    topTeamId: loserId,
    topTeamName: loserName,
    bottomTeamId: winnerId,
    bottomTeamName: winnerName,
    status: 'ready',
  });
  tx.update(bracketRef, {
    bracketResetRequired: true,
    status: 'in_progress',
  });

  return { outcome: 'reset_required' };
}