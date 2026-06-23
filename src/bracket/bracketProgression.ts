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
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Transaction,
  where,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { applyGameResult, AdvancementGame } from './bracketAdvancement';
import { BracketDoc, BracketPaths, GameDoc } from './bracketSchema';
import {
  BracketPath,
  ChampionshipFormat,
  resolveGrandFinal,
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

// ─── Notification Helpers ─────────────────────────────────────────────────────

async function sendPush(token: string, title: string, body: string) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
  } catch (_) {}
}

/**
 * Looks up the registeredBy uid for a team in the tournament by matching
 * teamName against the teams subcollection for this division, then sends
 * an in-app notification + push to that user.
 */
async function notifyTeam({
  tournamentId,
  divisionId,
  teamName,
  title,
  message,
  body,
  link,
}: {
  tournamentId: string;
  divisionId: string;
  teamName: string;
  title: string;
  message: string;
  body: string;
  link: string;
}) {
  try {
    const teamsSnap = await getDocs(
      query(
        collection(db, 'tournaments', tournamentId, 'teams'),
        where('division', '==', divisionId),
        where('teamName', '==', teamName),
      )
    );
    if (teamsSnap.empty) return;
    const teamData = teamsSnap.docs[0].data();
    const uid = teamData.registeredBy;
    if (!uid) return;

    await addDoc(collection(db, 'notifications'), {
      toUserId: uid,
      message,
      body,
      link,
      createdAt: serverTimestamp(),
      read: false,
    });

    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists() && userSnap.data().pushToken && userSnap.data().notificationsEnabled !== false) {
      await sendPush(userSnap.data().pushToken, title, body);
    }
  } catch (_) {}
}

/**
 * After a normal game completes, notify both teams of the result and
 * notify the loser if they've been eliminated (no loserDropsTo means
 * they have no further bracket path).
 */
async function notifyGameResult({
  tournamentId,
  divisionId,
  game,
  winnerName,
  loserName,
  loserDropsTo,
  bracket,
  loserBracketGames,
}: {
  tournamentId: string;
  divisionId: string;
  game: GameDoc;
  winnerName: string;
  loserName: string;
  loserDropsTo: string | null;
  bracket: string;
  loserBracketGames: GameDoc[];
}) {
  const link = `/bracket?tournamentId=${tournamentId}&divisionId=${divisionId}`;
  const roundLabel = game.bracket === 'final'
    ? 'Championship'
    : game.bracket === 'losers'
    ? `Losers Bracket Round ${game.round}`
    : `Round ${game.round}`;

  await notifyTeam({
    tournamentId,
    divisionId,
    teamName: winnerName,
    title: '✅ Game Result',
    message: `${winnerName} won in ${divisionId}`,
    body: `You won your ${roundLabel} game against ${loserName}. Keep it up!`,
    link,
  });

  const isEliminated = !loserDropsTo;
  if (isEliminated) {
    await notifyTeam({
      tournamentId,
      divisionId,
      teamName: loserName,
      title: '🏁 Tournament Complete',
      message: `${loserName} has been eliminated from ${divisionId}`,
      body: `You were eliminated in ${roundLabel} by ${winnerName}. Great run!`,
      link,
    });
  } else {
    await notifyTeam({
      tournamentId,
      divisionId,
      teamName: loserName,
      title: '⚠️ Game Result',
      message: `${loserName} lost in ${divisionId}`,
      body: `You lost your ${roundLabel} game to ${winnerName}, but you're still in — check the losers bracket.`,
      link,
    });
  }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function enterResult(input: EnterResultInput): Promise<ProgressionResult> {
  const { tournamentId, divisionId, gameId, winnerId, winnerName, loserId, loserName } = input;

  const gameRef = doc(db, BracketPaths.game(tournamentId, divisionId, gameId));
  const bracketRef = doc(db, BracketPaths.bracket(tournamentId, divisionId));

  let capturedGame: GameDoc | null = null;
  let capturedBracket: BracketDoc | null = null;

  const result = await runTransaction(db, async (tx): Promise<ProgressionResult> => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error(`Game ${gameId} not found`);
    const game = gameSnap.data() as GameDoc;
    capturedGame = game;

    const bracketSnap = await tx.get(bracketRef);
    if (!bracketSnap.exists()) throw new Error('Bracket document not found');
    const bracket = bracketSnap.data() as BracketDoc;
    capturedBracket = bracket;

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

    const destIds = new Set<string>();
    if (game.winnerAdvancesTo) destIds.add(game.winnerAdvancesTo);
    if (game.loserDropsTo) destIds.add(game.loserDropsTo);

    const destSnaps = new Map<string, GameDoc>();
    for (const id of destIds) {
      const snap = await tx.get(doc(db, BracketPaths.game(tournamentId, divisionId, id)));
      if (snap.exists()) destSnaps.set(id, snap.data() as GameDoc);
    }

    const games = new Map<string, AdvancementGame>();
    games.set(game.id, toAdvancementGame(game));
    destSnaps.forEach((d, id) => games.set(id, toAdvancementGame(d)));

    const touched = applyGameResult(
      games,
      gameId,
      { id: winnerId, name: winnerName },
      { id: loserId, name: loserName }
    );

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

  if (capturedGame && result.outcome === 'advanced') {
    notifyGameResult({
      tournamentId,
      divisionId,
      game: capturedGame,
      winnerName,
      loserName,
      loserDropsTo: capturedGame.loserDropsTo,
      bracket: capturedGame.bracket,
      loserBracketGames: [],
    }).catch(() => {});
  }

  if (result.outcome === 'champion') {
    notifyTeam({
      tournamentId,
      divisionId,
      teamName: winnerName,
      title: '🏆 CHAMPION!',
      message: `${winnerName} won the ${divisionId} championship!`,
      body: `Congratulations! ${winnerName} is the ${divisionId} champion!`,
      link: `/bracket?tournamentId=${tournamentId}&divisionId=${divisionId}`,
    }).catch(() => {});

    notifyTeam({
      tournamentId,
      divisionId,
      teamName: loserName,
      title: '🥈 Runner-Up',
      message: `${loserName} finished 2nd in ${divisionId}`,
      body: `Great tournament! ${loserName} finished as runner-up in the ${divisionId} division.`,
      link: `/bracket?tournamentId=${tournamentId}&divisionId=${divisionId}`,
    }).catch(() => {});
  }

  if (result.outcome === 'reset_required') {
    notifyTeam({
      tournamentId,
      divisionId,
      teamName: winnerName,
      title: '🔁 Bracket Reset!',
      message: `${divisionId} championship requires a second game`,
      body: `${winnerName} won game 1 — but a bracket reset is required. Game 2 is now ready.`,
      link: `/bracket?tournamentId=${tournamentId}&divisionId=${divisionId}`,
    }).catch(() => {});

    notifyTeam({
      tournamentId,
      divisionId,
      teamName: loserName,
      title: '🔁 Bracket Reset!',
      message: `${divisionId} championship requires a second game`,
      body: `${loserName} lost game 1 — but the bracket resets. Game 2 is now ready.`,
      link: `/bracket?tournamentId=${tournamentId}&divisionId=${divisionId}`,
    }).catch(() => {});
  }

  return result;
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