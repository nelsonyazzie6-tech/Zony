/**
 * Zony Bracket System — Firestore Data Model
 * Step 5: Database schema and document shapes
 *
 * Collection structure:
 *   tournaments/{tournamentId}/divisions/{divisionId}/bracket  ← metadata doc
 *   tournaments/{tournamentId}/divisions/{divisionId}/games/{gameId}  ← one per game
 *
 * Design principles (from spec):
 *   - Explicit dependency graph: every game declares its feeders, never inferred
 *   - No implicit "next game" assumptions anywhere
 *   - Bracket engine output maps 1:1 to these documents
 *   - Scheduling engine writes court/time fields separately, never mixed into bracket logic
 */

// ─── Bracket Metadata Document ────────────────────────────────────────────────
// Path: tournaments/{tournamentId}/divisions/{divisionId}/bracket
// This is a single document (not a collection) storing bracket-level state.

export type BracketStatus =
  | 'pending'       // registration open, bracket not yet generated
  | 'generated'     // bracket generated, games exist, tournament not started
  | 'in_progress'   // at least one game has a result
  | 'completed';    // champion has been determined

export type BracketDoc = {
  // Identity
  divisionId: string;
  tournamentId: string;

  // Format settings (set at tournament creation, immutable after bracket generation)
  championshipFormat: 'single' | 'double';
  bracketSize: number;          // always a power of two (4, 8, 16, 32)
  teamCount: number;            // actual registered teams (may be less than bracketSize)

  // Status
  status: BracketStatus;
  generatedAt: Timestamp | null;
  completedAt: Timestamp | null;

  // Teams (ordered array — index 0 = seed 1, index 1 = seed 2, etc.)
  // Randomly shuffled once at generation time. Immutable after that.
  seededTeams: SeedEntry[];

  // Championship resolution
  championTeamId: string | null;    // null until tournament is completed
  grandFinalId: string;             // always 'GF-1'
  bracketResetId: string | null;    // 'GF-2' if applicable, null for single format
  bracketResetRequired: boolean;    // true only when double format + losers team won GF-1

  // Scheduling metadata (written by scheduling engine, read-only to bracket engine)
  scheduleGeneratedAt: Timestamp | null;

  // User-facing explanation (dynamic based on championshipFormat)
  explanation: string;
};

export type SeedEntry = {
  seed: number;         // 1-indexed seed position
  teamId: string;       // Firestore team document id
  teamName: string;     // denormalized for display without extra reads
  isBye: boolean;       // true if this seed slot is a bye (no real team)
};

// ─── Game Document ─────────────────────────────────────────────────────────────
// Path: tournaments/{tournamentId}/divisions/{divisionId}/games/{gameId}
// One document per game. gameId matches the bracket engine's GameId format:
//   'W-R1-G1', 'L-R2-G3', 'GF-1', 'GF-2', etc.
// This makes the id human-readable and directly traceable to the bracket structure.

export type GameStatus =
  | 'pending'     // waiting for both teams to be determined (dependencies not yet met)
  | 'ready'       // both teams are known, game can be played / scheduled
  | 'bye'         // one slot is a bye — winner auto-advances, no play needed
  | 'completed';  // winner has been selected

export type GameDoc = {
  // Identity — matches bracketEngine GameId exactly
  id: string;               // e.g. 'W-R1-G1', 'L-R3-G2', 'GF-1'
  divisionId: string;
  tournamentId: string;

  // Bracket position
  bracket: 'winners' | 'losers' | 'final';
  round: number;
  position: number;

  // Teams (null = TBD, not yet determined by prior game results)
  topTeamId: string | null;     // null until feeder game completes
  topTeamName: string | null;   // denormalized
  bottomTeamId: string | null;
  bottomTeamName: string | null;
  isBye: boolean;               // true if one slot is a bye

  // Explicit dependency graph — NEVER infer from position or ordering
  // These match bracketEngine BracketGame.fedByWinner and winnerAdvancesTo/loserDropsTo
  fedByWinnerOf: [string, string] | null;   // [gameId, gameId] whose winners play here
                                             // null for directly-seeded R1 games
  winnerAdvancesTo: string | null;          // gameId where winner goes next
  loserDropsTo: string | null;              // gameId where loser goes (null = eliminated)

  // Result (written by organizer)
  status: GameStatus;
  winnerId: string | null;      // teamId of winner, null until completed
  winnerName: string | null;    // denormalized
  loserId: string | null;
  loserName: string | null;
  topScore: number | null;      // optional — organizer may or may not enter scores
  bottomScore: number | null;
  resultEnteredAt: Timestamp | null;
  resultEnteredBy: string | null;   // uid of organizer who entered the result

  // Schedule (written by scheduling engine — never touched by bracket engine)
  courtId: string | null;         // null until schedule is generated
  courtName: string | null;       // denormalized court label, e.g. "Court 1"
  scheduledDate: string | null;   // ISO date string, e.g. "2026-07-12"
  scheduledTime: string | null;   // "HH:MM" in local time, e.g. "09:00"
  scheduledSlotIndex: number | null; // 0-indexed slot within that court+day

  // Metadata
  createdAt: Timestamp | null;    // when bracket was generated
};

