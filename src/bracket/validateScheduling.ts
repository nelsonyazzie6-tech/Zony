/**
 * Scheduling Engine Validation — Step 7
 *
 * Validates slot generation, constraint checking, topological sort,
 * and end-to-end schedule generation.
 *
 * Run with: npx ts-node --project tsconfig.node.json src/bracket/validateScheduling.ts
 */

import { generateBracketFromTeams } from './bracketEngine';
import {
    generateSchedule,
    generateSlots,
    SchedulerInput,
    topologicalSort,
    validateConstraints,
} from './schedulingEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ─── Slot Generation ─────────────────────────────────────────────────────────

console.log('\n── Slot Generation ──');

// 3 courts, 8AM–8PM, 50min games, 10min buffer = 60min per slot = 12 slots per court per day
const baseInput: SchedulerInput = {
  dates: ['2026-07-12', '2026-07-13'],
  courts: ['Court 1', 'Court 2', 'Court 3'],
  dailyStartTime: '08:00',
  dailyEndTime: '20:00',
  gameDurationMinutes: 50,
  bufferMinutes: 10,
};

const slots = generateSlots(baseInput);
const slotsPerCourtPerDay = 12; // (8PM - 8AM) / 60min = 12
const expectedTotal = slotsPerCourtPerDay * 3 * 2; // 12 × 3 courts × 2 days = 72

assert(slots.length === expectedTotal, `Slot count: expected ${expectedTotal}, got ${slots.length}`);
assert(slots[0].startTime === '08:00', `First slot starts at 08:00 (got ${slots[0].startTime})`);
assert(slots[0].endTime === '08:50', `First slot ends at 08:50 (got ${slots[0].endTime})`);
assert(slots[1].startTime === '09:00', `Second slot starts at 09:00 (got ${slots[1].startTime})`);
assert(slots[slotsPerCourtPerDay - 1].startTime === '19:00', `Last slot of day starts at 19:00 (got ${slots[slotsPerCourtPerDay - 1].startTime})`);
assert(slots[slotsPerCourtPerDay - 1].endTime === '19:50', `Last slot of day ends at 19:50 (got ${slots[slotsPerCourtPerDay - 1].endTime})`);

// Verify all slots start with correct dates
const day1Slots = slots.filter(s => s.date === '2026-07-12');
const day2Slots = slots.filter(s => s.date === '2026-07-13');
assert(day1Slots.length === slotsPerCourtPerDay * 3, `Day 1 has ${slotsPerCourtPerDay * 3} slots (got ${day1Slots.length})`);
assert(day2Slots.length === slotsPerCourtPerDay * 3, `Day 2 has ${slotsPerCourtPerDay * 3} slots (got ${day2Slots.length})`);

// Non-even slot widths: 45min game + 10min buffer = 55min slots
// 8AM to 8PM = 720min / 55min = 13.09 → 13 slots (last slot ends at 8AM + 13*55 = 795min = 1:15PM... wait)
// Actually: 13 * 55 = 715min, 8AM + 715 = 715+480 = 1195min = 19:55, fits before 20:00
// 14 * 55 = 770min, 8AM + 770 = 1250min = 20:50, game would end at 20:50+45=21:35, exceeds 20:00
// So: only slots where startTime + 45 <= 1200 (20:00 in minutes)
// slot 13 starts at 8AM + 13*55 = 480 + 715 = 1195min = 19:55, ends at 20:40 → EXCEEDS → 13 slots
// slot 13: start = 480 + 12*55 = 480 + 660 = 1140 = 19:00, end = 19:45 → fits
// slot 14: start = 480 + 13*55 = 480 + 715 = 1195 = 19:55, end = 20:40 → exceeds → not created
// So 13 slots for 45+10 config
const unevenInput: SchedulerInput = { ...baseInput, gameDurationMinutes: 45, bufferMinutes: 10, courts: ['Court 1'], dates: ['2026-07-12'] };
const unevenSlots = generateSlots(unevenInput);
assert(unevenSlots.length === 13, `45min+10min buffer = 13 slots per court per day (got ${unevenSlots.length})`);

