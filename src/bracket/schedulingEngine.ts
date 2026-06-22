/**
 * Zony Scheduling Engine — Step 7 (updated: multi-division shared matrix)
 *
 * Pure constraint solver: takes organizer inputs and bracket dependency graph,
 * produces a complete valid schedule or fails entirely.
 *
 * Module separation (per spec):
 *   - This module knows about time slots and courts
 *   - It knows about the bracket ONLY as a dependency graph (game ids + dependencies)
 *   - It does NOT know about teams, scores, or bracket progression logic
 *   - It does NOT import bracketProgression or championshipFormat
 *   - It imports only the types it needs from bracketSchema and bracketEngine
 *
 * Multi-division scheduling (new):
 *   - generateScheduleMultiDivision takes multiple brackets and schedules them
 *     all against a single shared slot matrix so no two divisions ever claim
 *     the same (court, time) combination.
 *   - If slots run out, overflow games receive null date/time ("TBD") instead
 *     of throwing — controlled chaos, not a hard failure.
 *   - Single-division generateSchedule still works as before for backwards compat.
 */

import { BracketGame, BracketStructure } from './bracketEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SchedulerInput = {
  dates: string[];
  courts: string[];
  dailyStartTime: string;
  dailyEndTime: string;
  gameDurationMinutes: number;
  bufferMinutes: number;
};

export type TimeSlot = {
  slotIndex: number;
  date: string;
  courtId: string;
  startTime: string;
  endTime: string;
  available: boolean;
};

export type ScheduledGame = {
  gameId: string;
  divisionId?: string; // populated in multi-division output
  date: string | null; // null = TBD, couldn't fit in schedule
  courtId: string | null;
  startTime: string | null;
  endTime: string | null;
  slotIndex: number | null;
};

export type ScheduleOutput = {
  scheduledGames: ScheduledGame[];
  totalSlots: number;
  usedSlots: number;
  remainingSlots: number;
};

export type MultiDivisionScheduleOutput = {
  // keyed by divisionId
  byDivision: Record<string, ScheduledGame[]>;
  totalSlots: number;
  usedSlots: number;
  overflowGames: number; // games that couldn't be placed (TBD)
};

export type ConstraintValidationResult =
  | { valid: true }
  | { valid: false; reason: string; gamesNeeded: number; slotsAvailable: number };

// ─── Time Utilities ───────────────────────────────────────────────────────────

function parseTime(time: string): number {
  if (!time) return 0;
  const cleaned = time.trim().toUpperCase();
  const ampmMatch = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2] || '0', 10);
    if (ampmMatch[3] === 'AM') { if (h === 12) h = 0; }
    else { if (h !== 12) h += 12; }
    return h * 60 + m;
  }
  const [h, m] = cleaned.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── Slot Generation ─────────────────────────────────────────────────────────

export function generateSlots(input: SchedulerInput): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotWidth = input.gameDurationMinutes + input.bufferMinutes;
  const startMinutes = parseTime(input.dailyStartTime);
  const endMinutes = parseTime(input.dailyEndTime);

  for (const date of input.dates) {
    let current = startMinutes;
    let columnIndex = 0;
    while (current + input.gameDurationMinutes <= endMinutes) {
      for (const courtId of input.courts) {
        slots.push({
          slotIndex: columnIndex,
          date,
          courtId,
          startTime: formatTime(current),
          endTime: formatTime(current + input.gameDurationMinutes),
          available: true,
        });
      }
      current += slotWidth;
      columnIndex++;
    }
  }

  return slots;
}

// ─── Constraint Validation ────────────────────────────────────────────────────

export function validateConstraints(
  bracket: BracketStructure,
  slots: TimeSlot[]
): ConstraintValidationResult {
  const gamesNeedingSlots = bracket.games.filter(g =>
    !g.isBye && g.id !== 'GF-2'
  ).length;
  const totalSlots = slots.length;
  if (gamesNeedingSlots > totalSlots) {
    return {
      valid: false,
      reason: `Not enough court time for all games. This tournament requires ${gamesNeedingSlots} game slots but only ${totalSlots} are available across all courts and days. Add more courts, extend operating hours, or increase the number of tournament days.`,
      gamesNeeded: gamesNeedingSlots,
      slotsAvailable: totalSlots,
    };
  }
  return { valid: true };
}

// ─── Topological Sort ─────────────────────────────────────────────────────────

