import { createPlayers, createTournament } from "@/lib/tournament";
import { GamesPerMatch, TournamentFormat } from "@/lib/types";

const BASE_NAMES = [
  "Ana",
  "Carlos",
  "Fer",
  "Luis",
  "Majo",
  "Santi",
  "Sofi",
  "Tavo",
  "Vale",
  "Diego",
  "Pau",
  "Jorge",
  "Nora",
  "Alex",
  "Caro",
  "Bruno",
  "Elena",
  "Memo",
  "Isa",
  "Pepe",
];

const SAMPLE_PLAYERS: Record<TournamentFormat, string[]> = {
  8: BASE_NAMES.slice(0, 8),
  12: BASE_NAMES.slice(0, 12),
  16: BASE_NAMES.slice(0, 16),
  20: BASE_NAMES.slice(0, 20),
};

export function sampleNames(format: TournamentFormat) {
  return SAMPLE_PLAYERS[format];
}

export function sampleTournament(format: TournamentFormat, gamesPerMatch: GamesPerMatch = 6) {
  const players = createPlayers(SAMPLE_PLAYERS[format]);
  return createTournament(`Demo ${format} jugadores`, players, format, gamesPerMatch, "rotating");
}