// Trailing time unused: last slot + buffer shouldn't create a new slot that exceeds end time
const lastSlot = unevenSlots[unevenSlots.length - 1];
assert(lastSlot.endTime === '19:45', `Last slot ends at 19:45 with 45min game (got ${lastSlot.endTime})`);

// ─── Constraint Validation ────────────────────────────────────────────────────

console.log('\n── Constraint Validation ──');

// 4-team bracket: 3 winners + 2 losers + 1 GF = 6 games needing slots (GF-2 excluded)
const b4 = generateBracketFromTeams(['T1','T2','T3','T4']);
const slots4 = generateSlots({ ...baseInput, courts: ['Court 1'], dates: ['2026-07-12'] });
const v4 = validateConstraints(b4, slots4);
assert(v4.valid, `4-team bracket fits in ${slots4.length} slots`);

// Create a scenario where constraints fail: 8-team bracket needs 14 games,
// give it only 3 slots
const b8 = generateBracketFromTeams(['T1','T2','T3','T4','T5','T6','T7','T8']);
const tinySlots = generateSlots({
  ...baseInput,
  courts: ['Court 1'],
  dates: ['2026-07-12'],
  dailyStartTime: '08:00',
  dailyEndTime: '11:00', // only 3 slots of 60min in 3 hours
});
assert(tinySlots.length === 3, `Tiny schedule has 3 slots (got ${tinySlots.length})`);

const v8fail = validateConstraints(b8, tinySlots);
assert(!v8fail.valid, '8-team bracket fails with only 3 slots');
assert('reason' in v8fail && v8fail.reason.includes('Not enough'), 'Failure reason is clear and specific');
assert('gamesNeeded' in v8fail, 'Failure includes gamesNeeded');
assert('slotsAvailable' in v8fail, 'Failure includes slotsAvailable');

// 8-team bracket: 4+2+1 winners + 2+2+1+1 losers + 1 GF = 14 games
// (excluding 4 bye games and GF-2)
const nonByeNonReset8 = b8.games.filter(g => !g.isBye && g.id !== 'GF-2');
assert(nonByeNonReset8.length === 14, `8-team bracket has 14 schedulable games (got ${nonByeNonReset8.length})`);

// ─── Topological Sort ─────────────────────────────────────────────────────────

console.log('\n── Topological Sort ──');

const sorted4 = topologicalSort(b4);
const sorted8 = topologicalSort(b8);

// Every game should appear after all its dependencies
function validateDependencyOrder(sorted: ReturnType<typeof topologicalSort>): boolean {
  const seen = new Set<string>();
  for (const game of sorted) {
    if (game.fedByWinner) {
      for (const feederId of game.fedByWinner) {
        // Feeder must already be seen (or be a bye game which is excluded)
        const feederInSorted = sorted.find(g => g.id === feederId);
        if (feederInSorted && !seen.has(feederId)) return false;
      }
    }
    seen.add(game.id);
  }
  return true;
}

assert(validateDependencyOrder(sorted4), '4-team sort: every game appears after its dependencies');
assert(validateDependencyOrder(sorted8), '8-team sort: every game appears after its dependencies');

// GF-1 should be last (or near last, before GF-2 which is excluded)
assert(sorted4[sorted4.length - 1].id === 'GF-1', `4-team: GF-1 is last in sorted order (got ${sorted4[sorted4.length - 1].id})`);
assert(sorted8[sorted8.length - 1].id === 'GF-1', `8-team: GF-1 is last in sorted order (got ${sorted8[sorted8.length - 1].id})`);

// R1 games should all appear before any R2 games
const r1Games4 = sorted4.filter(g => g.bracket === 'winners' && g.round === 1).map(g => g.id);
const firstR2Index4 = sorted4.findIndex(g => g.bracket === 'winners' && g.round === 2);
const lastR1Index4 = Math.max(...r1Games4.map(id => sorted4.findIndex(g => g.id === id)));
assert(lastR1Index4 < firstR2Index4, '4-team: all R1 games appear before any R2 games');

