export type TournamentFormat = 8 | 12 | 16 | 20;

export type Player = {
  id: string;
  name: string;
  seed: number;
};

export type MatchScore = {
  teamA: number;
  teamB: number;
};

export type GamesPerMatch = 5 | 6;
export type PairingMode = "rotating" | "fixed";
export type PlayMode = "standard" | "ladder";

export type Match = {
  id: string;
  court: number;
  teamA: [string, string];
  teamB: [string, string];
  score: MatchScore | null;
};

export type RoundStatus = "pending" | "completed";

export type Round = {
  id: string;
  number: number;
  restingPlayerIds: string[];
  matches: Match[];
  status: RoundStatus;
  updatedAt: string | null;
};

export type RankingRow = {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDiff: number;
  points: number;
  rests: number;
  isTeam?: boolean;
  memberIds?: string[];
};

export type PlayerStats = RankingRow & {
  winRate: number;
  averageGamesFor: number;
  averageGamesAgainst: number;
  partners: string[];
  opponents: string[];
};

export type Tournament = {
  id: string;
  name: string;
  format: TournamentFormat;
  gamesPerMatch: GamesPerMatch;
  pairingMode: PairingMode;
  playMode: PlayMode;
  startingCourt?: number;
  createdAt: string;
  players: Player[];
  rounds: Round[];
  totalRounds: number;
  currentRoundIndex: number;
  completed: boolean;
};

export type TournamentStore = {
  tournaments: Tournament[];
  activeTournamentId: string | null;
  theme: "light" | "dark";
  savedPlayers: string[];
};
