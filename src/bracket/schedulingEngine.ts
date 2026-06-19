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
 *   - Bye games are excluded: they resolve instantly and don't need court time
 */

import { BracketGame, BracketStructure } from './bracketEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SchedulerInput = {
  // Tournament dates as ISO date strings, e.g. ['2026-07-12', '2026-07-13']
  // Must be sorted ascending. 2 or 3 dates only (per spec).
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
  slotIndex: number;      // 0-indexed within a court+day combination
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

  // Handle AM/PM format as a safety net
  const ampmMatch = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2] || '0', 10);
    if (ampmMatch[3] === 'AM') { if (h === 12) h = 0; }
    else { if (h !== 12) h += 12; }
    return h * 60 + m;
  }

  // Standard HH:MM format
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
 * generateSlots — produces all available time slots for the tournament.
 *
 * For each date × court combination, generates slots starting at dailyStartTime,
 * each of width (gameDurationMinutes + bufferMinutes), stopping when the next
 * slot's start time + gameDurationMinutes would exceed dailyEndTime.
 *
 * Slots that don't fit a full game within operating hours are not created.
 * This means trailing time at the end of a day (less than gameDurationMinutes)
 * is simply unused — no partial slots.
 */
export function generateSlots(input: SchedulerInput): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotWidth = input.gameDurationMinutes + input.bufferMinutes;
  const startMinutes = parseTime(input.dailyStartTime);
  const endMinutes = parseTime(input.dailyEndTime);

  for (const date of input.dates) {
    for (const courtId of input.courts) {
      let current = startMinutes;
      let slotIndex = 0;

      while (current + input.gameDurationMinutes <= endMinutes) {
        slots.push({
          slotIndex,
          date,
          courtId,
          startTime: formatTime(current),
          endTime: formatTime(current + input.gameDurationMinutes),
          available: true,
        });
        current += slotWidth;
        slotIndex++;
      }
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
  // Count games that need court time (excludes byes and GF-2 which may not be played)
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
 *
 * This is a standard Kahn's algorithm topological sort on the dependency graph.
 * If a cycle is detected (which shouldn't happen in a valid bracket), throws an error.
 *
 * Bye games are excluded from the sort since they don't need scheduling.
 * GF-2 is excluded since it's conditional.
 */
export function topologicalSort(bracket: BracketStructure): BracketGame[] {
  const games = bracket.games.filter(g => !g.isBye && g.id !== 'GF-2');
  const gameMap = new Map<string, BracketGame>(games.map(g => [g.id, g]));

  // Build in-degree map: how many dependencies each game has
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // game → list of games that depend on it

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

  // Start with games that have no dependencies (seeded R1 games)
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

// ─── Main Scheduler ───────────────────────────────────────────────────────────

/**
 * generateSchedule — the core scheduling constraint solver.
 *
 * Takes a bracket structure and organizer inputs, produces a complete schedule
 * or throws if a valid schedule cannot be produced.
 *
 * Algorithm:
 *   1. Generate all available slots
 *   2. Validate that enough slots exist (hard block per spec)
 *   3. Topologically sort games (dependency-first order)
 *   4. Assign each game to the earliest available slot
 *   5. Return complete schedule
 *
 * This function is pure — no Firestore writes. The caller writes
 * the schedule to Firestore using the output.
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

  // Step 4: Assign earliest available slot to each game
  const scheduledGames: ScheduledGame[] = [];

  for (const game of orderedGames) {
    // Find the earliest available slot
    const slot = slots.find(s => s.available);
    if (!slot) {
      // This shouldn't happen after validateConstraints passed, but guard defensively
      throw new Error(
        `No available slot found for game ${game.id}. ` +
        `This is unexpected after constraint validation passed — please report this as a bug.`
      );
    }

    slot.available = false; // Mark as used

    scheduledGames.push({
      gameId: game.id,
      date: slot.date,
      courtId: slot.courtId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      slotIndex: slot.slotIndex,
    });
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