/**
 * Zony Bracket Advancement Engine
 *
 * The single function responsible for moving a winner and loser out of a
 * completed game and into their predetermined downstream slots. Used
 * identically for bye resolution (at generation time) and manual result
 * entry (organizer in bracket.tsx).
 */

import { GameId } from './bracketEngine';

export type BracketSlot = 'top' | 'bottom';
export type TeamRef = { id: string; name: string };
export type AdvancementGameStatus = 'pending' | 'ready' | 'bye' | 'completed';

export type AdvancementGame = {
  id: GameId;
  isBye: boolean;
  status: AdvancementGameStatus;
  topTeamId: string | null;
  topTeamName: string | null;
  bottomTeamId: string | null;
  bottomTeamName: string | null;
  winnerId: string | null;
  winnerName: string | null;
  loserId: string | null;
  loserName: string | null;
  winnerAdvancesTo: GameId | null;
  winnerAdvancesToSlot: BracketSlot | null;
  loserDropsTo: GameId | null;
  loserDropsToSlot: BracketSlot | null;
};

function placeTeamInSlot(game: AdvancementGame, slot: BracketSlot, team: TeamRef) {
  if (slot === 'top') {
    game.topTeamId = team.id;
    game.topTeamName = team.name;
  } else {
    game.bottomTeamId = team.id;
    game.bottomTeamName = team.name;
  }
}

function recomputeStatus(game: AdvancementGame) {
  if (game.status === 'completed' || game.status === 'bye') return;
  game.status = game.topTeamId && game.bottomTeamId ? 'ready' : 'pending';
}

export function applyGameResult(
  games: Map<GameId, AdvancementGame>,
  gameId: GameId,
  winner: TeamRef,
  loser: TeamRef | null
): GameId[] {
  const game = games.get(gameId);
  if (!game) throw new Error(`applyGameResult: unknown game id "${gameId}"`);

  const touched: GameId[] = [gameId];

  game.winnerId = winner.id;
  game.winnerName = winner.name;
  game.loserId = loser?.id ?? null;
  game.loserName = loser?.name ?? null;
  game.status = game.isBye ? 'bye' : 'completed';

  if (game.winnerAdvancesTo && game.winnerAdvancesToSlot) {
    const dest = games.get(game.winnerAdvancesTo);
    if (!dest) {
      throw new Error(`applyGameResult: "${gameId}" winnerAdvancesTo points to missing game "${game.winnerAdvancesTo}"`);
    }
    placeTeamInSlot(dest, game.winnerAdvancesToSlot, winner);
    recomputeStatus(dest);
    touched.push(dest.id);
  }

  if (loser && game.loserDropsTo && game.loserDropsToSlot) {
    const dest = games.get(game.loserDropsTo);
    if (!dest) {
      throw new Error(`applyGameResult: "${gameId}" loserDropsTo points to missing game "${game.loserDropsTo}"`);
    }
    placeTeamInSlot(dest, game.loserDropsToSlot, loser);
    recomputeStatus(dest);
    touched.push(dest.id);
  }

  return touched;
}

export function cascadeByeAdvancements(games: Map<GameId, AdvancementGame>): GameId[] {
  const touched: GameId[] = [];
  const queue: GameId[] = [];
  const queued = new Set<GameId>();

  for (const game of games.values()) {
    if (game.isBye && game.status !== 'bye') {
      queue.push(game.id);
      queued.add(game.id);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const game = games.get(id)!;

    const realTeam: TeamRef | null = game.topTeamId
      ? { id: game.topTeamId, name: game.topTeamName || '' }
      : game.bottomTeamId
      ? { id: game.bottomTeamId, name: game.bottomTeamName || '' }
      : null;

    if (!realTeam) continue;

    const result = applyGameResult(games, id, realTeam, null);
    for (const gid of result) {
      if (!touched.includes(gid)) touched.push(gid);
    }
    for (const gid of result) {
      const g = games.get(gid)!;
      if (g.isBye && g.status !== 'bye' && !queued.has(gid)) {
        queue.push(gid);
        queued.add(gid);
      }
    }
  }

  return touched;
}