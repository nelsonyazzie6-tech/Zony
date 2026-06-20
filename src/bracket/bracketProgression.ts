/**
 * Zony Bracket Progression Engine — Step 6
 *
 * Handles result entry and automatic bracket advancement.
 *
 * When an organizer marks a winner for a game:
 *   1. Write result to that game document
 *   2. Populate winner's slot in winnerAdvancesTo game
 *   3. Populate loser's slot in loserDropsTo game (or mark eliminated)
 *   4. Flip downstream games from 'pending' → 'ready' if both teams now known
 *   5. Handle championship special case (GF-1 → champion or GF-2)
 *
 * All writes happen in a single Firestore batch — no partial state visible
 * to live listeners on other devices.
 *
 * Module separation (per spec):
 *   - This module knows about Firestore and bracket structure
 *   - It does NOT know about courts, times, or scheduling
 *   - It imports from bracketSchema (paths/types) and championshipFormat (GF logic)
 *   - It does NOT import from bracketEngine (generation is complete by this point)
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
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

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * enterResult — organizer marks a winner for a game.
 *
 * Reads current game and bracket state, then writes all changes
 * in a single batch. Returns what happened as a result.
 */
export async function enterResult(input: EnterResultInput): Promise<ProgressionResult> {
  const { tournamentId, divisionId, gameId, winnerId, winnerName, loserId, loserName } = input;

  // Read the game being resolved
  const gameRef = doc(db, BracketPaths.game(tournamentId, divisionId, gameId));
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error(`Game ${gameId} not found`);
  const game = gameSnap.data() as GameDoc;

  if (game.status === 'completed') {
    // Allow re-entry: organizer correcting a mistake
    // Treat as a fresh entry — downstream slots will be overwritten
    console.log(`Re-entering result for completed game ${gameId}`);
  }

  // Read bracket metadata for championship format
  const bracketRef = doc(db, BracketPaths.bracket(tournamentId, divisionId));
  const bracketSnap = await getDoc(bracketRef);
  if (!bracketSnap.exists()) throw new Error('Bracket document not found');
  const bracket = bracketSnap.data() as BracketDoc;

  const batch = writeBatch(db);
  const gamesUpdated: string[] = [gameId];

  // ── 1. Write result to this game ──────────────────────────────────────────

  batch.update(gameRef, {
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

  // ── 2. Handle championship special cases (GF-1 and GF-2) ─────────────────

  if (gameId === 'GF-1') {
    return await handleGrandFinal({
      input,
      game,
      bracket,
      batch,
      gamesUpdated,
      winnerId,
      winnerName,
      loserId,
      loserName,
    });
  }

  if (gameId === 'GF-2') {
    // GF-2 winner is always champion, no further progression
    batch.update(bracketRef, {
      status: 'completed',
      championTeamId: winnerId,
      completedAt: serverTimestamp(),
    });
    await batch.commit();
    const championName = winnerName;
    return { outcome: 'champion', championId: winnerId, championName };
  }

  // ── 3. Advance winner to next game ────────────────────────────────────────

  if (game.winnerAdvancesTo) {
    const winnerNextRef = doc(db, BracketPaths.game(tournamentId, divisionId, game.winnerAdvancesTo));
    const winnerNextSnap = await getDoc(winnerNextRef);

    if (winnerNextSnap.exists()) {
      const winnerNextGame = winnerNextSnap.data() as GameDoc;
      const isTop = await isTopSlot(winnerNextGame, gameId, 'winner');

      const winnerUpdate: Partial<GameDoc> = isTop
        ? { topTeamId: winnerId, topTeamName: winnerName }
        : { bottomTeamId: winnerId, bottomTeamName: winnerName };

      // Check if this fills the last empty slot → game becomes 'ready'
      const otherSlotFilled = isTop
        ? winnerNextGame.bottomTeamId !== null
        : winnerNextGame.topTeamId !== null;

      if (otherSlotFilled) {
        (winnerUpdate as any).status = 'ready';
      }

      batch.update(winnerNextRef, winnerUpdate);
      gamesUpdated.push(game.winnerAdvancesTo);
    }
  }

  // ── 4. Drop loser to losers bracket (or mark eliminated) ─────────────────

  if (game.loserDropsTo) {
    const loserNextRef = doc(db, BracketPaths.game(tournamentId, divisionId, game.loserDropsTo));
    const loserNextSnap = await getDoc(loserNextRef);

    if (loserNextSnap.exists()) {
      const loserNextGame = loserNextSnap.data() as GameDoc;
      const isTop = await isTopSlot(loserNextGame, gameId, 'loser');

      const loserUpdate: Partial<GameDoc> = isTop
        ? { topTeamId: loserId, topTeamName: loserName }
        : { bottomTeamId: loserId, bottomTeamName: loserName };

      const otherSlotFilled = isTop
        ? loserNextGame.bottomTeamId !== null
        : loserNextGame.topTeamId !== null;

      if (otherSlotFilled) {
        (loserUpdate as any).status = 'ready';
      }

      batch.update(loserNextRef, loserUpdate);
      gamesUpdated.push(game.loserDropsTo);
    }
  }
  // If loserDropsTo is null, this team is eliminated (normal losers bracket loss)

  // ── 5. Update bracket status to in_progress if not already ───────────────

  if (bracket.status === 'generated') {
    batch.update(bracketRef, { status: 'in_progress' });
  }

  await batch.commit();
  return { outcome: 'advanced', gamesUpdated };
}

// ─── Grand Final Handler ──────────────────────────────────────────────────────

async function handleGrandFinal({
  input,
  game,
  bracket,
  batch,
  gamesUpdated,
  winnerId,
  winnerName,
  loserId,
  loserName,
}: {
  input: EnterResultInput;
  game: GameDoc;
  bracket: BracketDoc;
  batch: ReturnType<typeof writeBatch>;
  gamesUpdated: string[];
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
}): Promise<ProgressionResult> {
  const { tournamentId, divisionId } = input;
  const bracketRef = doc(db, BracketPaths.bracket(tournamentId, divisionId));

  // Determine which bracket path the winner came from
  // Winner came from winners bracket if their team was the 'top' team
  // (top slot in GF-1 is always the winners-bracket finalist per our bracket structure)
  const winnerPath: BracketPath = game.topTeamId === winnerId ? 'winners' : 'losers';

  const decision = resolveGrandFinal(
    { winnerId, loserId, winnerPath },
    bracket.championshipFormat as ChampionshipFormat
  );

  if (decision.outcome === 'champion') {
    batch.update(bracketRef, {
      status: 'completed',
      championTeamId: winnerId,
      completedAt: serverTimestamp(),
    });
    await batch.commit();
    return { outcome: 'champion', championId: winnerId, championName: winnerName };
  }

  // Reset required: populate GF-2 with the same two teams, flipped
  // (the team that lost GF-1 now gets the "top" slot in GF-2 as the
  // previously-undefeated team deserves top billing in the reset)
  const gf2Ref = doc(db, BracketPaths.game(tournamentId, divisionId, 'GF-2'));
  batch.update(gf2Ref, {
    topTeamId: loserId,         // the winners-bracket team (lost GF-1)
    topTeamName: loserName,
    bottomTeamId: winnerId,     // the losers-bracket team (won GF-1)
    bottomTeamName: winnerName,
    status: 'ready',
  });
  batch.update(bracketRef, {
    bracketResetRequired: true,
    status: 'in_progress',
  });

  gamesUpdated.push('GF-2');
  await batch.commit();
  return { outcome: 'reset_required' };
}

// ─── Slot Resolution ──────────────────────────────────────────────────────────

/**
 * isTopSlot — determines whether the result of a given source game
 * should populate the 'top' or 'bottom' slot in a downstream game.
 *
 * Uses the fedByWinnerOf array: position 0 = top slot feeder, position 1 = bottom slot feeder.
 * For loser drops, we look at which game's loserDropsTo points here and match position.
 */
async function isTopSlot(
  targetGame: GameDoc,
  sourceGameId: string,
  role: 'winner' | 'loser'
): Promise<boolean> {
  if (!targetGame.fedByWinnerOf) return false;

  // Degenerate case: a single game feeds BOTH slots of the downstream game
  // (its winner takes one slot, its loser takes the other) — this only
  // happens in the 2-team bracket, where there's no separate losers-bracket
  // game and the winners-final game's loser drops straight into the grand
  // final. Here, position alone can't disambiguate since both array entries
  // are the same game id, so the role (winner vs loser) decides: winner → top.
  if (targetGame.fedByWinnerOf[0] === sourceGameId && targetGame.fedByWinnerOf[1] === sourceGameId) {
    return role === 'winner';
  }

  // Position 0 in fedByWinnerOf always feeds the top slot, position 1 feeds bottom —
  // this holds for both winner-advance and loser-drop feeders, since bracketEngine
  // wires fedByWinner the same way for both ([survivor, dropin] or [wTop, wBottom]).
  return targetGame.fedByWinnerOf[0] === sourceGameId;
}

// ─── Bye Auto-Resolution ──────────────────────────────────────────────────────

/**
 * autoResolveByes — called once at bracket generation time.
 *
 * Finds all bye games and immediately resolves them, advancing the real
 * team to round 2 without requiring organizer input.
 *
 * This is separate from enterResult since it runs at generation time,
 * not in response to an organizer action.
 */
export async function autoResolveByes(
  tournamentId: string,
  divisionId: string
): Promise<void> {
  const gamesRef = collection(db, BracketPaths.games(tournamentId, divisionId));
  const gamesSnap = await getDocs(gamesRef);
  const byeGames = gamesSnap.docs
    .map(d => d.data() as GameDoc)
    .filter(g => g.isBye && g.status !== 'completed');

  if (byeGames.length === 0) return;

  const batch = writeBatch(db);

  for (const game of byeGames) {
    const gameRef = doc(db, BracketPaths.game(tournamentId, divisionId, game.id));

    // Determine which team is real (not null) and which slot is bye (-1)
    const realTeamId = game.topTeamId ?? game.bottomTeamId;
    const realTeamName = game.topTeamName ?? game.bottomTeamName;
    if (!realTeamId || !realTeamName) continue;

    // Mark bye game as completed
    batch.update(gameRef, {
      status: 'completed',
      winnerId: realTeamId,
      winnerName: realTeamName,
      loserId: null,
      loserName: null,
      resultEnteredAt: serverTimestamp(),
      resultEnteredBy: 'system',
    });

    // Advance real team to next game
    if (game.winnerAdvancesTo) {
      const nextRef = doc(db, BracketPaths.game(tournamentId, divisionId, game.winnerAdvancesTo));
      const nextSnap = await getDoc(nextRef);
      if (nextSnap.exists()) {
        const nextGame = nextSnap.data() as GameDoc;
        // Bye games always feed the top slot of their downstream game
        const isTop = nextGame.fedByWinnerOf?.[0] === game.id;
        const update: Partial<GameDoc> = isTop
          ? { topTeamId: realTeamId, topTeamName: realTeamName }
          : { bottomTeamId: realTeamId, bottomTeamName: realTeamName };

        const otherFilled = isTop
          ? nextGame.bottomTeamId !== null
          : nextGame.topTeamId !== null;
        if (otherFilled) (update as any).status = 'ready';

        batch.update(nextRef, update);
      }
    }
  }

  await batch.commit();
}