/**
 * Comprehensive bracket engine validation — all team counts 1 through 24.
 * Run with: npx ts-node --project tsconfig.node.json src/bracket/validateAllTeamCounts.ts
 */

import { generateBracketFromTeams, BracketGame } from './bracketEngine';
import { generateSchedule, SchedulerInput } from './schedulingEngine';
import { resolveGrandFinal, resolveReset } from './championshipFormat';

const schedInput: SchedulerInput = {
  dates: ['2026-08-01', '2026-08-02', '2026-08-03'],
  courts: ['Court 1', 'Court 2', 'Court 3'],
  dailyStartTime: '08:00',
  dailyEndTime: '20:00',
  gameDurationMinutes: 50,
  bufferMinutes: 10,
};

let passed = 0;
let failed = 0;
const issues: string[] = [];

function fail(n: number, msg: string): false {
  issues.push(`${n} teams: ${msg}`);
  failed++;
  return false;
}

for (let n = 1; n <= 24; n++) {
  const teams = Array.from({ length: n }, (_, i) => `Team${i + 1}`);
  let ok = true;

  // ── 1. Minimum team count ───────────────────────────────────────────────
  if (n === 1) {
    // 1 team cannot form a bracket — verify it throws or produces no games
    try {
      const bracket = generateBracketFromTeams(teams);
      // If it doesn't throw, check if it's a degenerate bracket
      if (bracket.games.length === 0) {
        console.log(`  ℹ  1 team: correctly produces empty bracket (no games needed)`);
        passed++;
        continue;
      } else {
        fail(n, `expected error or empty bracket for 1 team, got ${bracket.games.length} games`);
        failed++;
        continue;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ℹ  1 team: correctly throws — "${msg}"`);
      passed++;
      continue;
    }
  }

  try {
    const bracket = generateBracketFromTeams(teams);

    // ── 2. Basic structure ──────────────────────────────────────────────
    if (!bracket?.games?.length) {
      ok = fail(n, 'no games generated'); continue;
    }

    // ── 3. Bracket size is power of 2 and >= n ──────────────────────────
    const isPow2 = (bracket.bracketSize & (bracket.bracketSize - 1)) === 0;
    if (!isPow2 || bracket.bracketSize < n) {
      ok = fail(n, `invalid bracket size ${bracket.bracketSize}`); continue;
    }

    // ── 4. Bye count = bracketSize - n ──────────────────────────────────
    const expectedByes = bracket.bracketSize - n;
    const byeGames = bracket.games.filter((g: BracketGame) => g.isBye);
    if (byeGames.length !== expectedByes) {
      ok = fail(n, `expected ${expectedByes} byes, got ${byeGames.length}`); continue;
    }

    // Bye games should have loserDropsTo === null (no one loses a bye)
    const byeWithLoser = byeGames.filter((g: BracketGame) => g.loserDropsTo !== null);
    if (byeWithLoser.length > 0) {
      ok = fail(n, `${byeWithLoser.length} bye games incorrectly have loserDropsTo set`); continue;
    }

    // ── 5. No duplicate game IDs ─────────────────────────────────────────
    const ids = bracket.games.map((g: BracketGame) => g.id);
    if (new Set(ids).size !== ids.length) {
      ok = fail(n, 'duplicate game IDs'); continue;
    }

    // ── 6. Dependency graph completeness ─────────────────────────────────
    // Every non-R1, non-GF-2 game must have fedByWinner populated
    // EXCEPT: L-R1 games where all paired WR1 games were byes (no real losers)
    const realWR1Count = bracket.games.filter((g: BracketGame) => g.bracket === 'winners' && g.round === 1 && !g.isBye).length;
    const nonSeeded = bracket.games.filter((g: BracketGame) =>
      g.id !== 'GF-2' &&
      !(g.bracket === 'winners' && g.round === 1) &&
      // Exclude L-R1 games if there are no real WR1 losers to feed them
      !(g.bracket === 'losers' && g.round === 1 && realWR1Count === 0)
    );
    const missingFed = nonSeeded.filter((g: BracketGame) => !g.fedByWinner || (g.fedByWinner as string[]).length === 0);
    if (missingFed.length > 0) {
      ok = fail(n, `${missingFed.length} games missing fedByWinner: ${missingFed.map((g: BracketGame) => g.id).join(', ')}`); continue;
    }

    // ── 7. No duplicate matchups (same two seeds playing twice) ──────────
    const r1Games = bracket.games.filter((g: BracketGame) => g.bracket === 'winners' && g.round === 1 && !g.isBye);
    const matchupKeys = new Set<string>();
    let dupMatchup = false;
    for (const g of r1Games) {
      const key = [g.topSeed, g.bottomSeed].sort().join('-');
      if (matchupKeys.has(key)) { dupMatchup = true; break; }
      matchupKeys.add(key);
    }
    if (dupMatchup) {
      ok = fail(n, 'duplicate first-round matchups'); continue;
    }

    // ── 8. GF-1 exists and is in 'final' bracket ─────────────────────────
    const gf1 = bracket.games.find((g: BracketGame) => g.id === 'GF-1');
    if (!gf1 || gf1.bracket !== 'final') {
      ok = fail(n, 'GF-1 missing or not in final bracket'); continue;
    }

    // ── 9. Championship routing — both formats ────────────────────────────
    // Single: winners-bracket win → champion
    const single_ww = resolveGrandFinal({ winnerId: 'A', loserId: 'B', winnerPath: 'winners' }, 'single');
    const single_lw = resolveGrandFinal({ winnerId: 'B', loserId: 'A', winnerPath: 'losers' }, 'single');
    if (single_ww.outcome !== 'champion' || single_lw.outcome !== 'champion') {
      ok = fail(n, 'single championship routing broken'); continue;
    }

    // Double: winners-bracket win → champion, losers-bracket win → reset
    const double_ww = resolveGrandFinal({ winnerId: 'A', loserId: 'B', winnerPath: 'winners' }, 'double');
    const double_lw = resolveGrandFinal({ winnerId: 'B', loserId: 'A', winnerPath: 'losers' }, 'double');
    if (double_ww.outcome !== 'champion' || double_lw.outcome !== 'reset_required') {
      ok = fail(n, 'double championship routing broken'); continue;
    }

    // GF-2 reset always produces champion
    const resetResult = resolveReset('TeamA');
    if (resetResult.outcome !== 'champion') {
      ok = fail(n, 'GF-2 reset resolution broken'); continue;
    }

    // ── 10. Schedule generation ───────────────────────────────────────────
    try {
      const schedule = generateSchedule(bracket, schedInput);

      // All non-bye, non-GF2 games must be scheduled
      const schedulable = bracket.games.filter((g: BracketGame) => !g.isBye && g.id !== 'GF-2');
      if (schedule.scheduledGames.length !== schedulable.length) {
        ok = fail(n, `schedule has ${schedule.scheduledGames.length} games, expected ${schedulable.length}`); continue;
      }

      // No two games share same court+date+time
      const slotKeys = schedule.scheduledGames.map((sg: any) => `${sg.date}-${sg.courtId}-${sg.startTime}`);
      if (new Set(slotKeys).size !== slotKeys.length) {
        ok = fail(n, 'duplicate court+date+time slots in schedule'); continue;
      }

    } catch (schedErr: unknown) {
      const msg = schedErr instanceof Error ? schedErr.message : String(schedErr);
      ok = fail(n, `schedule generation failed: ${msg}`); continue;
    }

    // ── All checks passed ─────────────────────────────────────────────────
    passed++;
    console.log(
      `  ✓ ${String(n).padStart(2)} teams | ` +
      `bracket: ${bracket.bracketSize}-team | ` +
      `byes: ${expectedByes} | ` +
      `total games: ${bracket.games.length} | ` +
      `schedule: ✓`
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    fail(n, `threw unexpected error: ${msg}`);
  }
}

console.log('');
console.log(`── Results: ${passed} passed, ${failed} failed ──`);
if (issues.length > 0) {
  console.log('\nIssues:');
  issues.forEach(i => console.log(`  ✗ ${i}`));
} else {
  console.log('\n✅ All team counts validated successfully.');
}