export function topologicalSort(bracket: BracketStructure): BracketGame[] {
  const games = bracket.games.filter(g => !g.isBye && g.id !== 'GF-2');
  const gameMap = new Map<string, BracketGame>(games.map(g => [g.id, g]));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const game of games) {
    if (!inDegree.has(game.id)) inDegree.set(game.id, 0);
    if (!dependents.has(game.id)) dependents.set(game.id, []);
  }

  for (const game of games) {
    for (const feederId of (game.fedByWinner || [])) {
      if (!gameMap.has(feederId)) continue;
      inDegree.set(game.id, (inDegree.get(game.id) || 0) + 1);
      const deps = dependents.get(feederId) || [];
      deps.push(game.id);
      dependents.set(feederId, deps);
    }
  }

  const queue: string[] = [];
  for (const [gameId, degree] of inDegree) {
    if (degree === 0) queue.push(gameId);
  }

  const sorted: BracketGame[] = [];
  while (queue.length > 0) {
    const gameId = queue.shift()!;
    const game = gameMap.get(gameId);
    if (!game) continue;
    sorted.push(game);
    for (const dependentId of (dependents.get(gameId) || [])) {
      const newDegree = (inDegree.get(dependentId) || 0) - 1;
      inDegree.set(dependentId, newDegree);
      if (newDegree === 0) queue.push(dependentId);
    }
  }

  if (sorted.length !== games.length) {
    throw new Error(
      `Dependency cycle detected in bracket graph. Expected ${games.length} games, sorted ${sorted.length}.`
    );
  }
  return sorted;
}

// ─── Day Distribution ──────────────────────────────────────────────────────────

type DayBucket = {
  date: string;
  slots: TimeSlot[];
  target: number;
  assignedCount: number;
};

function buildDayBuckets(
  input: SchedulerInput,
  allSlots: TimeSlot[],
  totalGames: number
): DayBucket[] {
  const numDays = input.dates.length;
  const base = Math.floor(totalGames / numDays);
  const remainder = totalGames % numDays;
  return input.dates.map((date, i) => ({
    date,
    slots: allSlots.filter(s => s.date === date),
    target: base + (i < remainder ? 1 : 0),
    assignedCount: 0,
  }));
}

// ─── Single-Division Scheduler (backwards compat) ────────────────────────────

export function generateSchedule(
  bracket: BracketStructure,
  input: SchedulerInput
): ScheduleOutput {
  const slots = generateSlots(input);
  const validation = validateConstraints(bracket, slots);
  if (!validation.valid) throw new Error(validation.reason);

  const orderedGames = topologicalSort(bracket);
  const dayBuckets = buildDayBuckets(input, slots, orderedGames.length);

  const gameDayIndex = new Map<string, number>();
  const gameColumn = new Map<string, number>();
  const scheduledGames: ScheduledGame[] = [];

  function minColumnForDay(game: BracketGame, dayIdx: number): number {
    let minCol = 0;
    for (const feederId of (game.fedByWinner || [])) {
      const feederDay = gameDayIndex.get(feederId);
      const feederCol = gameColumn.get(feederId);
      if (feederDay === dayIdx && feederCol !== undefined) {
        minCol = Math.max(minCol, feederCol + 1);
      }
    }
    return minCol;
  }

  function tryAssign(game: BracketGame, dayIdx: number): boolean {
    const bucket = dayBuckets[dayIdx];
    const minCol = minColumnForDay(game, dayIdx);
    const slot = bucket.slots.find(s => s.available && s.slotIndex >= minCol);
    if (!slot) return false;
    slot.available = false;
    bucket.assignedCount++;
    gameDayIndex.set(game.id, dayIdx);
    gameColumn.set(game.id, slot.slotIndex);
    scheduledGames.push({
      gameId: game.id,
      date: slot.date,
      courtId: slot.courtId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      slotIndex: slot.slotIndex,
    });
    return true;
  }

  for (const game of orderedGames) {
    let placed = false;
    for (let i = 0; i < dayBuckets.length && !placed; i++) {
      if (dayBuckets[i].assignedCount < dayBuckets[i].target) {
        placed = tryAssign(game, i);
      }
    }
    if (!placed) {
      for (let i = 0; i < dayBuckets.length && !placed; i++) {
        placed = tryAssign(game, i);
      }
    }
    if (!placed) {
      throw new Error(
        `Could not find a valid slot for game ${game.id}. Add more courts, extend daily hours, or add another tournament day.`
      );
    }
  }

  return {
    scheduledGames,
    totalSlots: slots.length,
    usedSlots: scheduledGames.length,
    remainingSlots: slots.length - scheduledGames.length,
  };
}

// ─── Multi-Division Scheduler (new) ──────────────────────────────────────────

/**
 * generateScheduleMultiDivision
 *
 * Schedules all divisions against a single shared (court, time) slot matrix.
 * No two divisions can claim the same slot. If slots run out, overflow games
 * get null date/time (displayed as "Time TBD") instead of throwing.
 *
 * Algorithm:
 *   1. Generate one shared slot pool for all courts + days
 *   2. For each division, topologically sort its games
 *   3. Interleave all divisions' game queues round-robin so no single division
 *      hogs all early slots — each division gets one game placed per round
 *      until all games are exhausted
 *   4. For each game, find the earliest available slot that respects:
 *      a. The slot is not already taken by any division
 *      b. Same-day dependency ordering (feeder's column < this game's column)
 *   5. If no slot is available, mark the game as TBD (null) — never throw
 */
