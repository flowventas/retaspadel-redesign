"use client";

import { GamesPerMatch, PairingMode, PlayMode, Tournament, TournamentStore } from "@/lib/types";

const STORAGE_KEY = "padel-locos-store";

export const defaultStore: TournamentStore = {
  tournaments: [],
  activeTournamentId: null,
  theme: "dark",
  savedPlayers: [],
};

function normalizeTournament(tournament: Tournament): Tournament {
  return {
    ...tournament,
    gamesPerMatch: (tournament.gamesPerMatch ?? 6) as GamesPerMatch,
    pairingMode: (tournament.pairingMode ?? "rotating") as PairingMode,
    playMode: (tournament.playMode ?? "standard") as PlayMode,
    totalRounds: tournament.totalRounds ?? tournament.rounds.length,
  };
}

export function loadStore() {
  if (typeof window === "undefined") {
    return defaultStore;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultStore;
    }

    const parsed = JSON.parse(raw) as TournamentStore;
    return {
      ...defaultStore,
      ...parsed,
      tournaments: (parsed.tournaments ?? []).map(normalizeTournament),
      savedPlayers: Array.isArray(parsed.savedPlayers)
        ? parsed.savedPlayers.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return defaultStore;
  }
}

export function saveStore(store: TournamentStore) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
