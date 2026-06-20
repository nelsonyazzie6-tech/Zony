/**
 * Zony Scheduling Engine — Step 7
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
 * Constraints:
 *   - No partial schedules: if all games can't be placed, throw with clear message
 *   - Fixed schedule model: slots are pre-generated, no dynamic reflow
 *   - Dependency rule: a game cannot be scheduled before any of its feeder games
 *     finish — enforced as a hard constraint, not just an ordering convention
 *   - Bye games are excluded: they resolve instantly and don't need court time
 *   - Games are spread as evenly as possible across every configured tournament
 *     day, not just greedily packed into the earliest day that has room
 */

import { BracketGame, BracketStructure } from './bracketEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SchedulerInput = {
  // Tournament dates as ISO date strings, e.g. ['2026-07-12', '2026-07-13']
  // Must be sorted ascending. 1, 2, or 3 dates (per spec).
  dates: string[];

  // Courts available, e.g. ['Court 1', 'Court 2', 'Court 3']
  courts: string[];

  // Daily operating hours in 24h 'HH:MM' format
  dailyStartTime: string;   // e.g. '08:00'
  dailyEndTime: string;     // e.g. '20:00'

  // Game length and buffer in minutes
  gameDurationMinutes: number;   // e.g. 50
  bufferMinutes: number;         // e.g. 10
};

export type TimeSlot = {
  // The time-COLUMN index within this slot's day — identical across every
  // court sharing that time (e.g. 9:00am on Court 1 and 9:00am on Court 2
  // both have slotIndex 0). This is what lets the scheduler compare "did
  // this feeder finish before this dependent's slot" using simple integer
  // comparison, instead of re-parsing time strings everywhere.
  slotIndex: number;
  date: string;           // ISO date string
  courtId: string;        // matches court label from SchedulerInput.courts
  startTime: string;      // 'HH:MM'
  endTime: string;        // 'HH:MM' (startTime + gameDurationMinutes)
  available: boolean;     // false once assigned to a game
};

export type ScheduledGame = {
  gameId: string;
  date: string;
  courtId: string;
  startTime: string;
  endTime: string;
  slotIndex: number;
};

export type ScheduleOutput = {
  scheduledGames: ScheduledGame[];
  totalSlots: number;
  usedSlots: number;
  remainingSlots: number;
};

export type ConstraintValidationResult =
  | { valid: true }
  | { valid: false; reason: string; gamesNeeded: number; slotsAvailable: number };

// ─── Time Utilities ───────────────────────────────────────────────────────────

/** Parse 'HH:MM' or 'H:MM AM/PM' into total minutes since midnight */
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

/** Format total minutes since midnight back to 'HH:MM' */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── Slot Generation ─────────────────────────────────────────────────────────

/**
 * generateSlots — produces all available time slots for the tournament,
 * grouped by day and ordered TIME-MAJOR within each day: every court's slot
 * at a given time comes before any court's slot at the next time. This is
 * what allows courts to be used in parallel (a 9:00am game can run
 * simultaneously on every court) instead of one court being filled for an
 * entire day before the next court is ever touched.
 *
 * slotIndex is the time-column index within that day, shared across every
 * court at that time — used later to enforce dependency ordering.
 *
 * Slots that don't fit a full game within operating hours are not created.
 */
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

/**
 * validateConstraints — checks whether enough slots exist for all required games.
 *
 * Per spec: hard block if games > available slots. No override.
 * Bye games are excluded since they don't consume court time.
 */
export function validateConstraints(
  bracket: BracketStructure,
  slots: TimeSlot[]
): ConstraintValidationResult {
  const gamesNeedingSlots = bracket.games.filter(g =>
    !g.isBye &&
    g.id !== 'GF-2' // bracket reset is conditional, doesn't need a pre-assigned slot
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

/**
 * topologicalSort — orders games so that every game appears after its dependencies.
 * Standard Kahn's algorithm. Bye games and GF-2 are excluded since they don't
 * need scheduling.
 */
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
    const feeders = game.fedByWinner || [];
    for (const feederId of feeders) {
      if (!gameMap.has(feederId)) continue; // feeder might be a bye game, skip
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
      `Dependency cycle detected in bracket graph. This indicates a bracket generation error. ` +
      `Expected ${games.length} games, sorted ${sorted.length}.`
    );
  }

  return sorted;
}