export function generateScheduleMultiDivision(
  divisions: Array<{
    divisionId: string;
    bracket: BracketStructure;
  }>,
  input: SchedulerInput,
): MultiDivisionScheduleOutput {
  // Step 1: single shared slot pool
  const sharedSlots = generateSlots(input);
  const totalSlots = sharedSlots.length;

  // Step 2: topological sort per division
  type DivisionQueue = {
    divisionId: string;
    games: BracketGame[];
    cursor: number;
    // per-game tracking for dependency resolution
    gameDayIndex: Map<string, number>;
    gameColumn: Map<string, number>;
  };

  const queues: DivisionQueue[] = divisions
    .filter(d => d.bracket.games.filter(g => !g.isBye && g.id !== 'GF-2').length > 0)
    .map(d => ({
      divisionId: d.divisionId,
      games: topologicalSort(d.bracket),
      cursor: 0,
      gameDayIndex: new Map(),
      gameColumn: new Map(),
    }));

  const output: MultiDivisionScheduleOutput = {
    byDivision: {},
    totalSlots,
    usedSlots: 0,
    overflowGames: 0,
  };

  for (const q of queues) {
    output.byDivision[q.divisionId] = [];
  }

  // Step 3 & 4: interleave round-robin across divisions
  // Build day buckets from the shared pool
  const numDays = input.dates.length;
  const totalGames = queues.reduce((sum, q) => sum + q.games.length, 0);
  const base = Math.floor(totalGames / Math.max(numDays, 1));
  const remainder = totalGames % Math.max(numDays, 1);

  // Track per-day assigned count across ALL divisions
  const dayAssignedCount: number[] = input.dates.map(() => 0);
  const dayTargets: number[] = input.dates.map((_, i) => base + (i < remainder ? 1 : 0));

  function minColumnForGame(
    game: BracketGame,
    dayIdx: number,
    queue: DivisionQueue
  ): number {
    let minCol = 0;
    for (const feederId of (game.fedByWinner || [])) {
      const feederDay = queue.gameDayIndex.get(feederId);
      const feederCol = queue.gameColumn.get(feederId);
      if (feederDay === dayIdx && feederCol !== undefined) {
        minCol = Math.max(minCol, feederCol + 1);
      }
    }
    return minCol;
  }

  function tryPlaceGame(
    game: BracketGame,
    queue: DivisionQueue,
    preferDayIdx?: number
  ): boolean {
    // Build candidate day order: preferred day first, then others
    const dayOrder: number[] = [];
    if (preferDayIdx !== undefined) dayOrder.push(preferDayIdx);
    for (let i = 0; i < input.dates.length; i++) {
      if (i !== preferDayIdx) dayOrder.push(i);
    }

    for (const dayIdx of dayOrder) {
      const minCol = minColumnForGame(game, dayIdx, queue);
      // Find an available slot on this day respecting column constraint
      const slot = sharedSlots.find(
        s => s.date === input.dates[dayIdx] &&
          s.available &&
          s.slotIndex >= minCol
      );
      if (!slot) continue;

      // Claim the slot
      slot.available = false;
      dayAssignedCount[dayIdx]++;
      queue.gameDayIndex.set(game.id, dayIdx);
      queue.gameColumn.set(game.id, slot.slotIndex);
      output.byDivision[queue.divisionId].push({
        gameId: game.id,
        divisionId: queue.divisionId,
        date: slot.date,
        courtId: slot.courtId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotIndex: slot.slotIndex,
      });
      output.usedSlots++;
      return true;
    }
    return false;
  }

  // Round-robin: one game per division per pass until all exhausted
  let anyProgress = true;
  while (anyProgress) {
    anyProgress = false;
    for (const queue of queues) {
      if (queue.cursor >= queue.games.length) continue;
      const game = queue.games[queue.cursor];

      // Prefer the day that's most under its target
      let preferDay = 0;
      let maxRoom = -Infinity;
      for (let i = 0; i < input.dates.length; i++) {
        const room = dayTargets[i] - dayAssignedCount[i];
        if (room > maxRoom) { maxRoom = room; preferDay = i; }
      }

      const placed = tryPlaceGame(game, queue, preferDay);
      if (placed) {
        queue.cursor++;
        anyProgress = true;
      } else {
        // Try without day preference (any available slot)
        const placedAny = tryPlaceGame(game, queue);
        if (placedAny) {
          queue.cursor++;
          anyProgress = true;
        } else {
          // No slots left — mark as TBD and move on
          output.byDivision[queue.divisionId].push({
            gameId: game.id,
            divisionId: queue.divisionId,
            date: null,
            courtId: null,
            startTime: null,
            endTime: null,
            slotIndex: null,
          });
          output.overflowGames++;
          queue.cursor++;
          anyProgress = true;
        }
      }
    }
  }

  return output;
}