// ─── End-to-End Schedule Generation ──────────────────────────────────────────

console.log('\n── End-to-End Schedule Generation ──');

// 4-team bracket: 6 schedulable games, should fit easily
const schedule4 = generateSchedule(b4, {
  dates: ['2026-07-12'],
  courts: ['Court 1', 'Court 2'],
  dailyStartTime: '08:00',
  dailyEndTime: '20:00',
  gameDurationMinutes: 50,
  bufferMinutes: 10,
});

assert(schedule4.scheduledGames.length === 6, `4-team: 6 games scheduled (got ${schedule4.scheduledGames.length})`);
assert(schedule4.usedSlots === 6, `4-team: 6 slots used (got ${schedule4.usedSlots})`);

// Every scheduled game has a valid date, court, and time
schedule4.scheduledGames.forEach(sg => {
  assert(sg.date === '2026-07-12', `${sg.gameId}: scheduled on correct date`);
  assert(['Court 1', 'Court 2'].includes(sg.courtId), `${sg.gameId}: assigned to valid court`);
  assert(/^\d{2}:\d{2}$/.test(sg.startTime), `${sg.gameId}: startTime is HH:MM format`);
  assert(/^\d{2}:\d{2}$/.test(sg.endTime), `${sg.gameId}: endTime is HH:MM format`);
});

// No two games share the same court+date+time slot
const slotKeys4 = schedule4.scheduledGames.map(sg => `${sg.date}-${sg.courtId}-${sg.startTime}`);
const uniqueSlots4 = new Set(slotKeys4);
assert(uniqueSlots4.size === slotKeys4.length, '4-team: no two games share the same court+date+time');

// 8-team bracket across 2 days, 2 courts
const schedule8 = generateSchedule(b8, {
  dates: ['2026-07-12', '2026-07-13'],
  courts: ['Court 1', 'Court 2'],
  dailyStartTime: '08:00',
  dailyEndTime: '20:00',
  gameDurationMinutes: 50,
  bufferMinutes: 10,
});

assert(schedule8.scheduledGames.length === 14, `8-team: 14 games scheduled (got ${schedule8.scheduledGames.length})`);

// No two games share the same court+date+time
const slotKeys8 = schedule8.scheduledGames.map(sg => `${sg.date}-${sg.courtId}-${sg.startTime}`);
const uniqueSlots8 = new Set(slotKeys8);
assert(uniqueSlots8.size === slotKeys8.length, '8-team: no two games share the same court+date+time');

// GF-1 should be scheduled last (highest slot index)
const gf1Scheduled = schedule8.scheduledGames.find(sg => sg.gameId === 'GF-1');
const gf1SlotPos = schedule8.scheduledGames.indexOf(gf1Scheduled!);
assert(gf1SlotPos === schedule8.scheduledGames.length - 1, 'GF-1 is scheduled last');

// ─── Hard Failure Mode ────────────────────────────────────────────────────────

console.log('\n── Hard Failure Mode ──');

// Schedule should throw (not return partial) when constraints can't be met
let threwCorrectly = false;
try {
  generateSchedule(b8, {
    dates: ['2026-07-12'],
    courts: ['Court 1'],
    dailyStartTime: '08:00',
    dailyEndTime: '10:00', // only 2 slots in 2 hours, need 14
    gameDurationMinutes: 50,
    bufferMinutes: 10,
  });
} catch (e: any) {
  threwCorrectly = e.message.includes('Not enough court time');
}
assert(threwCorrectly, 'generateSchedule throws with clear message when constraints cannot be met');

// ─── Determinism ─────────────────────────────────────────────────────────────

console.log('\n── Determinism ──');

const sched1 = generateSchedule(b4, baseInput);
const sched2 = generateSchedule(b4, baseInput);
assert(
  JSON.stringify(sched1) === JSON.stringify(sched2),
  'Same bracket + same inputs always produce identical schedule'
);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) {
  console.error('❌ Some validations failed. Review before proceeding to step 8.');
  process.exit(1);
} else {
  console.log('✅ All validations passed. Safe to proceed to step 8.');
}