// ─── Day Distribution ──────────────────────────────────────────────────────────

type DayBucket = {
  date: string;
  slots: TimeSlot[];    // this day's slots only, time-major order
  target: number;       // soft target game count for this day (even split)
  assignedCount: number;
};

/**
 * Splits the total game count as evenly as possible across the configured
 * days (e.g. 16 games / 3 days → 6, 5, 5), giving any remainder to the
 * earliest days. This is a SOFT target — the assignment loop below will
 * exceed it for a given day if dependency timing leaves no other choice,
 * rather than failing the whole schedule.
 */
function buildDayBuckets(input: SchedulerInput, allSlots: TimeSlot[], totalGames: number): DayBucket[] {
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

// ─── Main Scheduler ───────────────────────────────────────────────────────────

/**
 * generateSchedule — the core scheduling constraint solver.
 *
 * Algorithm:
 *   1. Generate all available slots (time-major, grouped by day)
 *   2. Validate that enough slots exist overall (hard block per spec)
 *   3. Topologically sort games (dependency-first order)
 *   4. Compute an even per-day target game count from the total
 *   5. Walk games in dependency order; for each, try to place it on the
 *      earliest day that's still under its target AND has a slot whose
 *      time-column is strictly after every same-day feeder's column
 *      (a feeder on an earlier day imposes no constraint — that whole day
 *      already happens before this one). If no under-target day can fit it,
 *      fall back to the earliest day with any room at all, so the schedule
 *      still completes even when a perfectly even split isn't structurally
 *      possible due to dependency timing.
 *   6. Return complete schedule
 *
 * This function is pure — no Firestore writes. The caller writes the
 * schedule to Firestore using the output.
 */
export function generateSchedule(
  bracket: BracketStructure,
  input: SchedulerInput
): ScheduleOutput {
  // Step 1: Generate slots
  const slots = generateSlots(input);

  // Step 2: Validate constraints (hard block)
  const validation = validateConstraints(bracket, slots);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  // Step 3: Topological sort
  const orderedGames = topologicalSort(bracket);

  // Step 4: Even per-day targets
  const dayBuckets = buildDayBuckets(input, slots, orderedGames.length);

  // Track which day + time-column each scheduled game landed in, so later
  // games can check their feeders' placement when enforcing dependency timing.
  const gameDayIndex = new Map<string, number>();
  const gameColumn = new Map<string, number>();
  const scheduledGames: ScheduledGame[] = [];

  function minColumnForDay(game: BracketGame, dayIdx: number): number {
    let minCol = 0;
    for (const feederId of (game.fedByWinner || [])) {
      const feederDay = gameDayIndex.get(feederId);
      const feederCol = gameColumn.get(feederId);
      // Only same-day feeders impose a column constraint. A feeder on an
      // earlier day needs no constraint at all — the entire later day
      // already happens after it. A feeder that was a bye (never scheduled,
      // so feederDay is undefined) also imposes no constraint — byes
      // resolve instantly with no real-world time dependency.
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

    // Pass 1: respect the even-split target, scanning days in order.
    for (let i = 0; i < dayBuckets.length && !placed; i++) {
      if (dayBuckets[i].assignedCount < dayBuckets[i].target) {
        placed = tryAssign(game, i);
      }
    }

    // Pass 2: every day is at (or this game doesn't fit under) its target —
    // place it on the earliest day with any room left, dependency-respecting.
    if (!placed) {
      for (let i = 0; i < dayBuckets.length && !placed; i++) {
        placed = tryAssign(game, i);
      }
    }

    if (!placed) {
      // Shouldn't happen after validateConstraints passed, but guard
      // defensively — this can only occur if dependency timing makes an
      // otherwise-numerically-sufficient set of slots unusable.
      throw new Error(
        `Could not find a valid slot for game ${game.id} across any configured day. ` +
        `This usually means there isn't enough combined court time across all days ` +
        `to fit the bracket while respecting game dependencies — add more courts, ` +
        `extend daily hours, or add another tournament day.`
      );
    }
  }

  const usedSlots = scheduledGames.length;
  const totalSlots = slots.length;

  return {
    scheduledGames,
    totalSlots,
    usedSlots,
    remainingSlots: totalSlots - usedSlots,
  };
}