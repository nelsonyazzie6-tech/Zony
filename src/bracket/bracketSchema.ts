export type BracketStatus =
  | 'pending'
  | 'generated'
  | 'in_progress'
  | 'completed';

export type BracketDoc = {
  divisionId: string;
  tournamentId: string;
  championshipFormat: 'single' | 'double';
  bracketSize: number;
  teamCount: number;
  status: BracketStatus;
  generatedAt: Timestamp | null;
  completedAt: Timestamp | null;
  seededTeams: SeedEntry[];
  championTeamId: string | null;
  grandFinalId: string;
  bracketResetId: string | null;
  bracketResetRequired: boolean;
  scheduleGeneratedAt: Timestamp | null;
  explanation: string;
};

export type SeedEntry = {
  seed: number;
  teamId: string;
  teamName: string;
  isBye: boolean;
};

export type GameStatus =
  | 'pending'
  | 'ready'
  | 'bye'
  | 'completed';

export type BracketSlot = 'top' | 'bottom';

export type GameDoc = {
  id: string;
  divisionId: string;
  tournamentId: string;
  bracket: 'winners' | 'losers' | 'final';
  round: number;
  position: number;
  topTeamId: string | null;
  topTeamName: string | null;
  bottomTeamId: string | null;
  bottomTeamName: string | null;
  isBye: boolean;
  fedByWinnerOf: [string, string] | null;
  winnerAdvancesTo: string | null;
  winnerAdvancesToSlot: BracketSlot | null;
  loserDropsTo: string | null;
  loserDropsToSlot: BracketSlot | null;
  status: GameStatus;
  winnerId: string | null;
  winnerName: string | null;
  loserId: string | null;
  loserName: string | null;
  topScore: number | null;
  bottomScore: number | null;
  resultEnteredAt: Timestamp | null;
  resultEnteredBy: string | null;
  courtId: string | null;
  courtName: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledSlotIndex: number | null;
  createdAt: Timestamp | null;
};

type Timestamp = { seconds: number; nanoseconds: number } | { toDate: () => Date };

export const BracketPaths = {
  bracket: (tournamentId: string, divisionId: string) =>
    `tournaments/${tournamentId}/divisions/${divisionId}/bracket/metadata`,
  games: (tournamentId: string, divisionId: string) =>
    `tournaments/${tournamentId}/divisions/${divisionId}/games`,
  game: (tournamentId: string, divisionId: string, gameId: string) =>
    `tournaments/${tournamentId}/divisions/${divisionId}/games/${gameId}`,
};