// ─── Type alias for Firestore Timestamp ──────────────────────────────────────
// Using a simple alias so this schema file doesn't depend on firebase imports.
// Real implementation will use firebase/firestore Timestamp.
type Timestamp = { seconds: number; nanoseconds: number } | { toDate: () => Date };

// ─── Collection path helpers ──────────────────────────────────────────────────
// Centralized so path strings are never typed inline in multiple places.

export const BracketPaths = {
  bracket: (tournamentId: string, divisionId: string) =>
    `tournaments/${tournamentId}/divisions/${divisionId}/bracket/metadata`,

  games: (tournamentId: string, divisionId: string) =>
    `tournaments/${tournamentId}/divisions/${divisionId}/games`,

  game: (tournamentId: string, divisionId: string, gameId: string) =>
    `tournaments/${tournamentId}/divisions/${divisionId}/games/${gameId}`,
};

// ─── Mapping from bracketEngine output to Firestore documents ─────────────────
//
// This is the contract between the bracket engine (pure logic) and Firestore (persistence).
// The execution layer (step 6) uses this mapping when writing to Firestore.
//
// bracketEngine BracketGame → GameDoc:
//   game.id                → GameDoc.id
//   game.bracket           → GameDoc.bracket
//   game.round             → GameDoc.round
//   game.position          → GameDoc.position
//   game.isBye             → GameDoc.isBye
//   game.fedByWinner       → GameDoc.fedByWinnerOf
//   game.winnerAdvancesTo  → GameDoc.winnerAdvancesTo
//   game.loserDropsTo      → GameDoc.loserDropsTo
//   game.topSeed           → resolved to teamId via BracketDoc.seededTeams
//   game.bottomSeed        → resolved to teamId via BracketDoc.seededTeams
//
// Fields NOT in bracketEngine output (added at write time):
//   GameDoc.status               → 'bye' if isBye, else 'pending' or 'ready'
//   GameDoc.court*, scheduled*   → written by scheduling engine
//   GameDoc.winner*, loser*      → written by result entry (step 6)
//   GameDoc.createdAt            → server timestamp at generation time
//   GameDoc.tournamentId         → from caller context
//   GameDoc.divisionId           → from caller context

// ─── Status Transition Rules ──────────────────────────────────────────────────
//
// These are the only valid status transitions. The execution layer enforces these.
//
// pending → ready:     when both topTeamId and bottomTeamId are non-null
// pending → bye:       when isBye is true (set at generation time, never changes)
// ready   → completed: when organizer selects a winner
// bye     → completed: automatically, immediately after bracket generation
//                      (bye winner is determined at generation time)
//
// completed is terminal — no transitions out of completed.
// A completed game may have its result corrected by an organizer,
// but that is treated as a re-entry, not a status change.

// ─── Firestore Security Rule Notes ───────────────────────────────────────────
//
// These are notes for the security rules author, not enforced here.
//
// bracket doc:
//   read:   any signed-in user (participants need to see bracket status)
//   write:  only the tournament organizer (postedBy field on tournament doc)
//   update: organizer only; status field transitions must be validated server-side
//           (Cloud Function or organizer-only write) — cannot trust client
//
// games subcollection:
//   read:   any signed-in user
//   create: organizer only (at bracket generation time)
//   update: organizer only (result entry and schedule overrides)
//   delete: not allowed (games are permanent once created)
//
// Note: bye game auto-completion (pending → bye → completed) happens at
// bracket generation time in a single batch write, not as a separate update.